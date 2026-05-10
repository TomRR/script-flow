import type { ScriptEntry } from '../../../../main/vault-handler'

export interface ScriptCommand {
    command: string
    args: string[]
}

export interface ScriptCommandBuildOptions {
    bashCommand?: string
    platform?: NodeJS.Platform
}

function getExtension(filePath: string): string {
    const lastSlashIndex = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
    const fileName = lastSlashIndex === -1 ? filePath : filePath.substring(lastSlashIndex + 1)
    const lastDotIndex = fileName.lastIndexOf('.')
    if (lastDotIndex === -1) {
        return ''
    }
    return fileName.substring(lastDotIndex).toLowerCase()
}

export class ScriptCommandService {
    static buildCommand(
        script: Pick<ScriptEntry, 'type' | 'customCommand'>,
        absoluteScriptPath: string,
        options: ScriptCommandBuildOptions = {},
    ): ScriptCommand {
        switch (script.type) {
            case 'bash':
                return this.buildBashCommand(absoluteScriptPath, options)
            case 'python':
                return { command: 'python3', args: ['-u', absoluteScriptPath] }
            case 'csharp':
                return { command: 'dotnet', args: this.buildCSharpArgs(absoluteScriptPath) }
            case 'powershell':
                return { command: 'powershell', args: ['-File', absoluteScriptPath] }
            case 'custom':
                return this.buildCustomCommand(script.customCommand, absoluteScriptPath)
            default:
                throw new Error(`Unsupported script type: ${script.type}`)
        }
    }

    private static buildBashCommand(absoluteScriptPath: string, options: ScriptCommandBuildOptions): ScriptCommand {
        return {
            command: options.bashCommand ?? 'bash',
            args: [this.normalizeBashScriptPath(absoluteScriptPath, options.platform ?? process.platform)],
        }
    }

    private static buildCSharpArgs(absoluteScriptPath: string): string[] {
        const extension = getExtension(absoluteScriptPath)

        if (extension === '.cs') {
            return ['run', '--file', absoluteScriptPath]
        }

        return ['run', '--project', absoluteScriptPath]
    }

    private static buildCustomCommand(customCommand: string | undefined, absoluteScriptPath: string): ScriptCommand {
        if (!customCommand) {
            throw new Error('Custom command is required for custom script type')
        }

        const commandParts = customCommand.trim().split(/\s+/)
        const command = commandParts[0]
        const args = commandParts.slice(1).concat([absoluteScriptPath])

        return { command, args }
    }

    private static normalizeBashScriptPath(filePath: string, platform: NodeJS.Platform): string {
        if (platform !== 'win32') {
            return filePath
        }

        const driveLetterMatch = filePath.match(/^([A-Za-z]):[\\/](.*)$/)
        if (!driveLetterMatch) {
            return filePath
        }

        const [, driveLetter, rest] = driveLetterMatch
        return `/${driveLetter.toLowerCase()}/${rest.replace(/\\/g, '/')}`
    }
}
