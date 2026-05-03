import { DragAndDropScriptService } from './drag-and-drop-script-service'
import type { ScriptEntry } from '../../../../renderer.d'
import { MultiValueVariableService } from './multi-value-variable-service'

describe('DragAndDropScriptService', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('getSortedScripts', () => {
        test('should return scripts sorted by placement', () => {
            const scripts: ScriptEntry[] = [
                { id: '1', type: 'bash', path: '/test1.sh', placement: 2 },
                { id: '2', type: 'bash', path: '/test2.sh', placement: 0 },
                { id: '3', type: 'bash', path: '/test3.sh', placement: 1 },
            ]

            const result = DragAndDropScriptService.getSortedScripts(scripts)

            expect(result.map((s) => s.id)).toEqual(['2', '3', '1'])
        })

        test('should not mutate original array', () => {
            const scripts: ScriptEntry[] = [
                { id: '1', type: 'bash', path: '/test1.sh', placement: 1 },
                { id: '2', type: 'bash', path: '/test2.sh', placement: 0 },
            ]

            const result = DragAndDropScriptService.getSortedScripts(scripts)

            expect(scripts[0].placement).toBe(1)
            expect(scripts[1].placement).toBe(0)
            expect(result[0].id).toBe('2')
        })
    })

    describe('reorderScripts', () => {
        test('should reorder scripts by moving first to second position', () => {
            const scripts: ScriptEntry[] = [
                { id: '1', type: 'bash', path: '/test1.sh', placement: 0 },
                { id: '2', type: 'bash', path: '/test2.sh', placement: 1 },
                { id: '3', type: 'bash', path: '/test3.sh', placement: 2 },
            ]

            const result = DragAndDropScriptService.reorderScripts(scripts, 0, 1)

            expect(result.map((s) => s.id)).toEqual(['2', '1', '3'])
            expect(result.map((s) => s.placement)).toEqual([0, 1, 2])
        })

        test('should reorder scripts by moving last to first position', () => {
            const scripts: ScriptEntry[] = [
                { id: '1', type: 'bash', path: '/test1.sh', placement: 0 },
                { id: '2', type: 'bash', path: '/test2.sh', placement: 1 },
                { id: '3', type: 'bash', path: '/test3.sh', placement: 2 },
            ]

            const result = DragAndDropScriptService.reorderScripts(scripts, 2, 0)

            expect(result.map((s) => s.id)).toEqual(['3', '1', '2'])
            expect(result.map((s) => s.placement)).toEqual([0, 1, 2])
        })

        test('should reorder scripts by moving middle to end', () => {
            const scripts: ScriptEntry[] = [
                { id: '1', type: 'bash', path: '/test1.sh', placement: 0 },
                { id: '2', type: 'bash', path: '/test2.sh', placement: 1 },
                { id: '3', type: 'bash', path: '/test3.sh', placement: 2 },
            ]

            const result = DragAndDropScriptService.reorderScripts(scripts, 1, 2)

            expect(result.map((s) => s.id)).toEqual(['1', '3', '2'])
            expect(result.map((s) => s.placement)).toEqual([0, 1, 2])
        })

        test('should handle scripts with unsorted placements', () => {
            const scripts: ScriptEntry[] = [
                { id: '1', type: 'bash', path: '/test1.sh', placement: 2 },
                { id: '2', type: 'bash', path: '/test2.sh', placement: 0 },
                { id: '3', type: 'bash', path: '/test3.sh', placement: 1 },
            ]

            // Move from index 0 (which is id '2' when sorted) to index 2
            const result = DragAndDropScriptService.reorderScripts(scripts, 0, 2)

            // After sorting by placement: ['2', '3', '1']
            // Move index 0 ('2') to index 2: ['3', '1', '2']
            expect(result.map((s) => s.id)).toEqual(['3', '1', '2'])
            expect(result.map((s) => s.placement)).toEqual([0, 1, 2])
        })

        test('should return same order when fromIndex equals toIndex', () => {
            const scripts: ScriptEntry[] = [
                { id: '1', type: 'bash', path: '/test1.sh', placement: 0 },
                { id: '2', type: 'bash', path: '/test2.sh', placement: 1 },
            ]

            const result = DragAndDropScriptService.reorderScripts(scripts, 1, 1)

            expect(result.map((s) => s.id)).toEqual(['1', '2'])
            expect(result.map((s) => s.placement)).toEqual([0, 1])
        })

        test('should handle invalid fromIndex gracefully', () => {
            const scripts: ScriptEntry[] = [
                { id: '1', type: 'bash', path: '/test1.sh', placement: 0 },
                { id: '2', type: 'bash', path: '/test2.sh', placement: 1 },
            ]

            const result = DragAndDropScriptService.reorderScripts(scripts, -1, 0)

            expect(result.map((s) => s.id)).toEqual(['1', '2'])
        })

        test('should handle invalid toIndex gracefully', () => {
            const scripts: ScriptEntry[] = [
                { id: '1', type: 'bash', path: '/test1.sh', placement: 0 },
                { id: '2', type: 'bash', path: '/test2.sh', placement: 1 },
            ]

            const result = DragAndDropScriptService.reorderScripts(scripts, 0, 5)

            expect(result.map((s) => s.id)).toEqual(['1', '2'])
        })

        test('should not mutate original array', () => {
            const scripts: ScriptEntry[] = [
                { id: '1', type: 'bash', path: '/test1.sh', placement: 0 },
                { id: '2', type: 'bash', path: '/test2.sh', placement: 1 },
            ]

            const result = DragAndDropScriptService.reorderScripts(scripts, 0, 1)

            expect(scripts.map((s) => s.id)).toEqual(['1', '2'])
            expect(scripts.map((s) => s.placement)).toEqual([0, 1])
            expect(result.map((s) => s.id)).toEqual(['2', '1'])
        })

        test('should preserve all script properties', () => {
            const scripts: ScriptEntry[] = [
                {
                    id: '1',
                    name: 'Script 1',
                    type: 'bash',
                    path: '/test1.sh',
                    customCommand: 'echo test',
                    env: { KEY: MultiValueVariableService.createStatic('value') },
                    secrets: ['secret1'],
                    successCondition: { type: 'contains', value: 'success', enabled: true },
                    placement: 0,
                },
                { id: '2', type: 'python', path: '/test2.py', placement: 1 },
            ]

            const result = DragAndDropScriptService.reorderScripts(scripts, 0, 1)

            expect(result[1].name).toBe('Script 1')
            expect(result[1].customCommand).toBe('echo test')
            expect(result[1].env).toEqual({ KEY: MultiValueVariableService.createStatic('value') })
            expect(result[1].secrets).toEqual(['secret1'])
            expect(result[1].successCondition).toEqual({ type: 'contains', value: 'success', enabled: true })
        })
    })

    describe('persistScriptReorder', () => {
        test('should call window.api.vault.reorderScripts with correct parameters', async () => {
            const mockReorderScripts = jest.fn().mockResolvedValue(true)
            ;(window as any).api = {
                vault: {
                    reorderScripts: mockReorderScripts,
                },
            }

            const result = await DragAndDropScriptService.persistScriptReorder('section-1', 'workflow-1', 0, 2)

            expect(mockReorderScripts).toHaveBeenCalledWith('section-1', 'workflow-1', 0, 2)
            expect(result.success).toBe(true)
        })

        test('should handle errors and return error message', async () => {
            const mockReorderScripts = jest.fn().mockRejectedValue(new Error('Network error'))
            ;(window as any).api = {
                vault: {
                    reorderScripts: mockReorderScripts,
                },
            }

            const result = await DragAndDropScriptService.persistScriptReorder('section-1', 'workflow-1', 0, 1)

            expect(result.success).toBe(false)
            expect(result.error).toBe('Network error')
        })

        test('should handle non-Error exceptions', async () => {
            const mockReorderScripts = jest.fn().mockRejectedValue('String error')
            ;(window as any).api = {
                vault: {
                    reorderScripts: mockReorderScripts,
                },
            }

            const result = await DragAndDropScriptService.persistScriptReorder('section-1', 'workflow-1', 0, 1)

            expect(result.success).toBe(false)
            expect(result.error).toBe('Unknown error')
        })
    })
})
