import type { ScriptEntry } from '../../../../renderer.d'
import { MultiValueVariableService } from './multi-value-variable-service'

export interface EnvEditState {
    editingEnvKey: string | null
    newEnvKey: string
    newEnvValue: string
}

export interface SecretEditState {
    editingSecretName: string | null
}

export interface EditFormState {
    isAddingEnv: boolean
    isAddingSecret: boolean
    envEditState: EnvEditState
    secretEditState: SecretEditState
}

export class EnvSecretEditorService {
    static createInitialState(): EditFormState {
        return {
            isAddingEnv: false,
            isAddingSecret: false,
            envEditState: {
                editingEnvKey: null,
                newEnvKey: '',
                newEnvValue: '',
            },
            secretEditState: {
                editingSecretName: null,
            },
        }
    }

    static startAddingEnv(): Partial<EditFormState> {
        return {
            isAddingEnv: true,
            isAddingSecret: false,
            envEditState: {
                editingEnvKey: null,
                newEnvKey: '',
                newEnvValue: '',
            },
            secretEditState: {
                editingSecretName: null,
            },
        }
    }

    static startAddingSecret(): Partial<EditFormState> {
        return {
            isAddingEnv: false,
            isAddingSecret: true,
            envEditState: {
                editingEnvKey: null,
                newEnvKey: '',
                newEnvValue: '',
            },
            secretEditState: {
                editingSecretName: null,
            },
        }
    }

    static startEditingEnv(script: ScriptEntry, key: string): Partial<EditFormState> {
        const envValue = script.env?.[key]
        const displayValue = MultiValueVariableService.getCurrentValue(envValue)

        return {
            isAddingEnv: true,
            isAddingSecret: false,
            envEditState: {
                editingEnvKey: key,
                newEnvKey: key,
                newEnvValue: displayValue,
            },
            secretEditState: {
                editingSecretName: null,
            },
        }
    }

    static startEditingSecret(secretName: string): Partial<EditFormState> {
        return {
            isAddingEnv: false,
            isAddingSecret: true,
            envEditState: {
                editingEnvKey: null,
                newEnvKey: '',
                newEnvValue: '',
            },
            secretEditState: {
                editingSecretName: secretName,
            },
        }
    }

    static cancelEditing(): Partial<EditFormState> {
        return {
            isAddingEnv: false,
            isAddingSecret: false,
            envEditState: {
                editingEnvKey: null,
                newEnvKey: '',
                newEnvValue: '',
            },
            secretEditState: {
                editingSecretName: null,
            },
        }
    }

    static updateEnvKey(currentState: EnvEditState, key: string): EnvEditState {
        return {
            ...currentState,
            newEnvKey: key,
        }
    }

    static updateEnvValue(currentState: EnvEditState, value: string): EnvEditState {
        return {
            ...currentState,
            newEnvValue: value,
        }
    }

    static saveEnv(script: ScriptEntry, key: string, value: string): Pick<ScriptEntry, 'env'> | null {
        if (!key.trim()) {
            return null
        }

        const staticValue = MultiValueVariableService.createStatic(value)

        return {
            env: {
                ...(script.env || {}),
                [key.trim()]: staticValue,
            },
        }
    }

    static updateEnv(script: ScriptEntry, editingKey: string, newValue: string): Pick<ScriptEntry, 'env'> | null {
        if (!editingKey || !newValue) {
            return null
        }

        const staticValue = MultiValueVariableService.createStatic(newValue)

        return {
            env: {
                ...(script.env || {}),
                [editingKey]: staticValue,
            },
        }
    }

    static removeEnv(script: ScriptEntry, key: string): Pick<ScriptEntry, 'env'> {
        const updatedEnv = { ...(script.env || {}) }
        delete updatedEnv[key]
        return { env: updatedEnv }
    }

    static saveSecret(script: ScriptEntry, secretName: string): Pick<ScriptEntry, 'secrets'> | null {
        if (!secretName) {
            return null
        }

        const updatedSecrets = [...(script.secrets || [])]
        if (!updatedSecrets.includes(secretName)) {
            updatedSecrets.push(secretName)
        }

        return { secrets: updatedSecrets }
    }

    static updateSecret(
        script: ScriptEntry,
        editingSecretName: string,
        newSecretName: string,
    ): Pick<ScriptEntry, 'secrets'> | null {
        if (!editingSecretName || !newSecretName) {
            return null
        }

        return {
            secrets: (script.secrets || []).map((s: string) => (s === editingSecretName ? newSecretName : s)),
        }
    }

    static removeSecret(script: ScriptEntry, secretName: string): Pick<ScriptEntry, 'secrets'> {
        return {
            secrets: (script.secrets || []).filter((s: string) => s !== secretName),
        }
    }

    static isEditingEnv(state: EditFormState): boolean {
        return state.isAddingEnv && state.envEditState.editingEnvKey !== null
    }

    static isAddingNewEnv(state: EditFormState): boolean {
        return state.isAddingEnv && state.envEditState.editingEnvKey === null
    }

    static isEditingSecret(state: EditFormState): boolean {
        return state.isAddingSecret && state.secretEditState.editingSecretName !== null
    }

    static isAddingNewSecret(state: EditFormState): boolean {
        return state.isAddingSecret && state.secretEditState.editingSecretName === null
    }

    static getFilteredAvailableSecrets(
        availableSecrets: string[],
        currentSecrets: string[],
        editingSecretName: string | null,
    ): string[] {
        if (editingSecretName) {
            return availableSecrets.filter((s) => s !== editingSecretName)
        }
        return availableSecrets.filter((s) => !currentSecrets.includes(s))
    }

    static hasAvailableSecrets(
        availableSecrets: string[],
        currentSecrets: string[],
        editingSecretName: string | null,
    ): boolean {
        return this.getFilteredAvailableSecrets(availableSecrets, currentSecrets, editingSecretName).length > 0
    }
}
