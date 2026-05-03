import { ScriptNameEditorService } from './script-name-editor-service'

describe('ScriptNameEditorService', () => {
    describe('createInitialState', () => {
        it('should create state with empty value when no script name provided', () => {
            const state = ScriptNameEditorService.createInitialState()
            expect(state.isEditing).toBe(false)
            expect(state.value).toBe('')
        })

        it('should create state with script name as initial value', () => {
            const state = ScriptNameEditorService.createInitialState('My Script')
            expect(state.isEditing).toBe(false)
            expect(state.value).toBe('My Script')
        })
    })

    describe('startEditing', () => {
        it('should set isEditing to true and use provided script name', () => {
            const result = ScriptNameEditorService.startEditing('Test Script')
            expect(result.isEditing).toBe(true)
            expect(result.value).toBe('Test Script')
        })

        it('should use empty string when no script name provided', () => {
            const result = ScriptNameEditorService.startEditing()
            expect(result.isEditing).toBe(true)
            expect(result.value).toBe('')
        })
    })

    describe('updateValue', () => {
        it('should return the new value', () => {
            const result = ScriptNameEditorService.updateValue('old', 'new')
            expect(result).toBe('new')
        })

        it('should handle empty string', () => {
            const result = ScriptNameEditorService.updateValue('old', '')
            expect(result).toBe('')
        })
    })

    describe('saveName', () => {
        it('should return name with trimmed value when valid', () => {
            const result = ScriptNameEditorService.saveName('  My Script  ')
            expect(result.name).toBe('My Script')
        })

        it('should return undefined when value is empty string', () => {
            const result = ScriptNameEditorService.saveName('')
            expect(result.name).toBeUndefined()
        })

        it('should return undefined when value is only whitespace', () => {
            const result = ScriptNameEditorService.saveName('   ')
            expect(result.name).toBeUndefined()
        })

        it('should return name as-is when no extra whitespace', () => {
            const result = ScriptNameEditorService.saveName('ExactName')
            expect(result.name).toBe('ExactName')
        })
    })

    describe('cancelEditing', () => {
        it('should set isEditing to false and reset to script name', () => {
            const result = ScriptNameEditorService.cancelEditing('Original Name')
            expect(result.isEditing).toBe(false)
            expect(result.value).toBe('Original Name')
        })

        it('should reset to empty string when no script name provided', () => {
            const result = ScriptNameEditorService.cancelEditing()
            expect(result.isEditing).toBe(false)
            expect(result.value).toBe('')
        })
    })

    describe('isValidName', () => {
        it('should return true for non-empty string', () => {
            expect(ScriptNameEditorService.isValidName('Valid')).toBe(true)
        })

        it('should return false for empty string', () => {
            expect(ScriptNameEditorService.isValidName('')).toBe(false)
        })

        it('should return false for whitespace-only string', () => {
            expect(ScriptNameEditorService.isValidName('   ')).toBe(false)
        })

        it('should return true for string with leading/trailing whitespace', () => {
            expect(ScriptNameEditorService.isValidName('  Valid  ')).toBe(true)
        })
    })
})
