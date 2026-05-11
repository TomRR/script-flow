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
type WindowsIconPngCreator = (sourceIconPath: string, size: number) => Promise<Buffer>
type DynamicImport = (specifier: string) => Promise<unknown>

interface SharpResizeOptions {
    fit: 'contain'
    background: {
        r: number
        g: number
        b: number
        alpha: number
    }
}

interface SharpImage {
    resize(width: number, height: number, options: SharpResizeOptions): SharpImage
    png(): {
        toBuffer(): Promise<Buffer>
    }
}

type SharpFactory = (input: string) => SharpImage

interface SharpModule {
    default?: SharpFactory
}

export interface WindowsIconImage {
    width: number
    height: number
    pngBuffer: Buffer
}

export interface EnsureMacIconAssetsOptions {
    platform?: NodeJS.Platform
    architecture?: NodeJS.Architecture
    projectRoot?: string
    tempRoot?: string
    runCommand?: CommandRunner
}

export interface EnsureWindowsIconAssetsOptions {
    projectRoot?: string
    iconSizes?: number[]
    createPngBuffer?: WindowsIconPngCreator
}

export class AppIconService {
    static readonly SOURCE_ICON_RELATIVE_PATH = path.join('public', 'icon.png')
    static readonly MAC_ICON_RELATIVE_PATH = path.join('build', 'icon.icns')
    static readonly WINDOWS_ICON_RELATIVE_PATH = path.join('build', 'icon.ico')
    static readonly MAC_TEMP_DIRECTORY_NAME = 'scriptflow-icon'
    static readonly PADDED_ICON_FILENAME = 'icon-square.png'
    static readonly WINDOWS_ICON_SIZES = [16, 24, 32, 48, 64, 128, 256] as const

    static getSourceIconPath(projectRoot = process.cwd()): string {
        return path.join(projectRoot, AppIconService.SOURCE_ICON_RELATIVE_PATH)
    }

    static getMacIconPath(projectRoot = process.cwd()): string {
        return path.join(projectRoot, AppIconService.MAC_ICON_RELATIVE_PATH)
    }

    static getWindowsIconPath(projectRoot = process.cwd()): string {
        return path.join(projectRoot, AppIconService.WINDOWS_ICON_RELATIVE_PATH)
    }

    static getBuildDirectory(projectRoot = process.cwd()): string {
        return path.join(projectRoot, 'build')
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

    static createIcoBuffer(images: WindowsIconImage[]): Buffer {
        if (images.length === 0) {
            throw new Error('At least one image is required to create an ICO file.')
        }

        const directorySize = 6 + images.length * 16
        const header = Buffer.alloc(directorySize)
        let imageOffset = directorySize

        header.writeUInt16LE(0, 0)
        header.writeUInt16LE(1, 2)
        header.writeUInt16LE(images.length, 4)

        images.forEach((image, index) => {
            const entryOffset = 6 + index * 16
            const imageSize = image.pngBuffer.length

            header.writeUInt8(AppIconService.getIcoDirectoryDimension(image.width), entryOffset)
            header.writeUInt8(AppIconService.getIcoDirectoryDimension(image.height), entryOffset + 1)
            header.writeUInt8(0, entryOffset + 2)
            header.writeUInt8(0, entryOffset + 3)
            header.writeUInt16LE(1, entryOffset + 4)
            header.writeUInt16LE(32, entryOffset + 6)
            header.writeUInt32LE(imageSize, entryOffset + 8)
            header.writeUInt32LE(imageOffset, entryOffset + 12)

            imageOffset += imageSize
        })

        return Buffer.concat([header, ...images.map((image) => image.pngBuffer)])
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

    static async ensureWindowsIconAssets(options: EnsureWindowsIconAssetsOptions = {}): Promise<string> {
        const projectRoot = options.projectRoot ?? process.cwd()
        const sourceIconPath = AppIconService.getSourceIconPath(projectRoot)
        const windowsIconPath = AppIconService.getWindowsIconPath(projectRoot)
        const buildDirectory = AppIconService.getBuildDirectory(projectRoot)
        const iconSizes = options.iconSizes ?? [...AppIconService.WINDOWS_ICON_SIZES]
        const createPngBuffer = options.createPngBuffer ?? AppIconService.createResizedPngBuffer

        await fs.mkdir(buildDirectory, { recursive: true })

        const images = await Promise.all(
            iconSizes.map(async (size) => ({
                width: size,
                height: size,
                pngBuffer: await createPngBuffer(sourceIconPath, size),
            })),
        )

        await fs.writeFile(windowsIconPath, AppIconService.createIcoBuffer(images))

        return windowsIconPath
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

    private static getIcoDirectoryDimension(size: number): number {
        if (size === 256) {
            return 0
        }

        if (Number.isInteger(size) && size > 0 && size < 256) {
            return size
        }

        throw new Error(`ICO dimensions must be between 1 and 256 pixels. Received: ${size}`)
    }

    private static async createResizedPngBuffer(sourceIconPath: string, size: number): Promise<Buffer> {
        const sharp = await AppIconService.loadSharpFactory()

        return await sharp(sourceIconPath)
            .resize(size, size, {
                fit: 'contain',
                background: {
                    r: 0,
                    g: 0,
                    b: 0,
                    alpha: 0,
                },
            })
            .png()
            .toBuffer()
    }

    private static async loadSharpFactory(): Promise<SharpFactory> {
        const dynamicImport = Function('specifier', 'return import(specifier)') as DynamicImport
        const sharpModule = await dynamicImport('sharp')

        if (typeof sharpModule === 'function') {
            return sharpModule as SharpFactory
        }

        if (typeof sharpModule === 'object' && sharpModule !== null) {
            const sharp = (sharpModule as SharpModule).default

            if (typeof sharp === 'function') {
                return sharp
            }
        }

        throw new Error('Failed to load sharp for Windows icon generation.')
    }
}
