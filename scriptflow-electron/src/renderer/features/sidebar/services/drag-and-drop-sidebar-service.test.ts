import { DragAndDropSidebarService } from './drag-and-drop-sidebar-service'
import type { Section, SubSection } from '../../../../renderer.d'

describe('DragAndDropSidebarService', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('reorderSections', () => {
        test('should reorder sections by moving first to second position', () => {
            const sections: Section[] = [
                { id: '1', title: 'Section 1', placement: 0, 'sub-sections': {} },
                { id: '2', title: 'Section 2', placement: 1, 'sub-sections': {} },
                { id: '3', title: 'Section 3', placement: 2, 'sub-sections': {} },
            ]

            const result = DragAndDropSidebarService.reorderSections(sections, 0, 1)

            expect(result.map((s) => s.id)).toEqual(['2', '1', '3'])
            expect(result.map((s) => s.placement)).toEqual([0, 1, 2])
        })

        test('should reorder sections by moving last to first position', () => {
            const sections: Section[] = [
                { id: '1', title: 'Section 1', placement: 0, 'sub-sections': {} },
                { id: '2', title: 'Section 2', placement: 1, 'sub-sections': {} },
                { id: '3', title: 'Section 3', placement: 2, 'sub-sections': {} },
            ]

            const result = DragAndDropSidebarService.reorderSections(sections, 2, 0)

            expect(result.map((s) => s.id)).toEqual(['3', '1', '2'])
            expect(result.map((s) => s.placement)).toEqual([0, 1, 2])
        })

        test('should reorder sections by moving middle to end', () => {
            const sections: Section[] = [
                { id: '1', title: 'Section 1', placement: 0, 'sub-sections': {} },
                { id: '2', title: 'Section 2', placement: 1, 'sub-sections': {} },
                { id: '3', title: 'Section 3', placement: 2, 'sub-sections': {} },
            ]

            const result = DragAndDropSidebarService.reorderSections(sections, 1, 2)

            expect(result.map((s) => s.id)).toEqual(['1', '3', '2'])
            expect(result.map((s) => s.placement)).toEqual([0, 1, 2])
        })

        test('should return same order when fromIndex equals toIndex', () => {
            const sections: Section[] = [
                { id: '1', title: 'Section 1', placement: 0, 'sub-sections': {} },
                { id: '2', title: 'Section 2', placement: 1, 'sub-sections': {} },
            ]

            const result = DragAndDropSidebarService.reorderSections(sections, 1, 1)

            expect(result.map((s) => s.id)).toEqual(['1', '2'])
        })

        test('should handle invalid fromIndex gracefully', () => {
            const sections: Section[] = [
                { id: '1', title: 'Section 1', placement: 0, 'sub-sections': {} },
                { id: '2', title: 'Section 2', placement: 1, 'sub-sections': {} },
            ]

            const result = DragAndDropSidebarService.reorderSections(sections, -1, 0)

            expect(result.map((s) => s.id)).toEqual(['1', '2'])
        })

        test('should handle invalid toIndex gracefully', () => {
            const sections: Section[] = [
                { id: '1', title: 'Section 1', placement: 0, 'sub-sections': {} },
                { id: '2', title: 'Section 2', placement: 1, 'sub-sections': {} },
            ]

            const result = DragAndDropSidebarService.reorderSections(sections, 0, 5)

            expect(result.map((s) => s.id)).toEqual(['1', '2'])
        })

        test('should not mutate original array', () => {
            const sections: Section[] = [
                { id: '1', title: 'Section 1', placement: 0, 'sub-sections': {} },
                { id: '2', title: 'Section 2', placement: 1, 'sub-sections': {} },
            ]

            const result = DragAndDropSidebarService.reorderSections(sections, 0, 1)

            expect(sections.map((s) => s.id)).toEqual(['1', '2'])
            expect(result.map((s) => s.id)).toEqual(['2', '1'])
        })
    })

    describe('reorderWorkflows', () => {
        test('should reorder workflows by moving first to second position', () => {
            const workflows: [string, SubSection][] = [
                ['key1', { title: 'Workflow 1', placement: 0 }],
                ['key2', { title: 'Workflow 2', placement: 1 }],
                ['key3', { title: 'Workflow 3', placement: 2 }],
            ]

            const result = DragAndDropSidebarService.reorderWorkflows(workflows, 0, 1)

            expect(result.map(([key]) => key)).toEqual(['key2', 'key1', 'key3'])
            expect(result.map(([_, sub]) => sub.placement)).toEqual([0, 1, 2])
        })

        test('should reorder workflows by moving last to first position', () => {
            const workflows: [string, SubSection][] = [
                ['key1', { title: 'Workflow 1', placement: 0 }],
                ['key2', { title: 'Workflow 2', placement: 1 }],
                ['key3', { title: 'Workflow 3', placement: 2 }],
            ]

            const result = DragAndDropSidebarService.reorderWorkflows(workflows, 2, 0)

            expect(result.map(([key]) => key)).toEqual(['key3', 'key1', 'key2'])
            expect(result.map(([_, sub]) => sub.placement)).toEqual([0, 1, 2])
        })

        test('should return same order when fromIndex equals toIndex', () => {
            const workflows: [string, SubSection][] = [
                ['key1', { title: 'Workflow 1', placement: 0 }],
                ['key2', { title: 'Workflow 2', placement: 1 }],
            ]

            const result = DragAndDropSidebarService.reorderWorkflows(workflows, 1, 1)

            expect(result.map(([key]) => key)).toEqual(['key1', 'key2'])
        })

        test('should handle invalid indices gracefully', () => {
            const workflows: [string, SubSection][] = [
                ['key1', { title: 'Workflow 1', placement: 0 }],
                ['key2', { title: 'Workflow 2', placement: 1 }],
            ]

            const result = DragAndDropSidebarService.reorderWorkflows(workflows, -1, 0)

            expect(result.map(([key]) => key)).toEqual(['key1', 'key2'])
        })

        test('should not mutate original array', () => {
            const workflows: [string, SubSection][] = [
                ['key1', { title: 'Workflow 1', placement: 0 }],
                ['key2', { title: 'Workflow 2', placement: 1 }],
            ]

            const result = DragAndDropSidebarService.reorderWorkflows(workflows, 0, 1)

            expect(workflows.map(([key]) => key)).toEqual(['key1', 'key2'])
            expect(result.map(([key]) => key)).toEqual(['key2', 'key1'])
        })
    })

    describe('moveWorkflowToSection', () => {
        test('should move workflow from source to target section', () => {
            const sourceSection: Section = {
                id: 'section1',
                title: 'Source Section',
                placement: 0,
                'sub-sections': {
                    wf1: { title: 'Workflow 1', placement: 0 },
                    wf2: { title: 'Workflow 2', placement: 1 },
                },
            }

            const targetSection: Section = {
                id: 'section2',
                title: 'Target Section',
                placement: 1,
                'sub-sections': {
                    wf3: { title: 'Workflow 3', placement: 0 },
                },
            }

            const result = DragAndDropSidebarService.moveWorkflowToSection(sourceSection, targetSection, 'wf1', 0)

            // Check source section
            expect(Object.keys(result.sourceSection['sub-sections'])).toEqual(['wf2'])
            expect(result.sourceSection['sub-sections']['wf2'].placement).toBe(0)

            // Check target section
            expect(Object.keys(result.targetSection['sub-sections'])).toContain('wf1')
            expect(Object.keys(result.targetSection['sub-sections'])).toContain('wf3')
            expect(result.targetSection['sub-sections']['wf1'].placement).toBe(0)
            expect(result.targetSection['sub-sections']['wf3'].placement).toBe(1)
        })

        test('should move workflow to end when targetIndex not specified', () => {
            const sourceSection: Section = {
                id: 'section1',
                title: 'Source Section',
                placement: 0,
                'sub-sections': {
                    wf1: { title: 'Workflow 1', placement: 0 },
                },
            }

            const targetSection: Section = {
                id: 'section2',
                title: 'Target Section',
                placement: 1,
                'sub-sections': {
                    wf2: { title: 'Workflow 2', placement: 0 },
                    wf3: { title: 'Workflow 3', placement: 1 },
                },
            }

            const result = DragAndDropSidebarService.moveWorkflowToSection(sourceSection, targetSection, 'wf1')

            const targetKeys = Object.entries(result.targetSection['sub-sections'])
                .sort((a, b) => a[1].placement - b[1].placement)
                .map(([key]) => key)

            expect(targetKeys).toEqual(['wf2', 'wf3', 'wf1'])
        })

        test('should renormalize placements in source section after removal', () => {
            const sourceSection: Section = {
                id: 'section1',
                title: 'Source Section',
                placement: 0,
                'sub-sections': {
                    wf1: { title: 'Workflow 1', placement: 0 },
                    wf2: { title: 'Workflow 2', placement: 1 },
                    wf3: { title: 'Workflow 3', placement: 2 },
                },
            }

            const targetSection: Section = {
                id: 'section2',
                title: 'Target Section',
                placement: 1,
                'sub-sections': {},
            }

            const result = DragAndDropSidebarService.moveWorkflowToSection(sourceSection, targetSection, 'wf2', 0)

            // Remaining workflows should be renumbered
            expect(result.sourceSection['sub-sections']['wf1'].placement).toBe(0)
            expect(result.sourceSection['sub-sections']['wf3'].placement).toBe(1)
        })

        test('should not modify sections when workflow key does not exist', () => {
            const sourceSection: Section = {
                id: 'section1',
                title: 'Source Section',
                placement: 0,
                'sub-sections': {
                    wf1: { title: 'Workflow 1', placement: 0 },
                },
            }

            const targetSection: Section = {
                id: 'section2',
                title: 'Target Section',
                placement: 1,
                'sub-sections': {},
            }

            const result = DragAndDropSidebarService.moveWorkflowToSection(
                sourceSection,
                targetSection,
                'nonexistent',
                0,
            )

            expect(result.sourceSection).toEqual(sourceSection)
            expect(result.targetSection).toEqual(targetSection)
        })

        test('should handle moving workflow to same section', () => {
            const section: Section = {
                id: 'section1',
                title: 'Section',
                placement: 0,
                'sub-sections': {
                    wf1: { title: 'Workflow 1', placement: 0 },
                    wf2: { title: 'Workflow 2', placement: 1 },
                    wf3: { title: 'Workflow 3', placement: 2 },
                },
            }

            // Move wf1 to index 2 (after wf3)
            const result = DragAndDropSidebarService.moveWorkflowToSection(section, section, 'wf1', 2)

            const sortedWorkflows = Object.entries(result.targetSection['sub-sections']).sort(
                (a, b) => a[1].placement - b[1].placement,
            )

            const keys = sortedWorkflows.map(([key]) => key)
            const placements = sortedWorkflows.map(([_, sub]) => sub.placement)
            expect(keys).toEqual(['wf2', 'wf3', 'wf1'])
            expect(placements).toEqual([0, 1, 2])
        })

        test('should handle workflows with scripts', () => {
            const sourceSection: Section = {
                id: 'section1',
                title: 'Source Section',
                placement: 0,
                'sub-sections': {
                    wf1: {
                        title: 'Workflow 1',
                        placement: 0,
                        scripts: [{ id: 'script1', type: 'bash', path: '/test.sh', placement: 0 }],
                    },
                },
            }

            const targetSection: Section = {
                id: 'section2',
                title: 'Target Section',
                placement: 1,
                'sub-sections': {},
            }

            const result = DragAndDropSidebarService.moveWorkflowToSection(sourceSection, targetSection, 'wf1', 0)

            expect(result.targetSection['sub-sections']['wf1'].scripts).toEqual([
                { id: 'script1', type: 'bash', path: '/test.sh', placement: 0 },
            ])
        })
    })

    describe('persistSectionReorder', () => {
        test('should call window.api.vault.reorderSections with correct parameters', async () => {
            const mockReorderSections = jest.fn().mockResolvedValue(true)
            ;(window as any).api = {
                vault: {
                    reorderSections: mockReorderSections,
                },
            }

            const result = await DragAndDropSidebarService.persistSectionReorder(0, 2)

            expect(mockReorderSections).toHaveBeenCalledWith(0, 2)
            expect(result.success).toBe(true)
        })

        test('should handle errors and return error message', async () => {
            const mockReorderSections = jest.fn().mockRejectedValue(new Error('Network error'))
            ;(window as any).api = {
                vault: {
                    reorderSections: mockReorderSections,
                },
            }

            const result = await DragAndDropSidebarService.persistSectionReorder(0, 2)

            expect(result.success).toBe(false)
            expect(result.error).toBe('Network error')
        })

        test('should handle non-Error exceptions', async () => {
            const mockReorderSections = jest.fn().mockRejectedValue('String error')
            ;(window as any).api = {
                vault: {
                    reorderSections: mockReorderSections,
                },
            }

            const result = await DragAndDropSidebarService.persistSectionReorder(0, 2)

            expect(result.success).toBe(false)
            expect(result.error).toBe('Unknown error')
        })
    })

    describe('persistWorkflowReorder', () => {
        test('should call window.api.vault.reorderWorkflows with correct parameters', async () => {
            const mockReorderWorkflows = jest.fn().mockResolvedValue(true)
            ;(window as any).api = {
                vault: {
                    reorderWorkflows: mockReorderWorkflows,
                },
            }

            const result = await DragAndDropSidebarService.persistWorkflowReorder('section-1', 1, 3)

            expect(mockReorderWorkflows).toHaveBeenCalledWith('section-1', 1, 3)
            expect(result.success).toBe(true)
        })

        test('should handle errors and return error message', async () => {
            const mockReorderWorkflows = jest.fn().mockRejectedValue(new Error('Failed to persist'))
            ;(window as any).api = {
                vault: {
                    reorderWorkflows: mockReorderWorkflows,
                },
            }

            const result = await DragAndDropSidebarService.persistWorkflowReorder('section-1', 0, 1)

            expect(result.success).toBe(false)
            expect(result.error).toBe('Failed to persist')
        })
    })

    describe('persistWorkflowMove', () => {
        test('should call window.api.vault.moveWorkflow with correct parameters', async () => {
            const mockMoveWorkflow = jest.fn().mockResolvedValue(true)
            ;(window as any).api = {
                vault: {
                    moveWorkflow: mockMoveWorkflow,
                },
            }

            const result = await DragAndDropSidebarService.persistWorkflowMove(
                'workflow-key',
                'section-a',
                'section-b',
                2,
            )

            expect(mockMoveWorkflow).toHaveBeenCalledWith('workflow-key', 'section-a', 'section-b', 2)
            expect(result.success).toBe(true)
        })

        test('should handle errors and return error message', async () => {
            const mockMoveWorkflow = jest.fn().mockRejectedValue(new Error('Move failed'))
            ;(window as any).api = {
                vault: {
                    moveWorkflow: mockMoveWorkflow,
                },
            }

            const result = await DragAndDropSidebarService.persistWorkflowMove(
                'workflow-key',
                'section-a',
                'section-b',
                0,
            )

            expect(result.success).toBe(false)
            expect(result.error).toBe('Move failed')
        })
    })
})
