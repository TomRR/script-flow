import { EnvSecretEditorService } from './env-secret-editor-service'
import type { ScriptEntry } from '../../../../renderer.d'
import { MultiValueVariableService } from './multi-value-variable-service'

describe('EnvSecretEditorService', () => {
    describe('createInitialState', () => {
        test('returns initial state with all values reset', () => {
            const state = EnvSecretEditorService.createInitialState()

            expect(state.isAddingEnv).toBe(false)
            expect(state.isAddingSecret).toBe(false)
            expect(state.envEditState.editingEnvKey).toBeNull()
            expect(state.envEditState.newEnvKey).toBe('')
            expect(state.envEditState.newEnvValue).toBe('')
            expect(state.secretEditState.editingSecretName).toBeNull()
        })
    })

    describe('startAddingEnv', () => {
        test('returns state for adding new env var', () => {
            const updates = EnvSecretEditorService.startAddingEnv()

            expect(updates.isAddingEnv).toBe(true)
            expect(updates.isAddingSecret).toBe(false)
            expect(updates.envEditState?.editingEnvKey).toBeNull()
            expect(updates.envEditState?.newEnvKey).toBe('')
            expect(updates.envEditState?.newEnvValue).toBe('')
            expect(updates.secretEditState?.editingSecretName).toBeNull()
        })
    })

    describe('startAddingSecret', () => {
        test('returns state for adding new secret', () => {
            const updates = EnvSecretEditorService.startAddingSecret()

            expect(updates.isAddingEnv).toBe(false)
            expect(updates.isAddingSecret).toBe(true)
            expect(updates.envEditState?.editingEnvKey).toBeNull()
            expect(updates.secretEditState?.editingSecretName).toBeNull()
        })
    })

    describe('startEditingEnv', () => {
        test('returns state for editing existing env var', () => {
            const script: ScriptEntry = {
                id: '1',
                type: 'bash',
                path: '/test.sh',
                placement: 0,
                env: { MY_VAR: MultiValueVariableService.createStatic('my_value') },
            }

            const updates = EnvSecretEditorService.startEditingEnv(script, 'MY_VAR')

            expect(updates.isAddingEnv).toBe(true)
            expect(updates.isAddingSecret).toBe(false)
            expect(updates.envEditState?.editingEnvKey).toBe('MY_VAR')
            expect(updates.envEditState?.newEnvKey).toBe('MY_VAR')
            expect(updates.envEditState?.newEnvValue).toBe('my_value')
        })

        test('handles missing env value gracefully', () => {
            const script: ScriptEntry = {
                id: '1',
                type: 'bash',
                path: '/test.sh',
                placement: 0,
                env: {},
            }

            const updates = EnvSecretEditorService.startEditingEnv(script, 'MISSING_VAR')

            expect(updates.envEditState?.newEnvValue).toBe('')
        })
    })

    describe('startEditingSecret', () => {
        test('returns state for editing existing secret', () => {
            const updates = EnvSecretEditorService.startEditingSecret('my_secret')

            expect(updates.isAddingEnv).toBe(false)
            expect(updates.isAddingSecret).toBe(true)
            expect(updates.secretEditState?.editingSecretName).toBe('my_secret')
        })
    })

    describe('cancelEditing', () => {
        test('resets all editing state', () => {
            const updates = EnvSecretEditorService.cancelEditing()

            expect(updates.isAddingEnv).toBe(false)
            expect(updates.isAddingSecret).toBe(false)
            expect(updates.envEditState?.editingEnvKey).toBeNull()
            expect(updates.envEditState?.newEnvKey).toBe('')
            expect(updates.envEditState?.newEnvValue).toBe('')
            expect(updates.secretEditState?.editingSecretName).toBeNull()
        })
    })

    describe('updateEnvKey', () => {
        test('updates env key in state', () => {
            const currentState = {
                editingEnvKey: null,
                newEnvKey: '',
                newEnvValue: '',
            }

            const updated = EnvSecretEditorService.updateEnvKey(currentState, 'NEW_KEY')

            expect(updated.newEnvKey).toBe('NEW_KEY')
            expect(updated.newEnvValue).toBe('')
            expect(updated.editingEnvKey).toBeNull()
        })
    })

    describe('updateEnvValue', () => {
        test('updates env value in state', () => {
            const currentState = {
                editingEnvKey: null,
                newEnvKey: 'KEY',
                newEnvValue: '',
            }

            const updated = EnvSecretEditorService.updateEnvValue(currentState, 'new_value')

            expect(updated.newEnvValue).toBe('new_value')
            expect(updated.newEnvKey).toBe('KEY')
        })
    })

    describe('saveEnv', () => {
        test('adds new env var to script', () => {
            const script: ScriptEntry = {
                id: '1',
                type: 'bash',
                path: '/test.sh',
                placement: 0,
                env: { EXISTING: MultiValueVariableService.createStatic('value') },
            }

            const result = EnvSecretEditorService.saveEnv(script, 'NEW_VAR', 'new_value')

            expect(result).toEqual({
                env: {
                    EXISTING: MultiValueVariableService.createStatic('value'),
                    NEW_VAR: MultiValueVariableService.createStatic('new_value'),
                },
            })
        })

        test('trims key whitespace', () => {
            const script: ScriptEntry = {
                id: '1',
                type: 'bash',
                path: '/test.sh',
                placement: 0,
            }

            const result = EnvSecretEditorService.saveEnv(script, '  KEY_WITH_SPACES  ', 'value')

            expect(result?.env).toHaveProperty('KEY_WITH_SPACES')
        })

        test('returns null for empty key', () => {
            const script: ScriptEntry = {
                id: '1',
                type: 'bash',
                path: '/test.sh',
                placement: 0,
            }

            const result = EnvSecretEditorService.saveEnv(script, '', 'value')

            expect(result).toBeNull()
        })

        test('returns null for whitespace-only key', () => {
            const script: ScriptEntry = {
                id: '1',
                type: 'bash',
                path: '/test.sh',
                placement: 0,
            }

            const result = EnvSecretEditorService.saveEnv(script, '   ', 'value')

            expect(result).toBeNull()
        })
    })

    describe('updateEnv', () => {
        test('updates existing env var value', () => {
            const script: ScriptEntry = {
                id: '1',
                type: 'bash',
                path: '/test.sh',
                placement: 0,
                env: {
                    MY_VAR: MultiValueVariableService.createStatic('old_value'),
                    OTHER: MultiValueVariableService.createStatic('unchanged'),
                },
            }

            const result = EnvSecretEditorService.updateEnv(script, 'MY_VAR', 'new_value')

            expect(result).toEqual({
                env: {
                    MY_VAR: MultiValueVariableService.createStatic('new_value'),
                    OTHER: MultiValueVariableService.createStatic('unchanged'),
                },
            })
        })

        test('returns null when editingKey is null', () => {
            const script: ScriptEntry = {
                id: '1',
                type: 'bash',
                path: '/test.sh',
                placement: 0,
                env: { MY_VAR: MultiValueVariableService.createStatic('value') },
            }

            const result = EnvSecretEditorService.updateEnv(script, null as any, 'new_value')

            expect(result).toBeNull()
        })

        test('returns null when newValue is empty', () => {
            const script: ScriptEntry = {
                id: '1',
                type: 'bash',
                path: '/test.sh',
                placement: 0,
                env: { MY_VAR: MultiValueVariableService.createStatic('value') },
            }

            const result = EnvSecretEditorService.updateEnv(script, 'MY_VAR', '')

            expect(result).toBeNull()
        })
    })

    describe('removeEnv', () => {
        test('removes env var from script', () => {
            const script: ScriptEntry = {
                id: '1',
                type: 'bash',
                path: '/test.sh',
                placement: 0,
                env: {
                    KEEP: MultiValueVariableService.createStatic('value1'),
                    REMOVE: MultiValueVariableService.createStatic('value2'),
                },
            }

            const result = EnvSecretEditorService.removeEnv(script, 'REMOVE')

            expect(result).toEqual({
                env: { KEEP: MultiValueVariableService.createStatic('value1') },
            })
        })

        test('handles removing non-existent key gracefully', () => {
            const script: ScriptEntry = {
                id: '1',
                type: 'bash',
                path: '/test.sh',
                placement: 0,
                env: { EXISTING: MultiValueVariableService.createStatic('value') },
            }

            const result = EnvSecretEditorService.removeEnv(script, 'NON_EXISTENT')

            expect(result).toEqual({
                env: { EXISTING: MultiValueVariableService.createStatic('value') },
            })
        })

        test('handles empty env gracefully', () => {
            const script: ScriptEntry = {
                id: '1',
                type: 'bash',
                path: '/test.sh',
                placement: 0,
            }

            const result = EnvSecretEditorService.removeEnv(script, 'ANY')

            expect(result).toEqual({ env: {} })
        })
    })

    describe('saveSecret', () => {
        test('adds new secret to script', () => {
            const script: ScriptEntry = {
                id: '1',
                type: 'bash',
                path: '/test.sh',
                placement: 0,
                secrets: ['existing'],
            }

            const result = EnvSecretEditorService.saveSecret(script, 'new_secret')

            expect(result).toEqual({
                secrets: ['existing', 'new_secret'],
            })
        })

        test('does not add duplicate secrets', () => {
            const script: ScriptEntry = {
                id: '1',
                type: 'bash',
                path: '/test.sh',
                placement: 0,
                secrets: ['existing'],
            }

            const result = EnvSecretEditorService.saveSecret(script, 'existing')

            expect(result).toEqual({
                secrets: ['existing'],
            })
        })

        test('returns null for empty secret name', () => {
            const script: ScriptEntry = {
                id: '1',
                type: 'bash',
                path: '/test.sh',
                placement: 0,
            }

            const result = EnvSecretEditorService.saveSecret(script, '')

            expect(result).toBeNull()
        })
    })

    describe('updateSecret', () => {
        test('replaces existing secret with new one', () => {
            const script: ScriptEntry = {
                id: '1',
                type: 'bash',
                path: '/test.sh',
                placement: 0,
                secrets: ['old_secret', 'keep_this'],
            }

            const result = EnvSecretEditorService.updateSecret(script, 'old_secret', 'new_secret')

            expect(result).toEqual({
                secrets: ['new_secret', 'keep_this'],
            })
        })

        test('returns null when editingSecretName is null', () => {
            const script: ScriptEntry = {
                id: '1',
                type: 'bash',
                path: '/test.sh',
                placement: 0,
                secrets: ['secret'],
            }

            const result = EnvSecretEditorService.updateSecret(script, null as any, 'new')

            expect(result).toBeNull()
        })

        test('returns null when newSecretName is empty', () => {
            const script: ScriptEntry = {
                id: '1',
                type: 'bash',
                path: '/test.sh',
                placement: 0,
                secrets: ['secret'],
            }

            const result = EnvSecretEditorService.updateSecret(script, 'secret', '')

            expect(result).toBeNull()
        })
    })

    describe('removeSecret', () => {
        test('removes secret from script', () => {
            const script: ScriptEntry = {
                id: '1',
                type: 'bash',
                path: '/test.sh',
                placement: 0,
                secrets: ['keep', 'remove'],
            }

            const result = EnvSecretEditorService.removeSecret(script, 'remove')

            expect(result).toEqual({
                secrets: ['keep'],
            })
        })

        test('handles removing non-existent secret gracefully', () => {
            const script: ScriptEntry = {
                id: '1',
                type: 'bash',
                path: '/test.sh',
                placement: 0,
                secrets: ['existing'],
            }

            const result = EnvSecretEditorService.removeSecret(script, 'non_existent')

            expect(result).toEqual({
                secrets: ['existing'],
            })
        })

        test('handles empty secrets gracefully', () => {
            const script: ScriptEntry = {
                id: '1',
                type: 'bash',
                path: '/test.sh',
                placement: 0,
            }

            const result = EnvSecretEditorService.removeSecret(script, 'any')

            expect(result).toEqual({ secrets: [] })
        })
    })

    describe('isEditingEnv', () => {
        test('returns true when editing existing env var', () => {
            const state = {
                isAddingEnv: true,
                isAddingSecret: false,
                envEditState: {
                    editingEnvKey: 'MY_VAR',
                    newEnvKey: 'MY_VAR',
                    newEnvValue: 'value',
                },
                secretEditState: {
                    editingSecretName: null,
                },
            }

            expect(EnvSecretEditorService.isEditingEnv(state)).toBe(true)
        })

        test('returns false when adding new env var', () => {
            const state = {
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

            expect(EnvSecretEditorService.isEditingEnv(state)).toBe(false)
        })

        test('returns false when not in env mode', () => {
            const state = {
                isAddingEnv: false,
                isAddingSecret: true,
                envEditState: {
                    editingEnvKey: 'MY_VAR',
                    newEnvKey: 'MY_VAR',
                    newEnvValue: 'value',
                },
                secretEditState: {
                    editingSecretName: null,
                },
            }

            expect(EnvSecretEditorService.isEditingEnv(state)).toBe(false)
        })
    })

    describe('isAddingNewEnv', () => {
        test('returns true when adding new env var', () => {
            const state = {
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

            expect(EnvSecretEditorService.isAddingNewEnv(state)).toBe(true)
        })

        test('returns false when editing existing env var', () => {
            const state = {
                isAddingEnv: true,
                isAddingSecret: false,
                envEditState: {
                    editingEnvKey: 'MY_VAR',
                    newEnvKey: 'MY_VAR',
                    newEnvValue: 'value',
                },
                secretEditState: {
                    editingSecretName: null,
                },
            }

            expect(EnvSecretEditorService.isAddingNewEnv(state)).toBe(false)
        })
    })

    describe('isEditingSecret', () => {
        test('returns true when editing existing secret', () => {
            const state = {
                isAddingEnv: false,
                isAddingSecret: true,
                envEditState: {
                    editingEnvKey: null,
                    newEnvKey: '',
                    newEnvValue: '',
                },
                secretEditState: {
                    editingSecretName: 'my_secret',
                },
            }

            expect(EnvSecretEditorService.isEditingSecret(state)).toBe(true)
        })

        test('returns false when adding new secret', () => {
            const state = {
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

            expect(EnvSecretEditorService.isEditingSecret(state)).toBe(false)
        })
    })

    describe('isAddingNewSecret', () => {
        test('returns true when adding new secret', () => {
            const state = {
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

            expect(EnvSecretEditorService.isAddingNewSecret(state)).toBe(true)
        })
    })

    describe('getFilteredAvailableSecrets', () => {
        test('filters out already used secrets when adding', () => {
            const available = ['secret1', 'secret2', 'secret3']
            const current = ['secret1']

            const result = EnvSecretEditorService.getFilteredAvailableSecrets(available, current, null)

            expect(result).toEqual(['secret2', 'secret3'])
        })

        test('filters out editing secret when editing', () => {
            const available = ['secret1', 'secret2', 'secret3']
            const current = ['secret1', 'secret2']

            const result = EnvSecretEditorService.getFilteredAvailableSecrets(available, current, 'secret2')

            expect(result).toEqual(['secret1', 'secret3'])
        })

        test('returns all secrets when editing one not in current', () => {
            const available = ['secret1', 'secret2', 'secret3']
            const current = ['secret1']

            const result = EnvSecretEditorService.getFilteredAvailableSecrets(available, current, 'secret2')

            expect(result).toEqual(['secret1', 'secret3'])
        })
    })

    describe('hasAvailableSecrets', () => {
        test('returns true when secrets are available', () => {
            const available = ['secret1', 'secret2']
            const current = ['secret1']

            expect(EnvSecretEditorService.hasAvailableSecrets(available, current, null)).toBe(true)
        })

        test('returns false when no secrets available', () => {
            const available = ['secret1']
            const current = ['secret1']

            expect(EnvSecretEditorService.hasAvailableSecrets(available, current, null)).toBe(false)
        })

        test('returns true when editing and other secrets available', () => {
            const available = ['secret1', 'secret2']
            const current = ['secret1', 'secret2']

            expect(EnvSecretEditorService.hasAvailableSecrets(available, current, 'secret1')).toBe(true)
        })
    })
})
