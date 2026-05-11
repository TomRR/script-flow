import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { AppIconService } from '../src/main/app-icon-service'
import {
    DesktopBuilderConfigService,
    type BuildArch,
    type BuildDesktopArtifactOptions,
    type BuildPlatform,
} from './desktop-builder-config-service'

function assert(condition: boolean, message: string): asserts condition {
    if (!condition) {
        throw new Error(message)
    }
}

function getProjectRoot(): string {
    return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
}

function getPackageVersion(projectRoot: string): string {
    const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))
    return packageJson.version
}

function resolveHostPlatform(platformValue: NodeJS.Platform): BuildPlatform {
    switch (platformValue) {
        case 'darwin':
            return 'mac'
        case 'linux':
            return 'linux'
        case 'win32':
            return 'win'
        default:
            throw new Error(`Unsupported host platform: ${platformValue}`)
    }
}

function resolveDefaultTarget(platformValue: BuildPlatform): string {
    switch (platformValue) {
        case 'mac':
            return 'dmg'
        case 'linux':
            return 'AppImage'
        case 'win':
            return 'nsis'
    }
}

function resolveDefaultArch(): BuildArch {
    return process.arch === 'arm64' ? 'arm64' : 'x64'
}

export function parseBuildDesktopArtifactArgs(
    argv: string[],
    projectRoot = getProjectRoot(),
): BuildDesktopArtifactOptions {
    const options: BuildDesktopArtifactOptions = {
        platform: resolveHostPlatform(process.platform),
        target: resolveDefaultTarget(resolveHostPlatform(process.platform)),
        arch: resolveDefaultArch(),
        buildVersion: getPackageVersion(projectRoot),
        outputDir: path.join(projectRoot, 'release'),
        skipBuild: false,
    }

    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index]

        switch (argument) {
            case '--platform':
                options.platform = argv[index + 1] as BuildPlatform
                index += 1
                break
            case '--target':
                options.target = argv[index + 1] ?? options.target
                index += 1
                break
            case '--arch':
                options.arch = argv[index + 1] as BuildArch
                index += 1
                break
            case '--build-version':
                options.buildVersion = argv[index + 1] ?? options.buildVersion
                index += 1
                break
            case '--output-dir':
                options.outputDir = path.resolve(projectRoot, argv[index + 1] ?? options.outputDir)
                index += 1
                break
            case '--skip-build':
                options.skipBuild = true
                break
            default:
                throw new Error(`Unknown argument: ${argument}`)
        }
    }

    assert(
        options.platform === 'mac' || options.platform === 'linux' || options.platform === 'win',
        'Platform must be mac, linux, or win.',
    )
    assert(options.arch === 'arm64' || options.arch === 'x64', 'Arch must be arm64 or x64.')
    assert(
        typeof options.buildVersion === 'string' && options.buildVersion.length > 0,
        'Build version must be provided.',
    )

    return options
}

async function runCommand(
    command: string,
    args: string[],
    cwd: string,
    env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
    await new Promise<void>((resolvePromise, rejectPromise) => {
        const child = spawn(command, args, {
            cwd,
            env,
            stdio: 'inherit',
            shell: process.platform === 'win32',
        })

        child.on('error', rejectPromise)
        child.on('exit', (code) => {
            if (code === 0) {
                resolvePromise()
                return
            }

            rejectPromise(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 1}`))
        })
    })
}

function renameUpdaterManifests(outputDir: string, platformValue: BuildPlatform, arch: BuildArch): void {
    if (platformValue === 'mac' && arch !== 'arm64') {
        for (const file of readdirSync(outputDir)) {
            if (!file.endsWith('-mac.yml')) {
                continue
            }

            const currentPath = path.join(outputDir, file)
            const targetPath = path.join(outputDir, file.replace(/-mac\.yml$/, `-mac-${arch}.yml`))
            rmSync(targetPath, { force: true })
            copyFileSync(currentPath, targetPath)
            rmSync(currentPath, { force: true })
        }
    }
}

export async function buildDesktopArtifact(options: BuildDesktopArtifactOptions): Promise<void> {
    const projectRoot = getProjectRoot()
    const environment: NodeJS.ProcessEnv = { ...process.env }
    const outputDir = path.resolve(options.outputDir)
    const builderConfigPath = DesktopBuilderConfigService.writeBuilderConfig(options, environment)
    const builderArgs = ['electron-builder', '--publish', 'never', '--config', builderConfigPath]

    mkdirSync(outputDir, { recursive: true })

    if (options.platform === 'mac') {
        await AppIconService.ensureMacIconAssets({ projectRoot })
    }

    if (options.platform === 'win') {
        await AppIconService.ensureWindowsIconAssets({ projectRoot })
    }

    if (!options.skipBuild) {
        await runCommand('bun', ['run', 'build:desktop'], projectRoot, environment)
    }

    if (!DesktopBuilderConfigService.hasMacSigningSecrets(environment)) {
        environment.CSC_IDENTITY_AUTO_DISCOVERY = 'false'
        delete environment.CSC_LINK
        delete environment.CSC_KEY_PASSWORD
        delete environment.APPLE_API_KEY
        delete environment.APPLE_API_KEY_ID
        delete environment.APPLE_API_ISSUER
    } else if (options.platform === 'mac') {
        const keyPath = path.join(tmpdir(), `AuthKey_${environment.APPLE_API_KEY_ID}.p8`)
        writeFileSync(keyPath, environment.APPLE_API_KEY!, 'utf8')
        environment.APPLE_API_KEY = keyPath
    }

    if (options.platform === 'mac') {
        builderArgs.push('--mac')
    }
    if (options.platform === 'linux') {
        builderArgs.push('--linux')
    }
    if (options.platform === 'win') {
        builderArgs.push('--win')
    }

    builderArgs.push(`--${options.arch}`)

    await runCommand('bunx', builderArgs, projectRoot, environment)
    renameUpdaterManifests(outputDir, options.platform, options.arch)

    const producedFiles = readdirSync(outputDir).filter((file) => existsSync(path.join(outputDir, file)))
    assert(producedFiles.length > 0, `No artifacts were produced in ${outputDir}`)
}

if (import.meta.main) {
    const options = parseBuildDesktopArtifactArgs(process.argv.slice(2))
    await buildDesktopArtifact(options)
}
