import type { Section, SubSection } from '../../../../renderer.d'
import type { SelectedPage } from '../types'

export class StartupWorkflowSelectionService {
    static getInitialSelectedPage(sections: Section[]): SelectedPage | null {
        const sortedSections = [...sections].sort((a, b) => a.placement - b.placement)

        for (const section of sortedSections) {
            const subSections = section['sub-sections']

            if (!subSections || Array.isArray(subSections)) {
                continue
            }

            const firstWorkflow = StartupWorkflowSelectionService.getFirstWorkflow(subSections)
            if (firstWorkflow) {
                const [subSectionKey, subSection] = firstWorkflow
                return {
                    sectionId: section.id,
                    subSectionKey,
                    title: subSection.title,
                }
            }
        }

        return null
    }

    private static getFirstWorkflow(subSections: Record<string, SubSection>): [string, SubSection] | null {
        const sortedWorkflows = Object.entries(subSections).sort((a, b) => a[1].placement - b[1].placement)
        return sortedWorkflows[0] ?? null
    }
}
