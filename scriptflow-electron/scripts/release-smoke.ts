import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(`SMOKE FAIL: ${message}`)
    }
}

function countOccurrences(value: string, searchValue: string): number {
    return value.split(searchValue).length - 1
}

// 1. Validate package.json version field format
const packageJson = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8'))
assert(
    typeof packageJson.version === 'string' && packageJson.version.length > 0,
    'package.json must have a non-empty version field.',
)
console.log(`✓ package.json version: ${packageJson.version}`)

// 2. Validate electron-builder.yml is readable and has required sections
const builderYml = readFileSync(resolve(projectRoot, 'electron-builder.yml'), 'utf8')
assert(builderYml.includes('appId:'), 'electron-builder.yml must have an appId.')
assert(builderYml.includes('productName:'), 'electron-builder.yml must have a productName.')
assert(builderYml.includes('mac:'), 'electron-builder.yml must have a mac section.')
assert(builderYml.includes('win:'), 'electron-builder.yml must have a win section.')
assert(builderYml.includes('linux:'), 'electron-builder.yml must have a linux section.')
console.log('✓ electron-builder.yml has all required sections.')

// 3. Dry-run the version extraction regex used in release workflow
const testVersions = [
    { tag: 'v1.0.0', expected: '1.0.0', valid: true },
    { tag: 'v2.3.4-beta.1', expected: '2.3.4-beta.1', valid: true },
    { tag: 'v0.1.0-rc.2', expected: '0.1.0-rc.2', valid: true },
    { tag: 'not-a-version', expected: null, valid: false },
    { tag: 'v1.0', expected: null, valid: false },
]

const versionRegex = /^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$/
for (const { tag, expected, valid } of testVersions) {
    const stripped = tag.startsWith('v') ? tag.slice(1) : tag
    const matches = versionRegex.test(stripped)
    assert(matches === valid, `Version regex for "${tag}": expected valid=${valid}, got valid=${matches}`)
    if (valid) {
        assert(stripped === expected, `Version extraction for "${tag}": expected "${expected}", got "${stripped}"`)
    }
}
console.log('✓ Version extraction regex works correctly.')

// 4. Validate required scripts exist in package.json
const requiredScripts = ['dev', 'build', 'lint', 'test', 'fmt', 'fmt:check']
for (const script of requiredScripts) {
    assert(typeof packageJson.scripts?.[script] === 'string', `package.json must have a "${script}" script.`)
}
console.log('✓ All required scripts present in package.json.')

// 5. Validate placeholder GitHub releases and Azure publication
const releaseWorkflow = readFileSync(resolve(projectRoot, '..', '.github', 'workflows', 'release.yml'), 'utf8')
const azureAction = readFileSync(
    resolve(projectRoot, '..', '.github', 'actions', 'upload_azure_release_installers', 'action.yml'),
    'utf8',
)
const builderConfigService = readFileSync(resolve(projectRoot, 'scripts', 'desktop-builder-config-service.ts'), 'utf8')
const placeholderBody = 'Installer downloads are now available on the website:'

assert(releaseWorkflow.includes('- bridge'), 'Manual releases must expose the one-time bridge mode.')
assert(
    releaseWorkflow.includes('is_bridge: ${{ steps.release_meta.outputs.is_bridge }}'),
    'Bridge state must be exported.',
)
assert(releaseWorkflow.includes('Create placeholder GitHub Release'), 'Normal releases must create a placeholder.')
assert(releaseWorkflow.includes('Create one-time bridge GitHub Release'), 'The bridge release must be explicit.')
assert(countOccurrences(releaseWorkflow, placeholderBody) === 2, 'Both release modes must use the placeholder body.')
assert(countOccurrences(releaseWorkflow, 'files: |') === 1, 'Only the one-time bridge may attach GitHub assets.')
assert(!releaseWorkflow.includes('generate_release_notes:'), 'Placeholder releases must not generate release notes.')
assert(!releaseWorkflow.includes('previous_tag'), 'Placeholder releases must not resolve previous tags.')
assert(
    countOccurrences(releaseWorkflow, 'retention-days: 1') === 1,
    'Transient release artifacts must expire in one day.',
)
assert(
    releaseWorkflow.includes('uses: ./.github/actions/upload_azure_release_installers'),
    'Azure upload action is required.',
)
assert(releaseWorkflow.includes('app_id: script-flow'), 'Azure uploads must use the script-flow app root.')
assert(
    releaseWorkflow.includes('storage_account: ${{ vars.AZURE_INSTALLER_STORAGE_ACCOUNT }}'),
    'The shared Azure storage account variable is required.',
)
assert(
    releaseWorkflow.includes('container_name: ${{ vars.AZURE_INSTALLER_CONTAINER_NAME }}'),
    'The shared Azure container variable is required.',
)
assert(
    releaseWorkflow.includes('sas_token: ${{ secrets.AZURE_INSTALLER_SAS_TOKEN }}'),
    'The shared Azure SAS secret is required.',
)
assert(
    releaseWorkflow.includes('download_base_url: ${{ vars.AZURE_INSTALLER_PUBLIC_BASE_URL }}'),
    'The release API URL must be passed to the Azure action for client download links.',
)
assert(
    releaseWorkflow.includes('AZURE_INSTALLER_PUBLIC_BASE_URL: ${{ vars.AZURE_INSTALLER_PUBLIC_BASE_URL }}'),
    'Packaged updater configuration must receive the release API URL.',
)
for (const requiredArtifact of [
    'ScriptFlow-${VERSION}-mac-arm64.dmg',
    'ScriptFlow-${VERSION}-mac-arm64.zip',
    'ScriptFlow-${VERSION}-mac-arm64.zip.blockmap',
    'ScriptFlow-${VERSION}-win-x64.exe',
    'ScriptFlow-${VERSION}-win-x64.exe.blockmap',
    'ScriptFlow-${VERSION}-linux-x64.AppImage',
    "'release-assets/latest.yml'",
    "'release-assets/latest-mac.yml'",
]) {
    assert(releaseWorkflow.includes(requiredArtifact), `Release validation must require ${requiredArtifact}.`)
}
assert(!releaseWorkflow.includes('AZCOPY_IMAGE'), 'The superseded Docker-based AzCopy configuration must be removed.')
assert(!releaseWorkflow.includes('AZURE_STORAGE_ACCOUNT_URL'), 'The superseded Azure account secret must be removed.')
assert(!releaseWorkflow.includes('AZURE_STORAGE_SAS_TOKEN'), 'The superseded Azure SAS secret must be removed.')

assert(azureAction.includes("default: '10.32.6'"), 'AzCopy must use the Agent Vault pinned version.')
assert(
    azureAction.includes("default: '6538f7fb9ec6e4d159e44a1612ca7eee24fe7a822065a3dcbc664ef30fe85d16'"),
    'AzCopy must use the Agent Vault archive checksum.',
)
assert(azureAction.includes('sha256sum --check --status'), 'The AzCopy archive checksum must be verified.')
assert(
    azureAction.includes('blob_path="${APP_ID}/releases/${TAG}/${file_name}"'),
    'Installers must use versioned Azure paths.',
)
assert(
    azureAction.includes('STORAGE_BASE_URL="https://${STORAGE_ACCOUNT}.blob.core.windows.net/${CONTAINER_NAME}"'),
    'Private upload destinations must be derived from the Azure storage account and container.',
)
assert(
    azureAction.includes('${STORAGE_BASE_URL}/${APP_ID}/latest.json'),
    'The website manifest must be uploaded privately at the app root.',
)
assert(
    azureAction.includes('url="${DOWNLOAD_BASE_URL}/${blob_path}"'),
    'Installer metadata URLs must use the client-facing release API base.',
)
assert(azureAction.includes("default: 'updates'"), 'The updater prefix must default to updates.')
assert(azureAction.includes('mapfile -t installer_paths'), 'Installer paths must be isolated from child stdin.')
assert(azureAction.includes('mapfile -t updater_paths'), 'Updater paths must be isolated from child stdin.')
assert(azureAction.includes('</dev/null'), 'AzCopy must not consume release path input.')
assert(
    azureAction.includes('expected_platforms = {"macos", "windows", "linux"}'),
    'The website manifest must require all supported installer platforms.',
)
assert(
    azureAction.includes('for expected_platform in macos windows linux') &&
        azureAction.includes('Expected exactly one ${expected_platform} installer.'),
    'The Azure action must reject incomplete or duplicate platform installer sets.',
)
assert(azureAction.includes('Expected exactly three installers'), 'The installer set must contain exactly three files.')
for (const updaterKind of ['latest.yml', 'latest-mac.yml', 'zip', 'zip.blockmap', 'exe', 'exe.blockmap']) {
    assert(
        azureAction.includes(`Expected exactly one \${expected_updater_kind} updater file.`) &&
            azureAction.includes(updaterKind),
        `The Azure action must reject an incomplete ${updaterKind} updater set.`,
    )
}
assert(azureAction.includes('Expected exactly six updater files'), 'The updater feed must contain exactly six files.')
assert(!azureAction.includes('if [[ "$updater_count" -gt 0 ]]'), 'An empty updater set must be rejected as incomplete.')
assert(
    azureAction.includes('${STORAGE_BASE_URL}/${APP_ID}/${UPDATER_PREFIX}/${file_name}'),
    'Updater uploads must use the private storage URL and dedicated updater prefix.',
)
assert(
    azureAction.indexOf('upload_updater_files false') < azureAction.indexOf('upload_updater_files true'),
    'Updater payloads must be uploaded before updater manifests.',
)
assert(!azureAction.includes('docker run'), 'The Azure upload action must not depend on Docker.')
assert(azureAction.includes('verify_remote_blob()'), 'The Azure action must verify uploaded blobs remotely.')
assert(
    azureAction.includes('"$(append_sas_token "${STORAGE_BASE_URL}/${blob_path}")"'),
    'Remote blob verification must authenticate with the read-capable SAS token.',
)
assert(
    azureAction.includes('cmp --silent "$source_path" "$downloaded_path"'),
    'Remote blob verification must compare downloaded bytes with the local source.',
)
assert(
    azureAction.includes('verify_remote_blob "$installer_path" "${APP_ID}/releases/${TAG}/${file_name}"'),
    'All three validated installers must be verified after upload.',
)
assert(
    azureAction.includes('verify_remote_blob "$updater_path" "${APP_ID}/${UPDATER_PREFIX}/${file_name}"'),
    'All six validated updater files must be verified after upload.',
)
assert(
    azureAction.includes('verify_remote_blob "$latest_json" "${APP_ID}/latest.json"'),
    'latest.json must be verified after upload.',
)

assert(builderConfigService.includes("provider: 'generic'"), 'Packaged apps must use the generic updater provider.')
assert(
    builderConfigService.includes('environment.AZURE_INSTALLER_PUBLIC_BASE_URL'),
    'The generic updater must use the release API URL.',
)
assert(builderConfigService.includes('/script-flow/updates`'), 'The updater URL must use the updates prefix.')
assert(!builderConfigService.includes("provider: 'github'"), 'Packaged apps must no longer use the GitHub updater.')
assert(
    !releaseWorkflow.includes('Verify public Azure release files') && !releaseWorkflow.includes('curl --fail'),
    'The workflow must not perform anonymous Azure verification.',
)
assert(
    !azureAction.includes('AZURE_INSTALLER_PUBLIC_BASE_URL') && !azureAction.includes('public_base_url'),
    'The Azure action must not expose the retired public storage URL input.',
)
console.log('✓ Private Azure uploads, authenticated verification, and API client URLs are configured correctly.')

console.log('\nRelease smoke checks passed.')
