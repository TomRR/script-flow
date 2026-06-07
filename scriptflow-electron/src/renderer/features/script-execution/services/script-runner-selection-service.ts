import type { ScriptEntry, ScriptType, ScriptTypeMode } from '../../../../renderer.d'
import { ScriptTypeDetectorService, type BuiltInScriptType } from './script-type-detector-service'

export const SCRIPT_RUNNER_OPTIONS: Array<{ value: ScriptType; label: string }> = [
    { value: 'bash', label: 'Bash' },
    { value: 'csharp', label: 'C#' },
    { value: 'python', label: 'Python' },
    { value: 'powershell', label: 'PowerShell' },
    { value: 'custom', label: 'Custom' },
]

const CUSTOM_RUNNER_GUIDANCE =
    'Select Manual, choose Custom, and enter a run command such as "go run" or "npx tsx" in the custom command input.'

export const UNSUPPORTED_AUTO_RUNNER_MESSAGE = `Auto cannot detect a runner for this file type. ${CUSTOM_RUNNER_GUIDANCE}`

export class ScriptRunnerSelectionService {
    static detectAutoType(filePath: string): BuiltInScriptType | null {
        return ScriptTypeDetectorService.detectBuiltInType(filePath)
    }

    static getMode(script: Pick<ScriptEntry, 'path' | 'type' | 'scriptTypeMode'>): ScriptTypeMode {
        const detectedType = this.detectAutoType(script.path)

        if (script.scriptTypeMode === 'auto') return 'auto'

        if (script.scriptTypeMode === 'manual') {
            return 'manual'
        }

        return detectedType && script.type === detectedType ? 'auto' : 'manual'
    }

    static getScriptDefaults(filePath: string): Pick<ScriptEntry, 'type' | 'scriptTypeMode'> {
        const detectedType = this.detectAutoType(filePath)

        if (detectedType) {
            return {
                type: detectedType,
                scriptTypeMode: 'auto',
            }
        }

        return {
            type: ScriptTypeDetectorService.detectType(filePath),
            scriptTypeMode: 'manual',
        }
    }

    static updateMode(script: ScriptEntry, mode: ScriptTypeMode): ScriptEntry {
        if (mode === 'manual') {
            return {
                ...script,
                scriptTypeMode: 'manual',
            }
        }

        const detectedType = this.detectAutoType(script.path)

        return {
            ...script,
            scriptTypeMode: 'auto',
            ...(detectedType ? { type: detectedType } : {}),
        }
    }

    static updateManualType(script: ScriptEntry, type: ScriptType): ScriptEntry {
        return {
            ...script,
            type,
            scriptTypeMode: 'manual',
        }
    }

    static updatePath(script: ScriptEntry, path: string): ScriptEntry {
        const mode = this.getMode(script)

        if (mode === 'manual') {
            return {
                ...script,
                path,
                scriptTypeMode: 'manual',
            }
        }

        const detectedType = this.detectAutoType(path)

        if (!detectedType) {
            return {
                ...script,
                path,
                scriptTypeMode: 'auto',
            }
        }

        return {
            ...script,
            path,
            type: detectedType,
            scriptTypeMode: 'auto',
        }
    }

    static getRunnerLabel(type: ScriptType): string {
        return SCRIPT_RUNNER_OPTIONS.find((option) => option.value === type)?.label || type
    }

    static getUnsupportedAutoWarning(script: Pick<ScriptEntry, 'path' | 'type' | 'scriptTypeMode'>): string | null {
        return this.getMode(script) === 'auto' && !this.detectAutoType(script.path)
            ? UNSUPPORTED_AUTO_RUNNER_MESSAGE
            : null
    }

    static getFirstUnsupportedAutoWarning(
        scripts: Array<Pick<ScriptEntry, 'path' | 'type' | 'scriptTypeMode'>>,
    ): string | null {
        for (const script of scripts) {
            const warning = this.getUnsupportedAutoWarning(script)
            if (warning) return warning
        }

        return null
    }
}
