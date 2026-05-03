import type { ScriptEntry, EnvValue } from '../../../../renderer.d'

export interface CopyScriptResult {
    success: boolean
    conflict?: {
        type: 'env' | 'secret'
        key: string
        targetScriptId: string
        targetScriptName: string
        currentValue?: EnvValue
    }
    updatedScript?: ScriptEntry
}

export class CopyScriptService {
    static hasEnvConflict(script: ScriptEntry, key: string): boolean {
        return !!(script.env && key in script.env)
    }

    static hasSecretConflict(script: ScriptEntry, secretName: string): boolean {
        return !!(script.secrets && script.secrets.includes(secretName))
    }

    static copyEnvVar(
        scripts: ScriptEntry[],
        _sourceScriptId: string,
        key: string,
        envValue: EnvValue,
        targetScriptId: string,
    ): CopyScriptResult {
        const targetScript = scripts.find((s) => s.id === targetScriptId)
        if (!targetScript) {
            return { success: false }
        }

        if (this.hasEnvConflict(targetScript, key)) {
            return {
                success: false,
                conflict: {
                    type: 'env',
                    key,
                    targetScriptId,
                    targetScriptName: targetScript.name || 'Unnamed Script',
                    currentValue: targetScript.env?.[key],
                },
            }
        }

        const updatedTarget: ScriptEntry = {
            ...targetScript,
            env: { ...(targetScript.env || {}), [key]: envValue },
        }

        return { success: true, updatedScript: updatedTarget }
    }

    static copySecret(
        scripts: ScriptEntry[],
        _sourceScriptId: string,
        secretName: string,
        targetScriptId: string,
    ): CopyScriptResult {
        const targetScript = scripts.find((s) => s.id === targetScriptId)
        if (!targetScript) {
            return { success: false }
        }

        if (this.hasSecretConflict(targetScript, secretName)) {
            return {
                success: false,
                conflict: {
                    type: 'secret',
                    key: secretName,
                    targetScriptId,
                    targetScriptName: targetScript.name || 'Unnamed Script',
                },
            }
        }

        const updatedTarget: ScriptEntry = {
            ...targetScript,
            secrets: [...new Set([...(targetScript.secrets || []), secretName])],
        }

        return { success: true, updatedScript: updatedTarget }
    }

    static performCopyWithOverwrite(
        scripts: ScriptEntry[],
        type: 'env' | 'secret',
        key: string,
        envValue: EnvValue,
        targetScriptId: string,
    ): ScriptEntry | null {
        const targetScript = scripts.find((s) => s.id === targetScriptId)
        if (!targetScript) return null

        if (type === 'env') {
            return {
                ...targetScript,
                env: { ...(targetScript.env || {}), [key]: envValue },
            }
        }

        return {
            ...targetScript,
            secrets: [...new Set([...(targetScript.secrets || []), key])],
        }
    }
}
