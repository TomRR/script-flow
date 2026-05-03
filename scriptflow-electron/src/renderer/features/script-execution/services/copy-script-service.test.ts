import { CopyScriptService, CopyScriptResult } from './copy-script-service'
import type { ScriptEntry, EnvValue } from '../../../../renderer.d'
import { MultiValueVariableService } from './multi-value-variable-service'

describe('CopyScriptService', () => {
    const createScript = (overrides: Partial<ScriptEntry> = {}): ScriptEntry => ({
        id: '1',
        type: 'bash',
        path: '/test/script.sh',
        placement: 0,
        ...overrides,
    })

    describe('hasEnvConflict', () => {
        it('should return false when target has no env', () => {
            const script = createScript()
            expect(CopyScriptService.hasEnvConflict(script, 'TOKEN')).toBe(false)
        })

        it('should return false when env key does not exist', () => {
            const script = createScript({ env: { OTHER_KEY: MultiValueVariableService.createStatic('value') } })
            expect(CopyScriptService.hasEnvConflict(script, 'TOKEN')).toBe(false)
        })

        it('should return true when env key exists', () => {
            const script = createScript({ env: { TOKEN: MultiValueVariableService.createStatic('secret123') } })
            expect(CopyScriptService.hasEnvConflict(script, 'TOKEN')).toBe(true)
        })
    })

    describe('hasSecretConflict', () => {
        it('should return false when target has no secrets', () => {
            const script = createScript()
            expect(CopyScriptService.hasSecretConflict(script, 'API_KEY')).toBe(false)
        })

        it('should return false when secret is not in list', () => {
            const script = createScript({ secrets: ['DB_PASS'] })
            expect(CopyScriptService.hasSecretConflict(script, 'API_KEY')).toBe(false)
        })

        it('should return true when secret is in list', () => {
            const script = createScript({ secrets: ['API_KEY', 'DB_PASS'] })
            expect(CopyScriptService.hasSecretConflict(script, 'API_KEY')).toBe(true)
        })
    })

    describe('copyEnvVar', () => {
        it('should return success when no conflict', () => {
            const scripts: ScriptEntry[] = [
                createScript({ id: '1', name: 'Source' }),
                createScript({ id: '2', name: 'Target' }),
            ]

            const envValue = MultiValueVariableService.createStatic('value123')
            const result = CopyScriptService.copyEnvVar(scripts, '1', 'TOKEN', envValue, '2')

            expect(result.success).toBe(true)
            expect(result.conflict).toBeUndefined()
            expect(result.updatedScript).toBeDefined()
            expect(result.updatedScript?.env?.TOKEN).toEqual(envValue)
        })

        it('should return conflict when env key exists in target', () => {
            const scripts: ScriptEntry[] = [
                createScript({ id: '1', name: 'Source' }),
                createScript({
                    id: '2',
                    name: 'Target',
                    env: { TOKEN: MultiValueVariableService.createStatic('oldValue') },
                }),
            ]

            const newValue = MultiValueVariableService.createStatic('newValue')
            const result = CopyScriptService.copyEnvVar(scripts, '1', 'TOKEN', newValue, '2')

            expect(result.success).toBe(false)
            expect(result.conflict).toBeDefined()
            expect(result.conflict?.type).toBe('env')
            expect(result.conflict?.key).toBe('TOKEN')
            expect(result.conflict?.targetScriptId).toBe('2')
            expect(result.conflict?.targetScriptName).toBe('Target')
            expect(result.updatedScript).toBeUndefined()
        })

        it('should return failure when target script not found', () => {
            const scripts: ScriptEntry[] = [createScript({ id: '1', name: 'Source' })]

            const envValue = MultiValueVariableService.createStatic('value')
            const result = CopyScriptService.copyEnvVar(scripts, '1', 'TOKEN', envValue, '999')

            expect(result.success).toBe(false)
            expect(result.conflict).toBeUndefined()
            expect(result.updatedScript).toBeUndefined()
        })

        it('should preserve existing env vars in target', () => {
            const scripts: ScriptEntry[] = [
                createScript({ id: '1', name: 'Source' }),
                createScript({
                    id: '2',
                    name: 'Target',
                    env: { OTHER: MultiValueVariableService.createStatic('keepme') },
                }),
            ]

            const newValue = MultiValueVariableService.createStatic('value123')
            const result = CopyScriptService.copyEnvVar(scripts, '1', 'TOKEN', newValue, '2')

            expect(result.success).toBe(true)
            expect(result.updatedScript?.env?.OTHER).toEqual(MultiValueVariableService.createStatic('keepme'))
            expect(result.updatedScript?.env?.TOKEN).toEqual(newValue)
        })
    })

    describe('copySecret', () => {
        it('should return success when no conflict', () => {
            const scripts: ScriptEntry[] = [
                createScript({ id: '1', name: 'Source', secrets: ['API_KEY'] }),
                createScript({ id: '2', name: 'Target' }),
            ]

            const result = CopyScriptService.copySecret(scripts, '1', 'API_KEY', '2')

            expect(result.success).toBe(true)
            expect(result.conflict).toBeUndefined()
            expect(result.updatedScript).toBeDefined()
            expect(result.updatedScript?.secrets).toContain('API_KEY')
        })

        it('should return conflict when secret already exists in target', () => {
            const scripts: ScriptEntry[] = [
                createScript({ id: '1', name: 'Source', secrets: ['API_KEY'] }),
                createScript({ id: '2', name: 'Target', secrets: ['API_KEY'] }),
            ]

            const result = CopyScriptService.copySecret(scripts, '1', 'API_KEY', '2')

            expect(result.success).toBe(false)
            expect(result.conflict).toBeDefined()
            expect(result.conflict?.type).toBe('secret')
            expect(result.conflict?.key).toBe('API_KEY')
            expect(result.conflict?.targetScriptId).toBe('2')
            expect(result.conflict?.targetScriptName).toBe('Target')
        })

        it('should return failure when target script not found', () => {
            const scripts: ScriptEntry[] = [createScript({ id: '1', name: 'Source', secrets: ['API_KEY'] })]

            const result = CopyScriptService.copySecret(scripts, '1', 'API_KEY', '999')

            expect(result.success).toBe(false)
            expect(result.conflict).toBeUndefined()
        })

        it('should preserve existing secrets in target', () => {
            const scripts: ScriptEntry[] = [
                createScript({ id: '1', name: 'Source', secrets: ['API_KEY'] }),
                createScript({ id: '2', name: 'Target', secrets: ['DB_PASS'] }),
            ]

            const result = CopyScriptService.copySecret(scripts, '1', 'API_KEY', '2')

            expect(result.success).toBe(true)
            expect(result.updatedScript?.secrets).toContain('DB_PASS')
            expect(result.updatedScript?.secrets).toContain('API_KEY')
        })

        it('should return conflict when secret already exists even with duplicate in source', () => {
            const scripts: ScriptEntry[] = [
                createScript({ id: '1', name: 'Source', secrets: ['API_KEY', 'API_KEY'] }),
                createScript({ id: '2', name: 'Target', secrets: ['DB_PASS'] }),
            ]

            const result = CopyScriptService.copySecret(scripts, '1', 'API_KEY', '2')

            expect(result.success).toBe(true)
            expect(result.updatedScript?.secrets).toEqual(['DB_PASS', 'API_KEY'])
        })
    })

    describe('performCopyWithOverwrite', () => {
        it('should overwrite env var in target', () => {
            const scripts: ScriptEntry[] = [
                createScript({ id: '1', env: { TOKEN: MultiValueVariableService.createStatic('old') } }),
                createScript({ id: '2', env: { TOKEN: MultiValueVariableService.createStatic('targetOld') } }),
            ]

            const newValue = MultiValueVariableService.createStatic('newValue')
            const result = CopyScriptService.performCopyWithOverwrite(scripts, 'env', 'TOKEN', newValue, '2')

            expect(result).toBeDefined()
            expect(result?.env?.TOKEN).toEqual(newValue)
        })

        it('should add secret to target', () => {
            const scripts: ScriptEntry[] = [
                createScript({ id: '1', secrets: ['API_KEY'] }),
                createScript({ id: '2', secrets: ['DB_PASS'] }),
            ]

            const emptyValue = MultiValueVariableService.createStatic('')
            const result = CopyScriptService.performCopyWithOverwrite(scripts, 'secret', 'API_KEY', emptyValue, '2')

            expect(result).toBeDefined()
            expect(result?.secrets).toContain('API_KEY')
            expect(result?.secrets).toContain('DB_PASS')
        })

        it('should return null when target script not found', () => {
            const scripts: ScriptEntry[] = [createScript({ id: '1' })]

            const envValue = MultiValueVariableService.createStatic('value')
            const result = CopyScriptService.performCopyWithOverwrite(scripts, 'env', 'TOKEN', envValue, '999')

            expect(result).toBeNull()
        })
    })
})
