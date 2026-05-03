import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(`SMOKE FAIL: ${message}`)
    }
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

console.log('\nRelease smoke checks passed.')
