import { StartupWorkflowSelectionService } from './startup-workflow-selection-service'
import type { Section } from '../../../../renderer.d'

describe('StartupWorkflowSelectionService', () => {
    test('selects the first workflow by section and workflow placement', () => {
        const sections: Section[] = [
            {
                id: 'section-1',
                title: 'Top Section',
                placement: 0,
                'sub-sections': {
                    'workflow-2': { title: 'Second Workflow', placement: 1 },
                    'workflow-1': { title: 'First Workflow', placement: 0 },
                },
            },
            {
                id: 'section-2',
                title: 'Second Section',
                placement: 1,
                'sub-sections': {
                    'workflow-3': { title: 'Later Workflow', placement: 0 },
                },
            },
        ]

        const result = StartupWorkflowSelectionService.getInitialSelectedPage(sections)

        expect(result).toEqual({
            sectionId: 'section-1',
            subSectionKey: 'workflow-1',
            title: 'First Workflow',
        })
    })

    test('skips sections without workflows', () => {
        const sections: Section[] = [
            {
                id: 'empty-section',
                title: 'Empty Section',
                placement: 0,
                'sub-sections': {},
            },
            {
                id: 'section-with-workflow',
                title: 'Section With Workflow',
                placement: 1,
                'sub-sections': {
                    'workflow-1': { title: 'Available Workflow', placement: 0 },
                },
            },
        ]

        const result = StartupWorkflowSelectionService.getInitialSelectedPage(sections)

        expect(result).toEqual({
            sectionId: 'section-with-workflow',
            subSectionKey: 'workflow-1',
            title: 'Available Workflow',
        })
    })

    test('returns null when no workflows exist', () => {
        const sections: Section[] = [
            {
                id: 'section-1',
                title: 'Section 1',
                placement: 0,
                'sub-sections': {},
            },
            {
                id: 'section-2',
                title: 'Section 2',
                placement: 1,
                'sub-sections': {},
            },
        ]

        const result = StartupWorkflowSelectionService.getInitialSelectedPage(sections)

        expect(result).toBeNull()
    })

    test('handles unsorted section and workflow data', () => {
        const sections: Section[] = [
            {
                id: 'section-2',
                title: 'Second Section',
                placement: 1,
                'sub-sections': {
                    'workflow-3': { title: 'Later Workflow', placement: 0 },
                },
            },
            {
                id: 'section-1',
                title: 'First Section',
                placement: 0,
                'sub-sections': {
                    'workflow-2': { title: 'Second Workflow', placement: 2 },
                    'workflow-1': { title: 'Top Workflow', placement: 0 },
                },
            },
        ]

        const result = StartupWorkflowSelectionService.getInitialSelectedPage(sections)

        expect(result).toEqual({
            sectionId: 'section-1',
            subSectionKey: 'workflow-1',
            title: 'Top Workflow',
        })
    })
})
