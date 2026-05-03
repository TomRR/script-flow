import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export interface ImageSize {
    width: number
    height: number
}

interface CommandResult {
    stdout: string
    stderr: string
}

type CommandRunner = (command: string, args: string[]) => Promise<CommandResult>

export interface EnsureMacIconAssetsOptions {
    platform?: NodeJS.Platform
    architecture?: NodeJS.Architecture
    projectRoot?: string
    tempRoot?: string
    runCommand?: CommandRunner
}

export class AppIconService {
    static readonly SOURCE_ICON_RELATIVE_PATH = path.join('public', 'icon.png')
    static readonly MAC_ICON_RELATIVE_PATH = path.join('build', 'icon.icns')
    static readonly MAC_TEMP_DIRECTORY_NAME = 'scriptflow-icon'
    static readonly PADDED_ICON_FILENAME = 'icon-square.png'

    static getSourceIconPath(projectRoot = process.cwd()): string {
        return path.join(projectRoot, AppIconService.SOURCE_ICON_RELATIVE_PATH)
    }

    static getMacIconPath(projectRoot = process.cwd()): string {
        return path.join(projectRoot, AppIconService.MAC_ICON_RELATIVE_PATH)
    }

    static getBuildDirectory(projectRoot = process.cwd()): string {
        return path.dirname(AppIconService.getMacIconPath(projectRoot))
    }

    static getTemporaryDirectory(tempRoot = os.tmpdir()): string {
        return path.join(tempRoot, AppIconService.MAC_TEMP_DIRECTORY_NAME)
    }

    static getTemporaryPaddedIconPath(tempRoot = os.tmpdir()): string {
        return path.join(AppIconService.getTemporaryDirectory(tempRoot), AppIconService.PADDED_ICON_FILENAME)
    }

    static getAppBuilderPath(projectRoot = process.cwd(), architecture: NodeJS.Architecture = process.arch): string {
        const executableName = architecture === 'x64' ? 'app-builder_amd64' : `app-builder_${architecture}`

        return path.join(projectRoot, 'node_modules', 'app-builder-bin', 'mac', executableName)
    }

    static getSquareSize(size: ImageSize): number {
        return Math.max(size.width, size.height)
    }

    static createImageSizeArgs(sourceIconPath: string): string[] {
        return ['-g', 'pixelWidth', '-g', 'pixelHeight', sourceIconPath]
    }

    static createPadImageArgs(sourceIconPath: string, outputPath: string, squareSize: number): string[] {
        return ['--padToHeightWidth', `${squareSize}`, `${squareSize}`, sourceIconPath, '--out', outputPath]
    }

    static createIcnsArgs(projectRoot: string, paddedIconPath: string, outputDirectory: string): string[] {
        return [
            'icon',
            '--format',
            'icns',
            '--root',
            projectRoot,
            '--root',
            path.dirname(paddedIconPath),
            '--out',
            outputDirectory,
            '--input',
            paddedIconPath,
        ]
    }

    static parseImageSize(output: string): ImageSize {
        const widthMatch = output.match(/pixelWidth:\s*(\d+)/)
        const heightMatch = output.match(/pixelHeight:\s*(\d+)/)

        if (!widthMatch || !heightMatch) {
            throw new Error(`Failed to read image size from sips output: ${output}`)
        }

        return {
            width: Number.parseInt(widthMatch[1], 10),
            height: Number.parseInt(heightMatch[1], 10),
        }
    }

    static async ensureMacIconAssets(options: EnsureMacIconAssetsOptions = {}): Promise<string | null> {
        const platform = options.platform ?? process.platform
        if (platform !== 'darwin') {
            return null
        }

        const projectRoot = options.projectRoot ?? process.cwd()
        const architecture = options.architecture ?? process.arch
        const tempRoot = options.tempRoot ?? os.tmpdir()
        const runCommand = options.runCommand ?? AppIconService.runCommand
        const sourceIconPath = AppIconService.getSourceIconPath(projectRoot)
        const macIconPath = AppIconService.getMacIconPath(projectRoot)
        const buildDirectory = AppIconService.getBuildDirectory(projectRoot)
        const temporaryDirectory = AppIconService.getTemporaryDirectory(tempRoot)
        const paddedIconPath = AppIconService.getTemporaryPaddedIconPath(tempRoot)
        const appBuilderPath = AppIconService.getAppBuilderPath(projectRoot, architecture)

        await fs.mkdir(buildDirectory, { recursive: true })
        await fs.mkdir(temporaryDirectory, { recursive: true })

        const imageSizeResult = await runCommand('sips', AppIconService.createImageSizeArgs(sourceIconPath))
        const imageSize = AppIconService.parseImageSize(imageSizeResult.stdout)
        const squareSize = AppIconService.getSquareSize(imageSize)

        await runCommand('sips', AppIconService.createPadImageArgs(sourceIconPath, paddedIconPath, squareSize))

        await runCommand(appBuilderPath, AppIconService.createIcnsArgs(projectRoot, paddedIconPath, buildDirectory))

        return macIconPath
    }

    private static async runCommand(command: string, args: string[]): Promise<CommandResult> {
        const { execFile } = await import('node:child_process')

        return await new Promise((resolve, reject) => {
            execFile(command, args, (error, stdout, stderr) => {
                if (error) {
                    reject(error)
                    return
                }

                resolve({
                    stdout: stdout ?? '',
                    stderr: stderr ?? '',
                })
            })
        })
    }
}
