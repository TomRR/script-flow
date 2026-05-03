import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import YAML from 'yaml'

export type UpdateManifestPlatform = 'mac' | 'win'

export interface UpdateManifestFile {
    url: string
    sha512?: string
    size?: number
    [key: string]: unknown
}

export interface UpdateManifest {
    version: string
    files: UpdateManifestFile[]
    releaseDate?: string
    path?: string
    sha512?: string
    [key: string]: unknown
}

function assert(condition: boolean, message: string): asserts condition {
    if (!condition) {
        throw new Error(message)
    }
}

function getManifestExtras(manifest: UpdateManifest): Record<string, unknown> {
    const {
        version: _version,
        files: _files,
        releaseDate: _releaseDate,
        path: _path,
        sha512: _sha512,
        ...extras
    } = manifest

    return extras
}

export function parseUpdateManifest(raw: string, sourcePath: string): UpdateManifest {
    const parsed = YAML.parse(raw)

    assert(typeof parsed === 'object' && parsed !== null, `Invalid update manifest: ${sourcePath}`)
    assert(typeof parsed.version === 'string' && parsed.version.length > 0, `Missing version in ${sourcePath}`)
    assert(Array.isArray(parsed.files), `Missing files array in ${sourcePath}`)

    return parsed as UpdateManifest
}

export function mergeUpdateManifests(primary: UpdateManifest, secondary: UpdateManifest): UpdateManifest {
    assert(primary.version === secondary.version, 'Cannot merge updater manifests with different versions.')

    const primaryReleaseDate = primary.releaseDate ?? ''
    const secondaryReleaseDate = secondary.releaseDate ?? ''
    const mergedReleaseDate = primaryReleaseDate >= secondaryReleaseDate ? primaryReleaseDate : secondaryReleaseDate

    const mergedExtras = {
        ...getManifestExtras(primary),
        ...getManifestExtras(secondary),
    }

    return {
        version: primary.version,
        files: [...primary.files, ...secondary.files],
        ...mergedExtras,
        ...(mergedReleaseDate ? { releaseDate: mergedReleaseDate } : {}),
    }
}

export function serializeUpdateManifest(manifest: UpdateManifest): string {
    const extras = getManifestExtras(manifest)

    const orderedManifest = {
        version: manifest.version,
        files: manifest.files,
        ...extras,
        ...(manifest.releaseDate ? { releaseDate: manifest.releaseDate } : {}),
    }

    return YAML.stringify(orderedManifest)
}

function parseCliArgs(argv: string[]): {
    platform: UpdateManifestPlatform
    primaryPath: string
    secondaryPath: string
    outputPath?: string
} {
    assert(
        argv.length >= 5,
        'Usage: bun run scripts/merge-update-manifests.ts --platform <mac|win> <primary-path> <secondary-path> [output-path]',
    )
    assert(argv[0] === '--platform', 'First argument must be --platform.')
    assert(argv[1] === 'mac' || argv[1] === 'win', 'Platform must be mac or win.')

    return {
        platform: argv[1],
        primaryPath: argv[2],
        secondaryPath: argv[3],
        outputPath: argv[4],
    }
}

export function mergeUpdateManifestFiles(
    platform: UpdateManifestPlatform,
    primaryPathArg: string,
    secondaryPathArg: string,
    outputPathArg?: string,
): void {
    const primaryPath = resolve(primaryPathArg)
    const secondaryPath = resolve(secondaryPathArg)
    const outputPath = resolve(outputPathArg ?? primaryPathArg)
    const primary = parseUpdateManifest(readFileSync(primaryPath, 'utf8'), primaryPath)
    const secondary = parseUpdateManifest(readFileSync(secondaryPath, 'utf8'), secondaryPath)
    const merged = mergeUpdateManifests(primary, secondary)

    writeFileSync(outputPath, serializeUpdateManifest(merged), 'utf8')
    console.log(`Merged ${platform} update manifests into ${outputPath}`)
}

if (import.meta.main) {
    const { platform, primaryPath, secondaryPath, outputPath } = parseCliArgs(process.argv.slice(2))
    mergeUpdateManifestFiles(platform, primaryPath, secondaryPath, outputPath)
}
