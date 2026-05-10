import { access } from 'node:fs/promises'
import path from 'node:path'

const WINDOWS_BASH_FILENAME = 'bash.exe'
const WINDOWS_PATH_DELIMITER = ';'
const WINDOWS_GIT_BASH_SUBPATHS = [
    ['Git', 'bin', WINDOWS_BASH_FILENAME],
    ['Git', 'usr', 'bin', WINDOWS_BASH_FILENAME],
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

        const commandFromPath = await this.findCommandOnPath()
        if (commandFromPath) {
            return commandFromPath
        }

        const commandFromCommonInstall = await this.findCommandInCommonInstallLocations()
        if (commandFromCommonInstall) {
            return commandFromCommonInstall
        }

        throw new Error(
            'Git Bash not found. Install Git for Windows and ensure bash.exe is available on PATH or in a standard Git installation folder',
        )
    }

    private async findCommandOnPath(): Promise<string | null> {
        for (const pathEntry of this.getPathEntries()) {
            const candidate = this.pathModule.join(pathEntry, WINDOWS_BASH_FILENAME)
            if (await this.fileExistsValue(candidate)) {
                return candidate
            }
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
            WINDOWS_GIT_BASH_SUBPATHS.map((segments) => this.pathModule.join(root, ...segments)),
        )
    }

    private static stripQuotes(value: string): string {
        return value.replace(/^"(.*)"$/, '$1')
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
