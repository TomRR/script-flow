export interface NameEditState {
    isEditing: boolean
    value: string
}

export interface NameEditResult {
    name?: string
}

export class ScriptNameEditorService {
    static createInitialState(scriptName?: string): NameEditState {
        return {
            isEditing: false,
            value: scriptName || '',
        }
    }

    static startEditing(scriptName?: string): Partial<NameEditState> {
        return {
            isEditing: true,
            value: scriptName || '',
        }
    }

    static updateValue(_currentValue: string, newValue: string): string {
        return newValue
    }

    static saveName(value: string): NameEditResult {
        const trimmedName = value.trim()
        return {
            name: trimmedName || undefined,
        }
    }

    static cancelEditing(scriptName?: string): Partial<NameEditState> {
        return {
            isEditing: false,
            value: scriptName || '',
        }
    }

    static isValidName(value: string): boolean {
        return value.trim().length > 0
    }
}
