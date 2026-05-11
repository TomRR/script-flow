import { access } from 'node:fs/promises'
import path from 'node:path'

const WINDOWS_BASH_FILENAME = 'bash.exe'
const WINDOWS_PATH_DELIMITER = ';'
const WINDOWS_GIT_BASH_SUBPATHS = [
    ['Git', 'bin', WINDOWS_BASH_FILENAME],
    ['Git', 'usr', 'bin', WINDOWS_BASH_FILENAME]
]

interface BashRuntimeServiceOptions {
    platform?: NodeJS.Platform
    env?: NodeJS.ProcessEnv
    fileExists?: (filePath: string) => Promise<boolean>
}

export class BashRuntimeService {
    private readonly platformValue: NodeJS.Platform
    private readonly envValue: NodeJS.ProcessEnv
    private readonly fileExistsValue: (filePath: string) => Promise<boolean>
    private readonly pathModule: typeof path.posix

    constructor(options: BashRuntimeServiceOptions = {}) {
        this.platformValue = options.platform ?? process.platform
        this.envValue = options.env ?? process.env
        this.fileExistsValue = options.fileExists ?? BashRuntimeService.pathExists
        this.pathModule = this.platformValue === 'win32' ? path.win32 : path.posix
    }

    getPlatform(): NodeJS.Platform {
        return this.platformValue
    }

    async resolveCommand(): Promise<string> {
        if (this.platformValue !== 'win32') {
            return 'bash'
        }

        const commandFromCommonInstall = await this.findCommandInCommonInstallLocations()
        if (commandFromCommonInstall) {
            return commandFromCommonInstall
        }

        const rejectedPathCommands: string[] = []
        const commandFromPath = await this.findCommandOnPath(rejectedPathCommands)
        if (commandFromPath) {
            return commandFromPath
        }

        throw new Error(this.createGitBashNotFoundMessage(rejectedPathCommands))
    }

    private async findCommandOnPath(rejectedPathCommands: string[]): Promise<string | null> {
        for (const pathEntry of this.getPathEntries()) {
            const candidate = this.pathModule.join(pathEntry, WINDOWS_BASH_FILENAME)
            if (!(await this.fileExistsValue(candidate))) {
                continue
            }

            if (BashRuntimeService.isGitForWindowsBashPath(candidate)) {
                return candidate
            }

            rejectedPathCommands.push(candidate)
        }

        return null
    }

    private async findCommandInCommonInstallLocations(): Promise<string | null> {
        for (const candidate of this.getCommonInstallCandidates()) {
            if (await this.fileExistsValue(candidate)) {
                return candidate
            }
        }

        return null
    }

    private getPathEntries(): string[] {
        const pathValue = this.envValue.PATH ?? this.envValue.Path ?? this.envValue.path ?? ''
        if (!pathValue) {
            return []
        }

        return pathValue
            .split(this.platformValue === 'win32' ? WINDOWS_PATH_DELIMITER : path.delimiter)
            .map((entry) => entry.trim())
            .filter(Boolean)
            .map(BashRuntimeService.stripQuotes)
    }

    private getCommonInstallCandidates(): string[] {
        const installRoots = [
            this.envValue.ProgramFiles,
            this.envValue['ProgramFiles(x86)'],
            this.envValue.LocalAppData ? this.pathModule.join(this.envValue.LocalAppData, 'Programs') : undefined,
        ].filter((root): root is string => Boolean(root))

        return installRoots.flatMap((root) =>
            WINDOWS_GIT_BASH_SUBPATHS.map((segments) => this.pathModule.join(root, ...segments))
        )
    }

    private createGitBashNotFoundMessage(rejectedPathCommands: string[]): string {
        const baseMessage =
            'Git Bash not found. Install Git for Windows or put Git Bash ahead of incompatible bash.exe entries on PATH'

        if (rejectedPathCommands.length === 0) {
            return baseMessage
        }

        return `${baseMessage}. Rejected non-Git Bash candidates found on PATH: ${rejectedPathCommands.join(', ')}`
    }

    private static stripQuotes(value: string): string {
        return value.replace(/^"(.*)"$/, '$1')
    }

    private static isGitForWindowsBashPath(filePath: string): boolean {
        const normalizedPath = path.win32.normalize(filePath).toLowerCase()
        const gitBinBashPath = path.win32.join('git', 'bin', WINDOWS_BASH_FILENAME).toLowerCase()
        const gitUsrBinBashPath = path.win32.join('git', 'usr', 'bin', WINDOWS_BASH_FILENAME).toLowerCase()

        return normalizedPath.endsWith(`${path.win32.sep}${gitBinBashPath}`)
            || normalizedPath.endsWith(`${path.win32.sep}${gitUsrBinBashPath}`)
    }

    private static async pathExists(filePath: string): Promise<boolean> {
        try {
            await access(filePath)
            return true
        } catch {
            return false
        }
    }
}
