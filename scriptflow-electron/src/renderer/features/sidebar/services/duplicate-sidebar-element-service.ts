import type { Section, SubSection } from '../../../../renderer.d'

export class DuplicateSidebarElementService {
    static async duplicateSection(id: string): Promise<Section | null> {
        return window.api.vault.duplicateSection(id)
    }

    static async duplicateSubSection(
        sectionId: string,
        subSectionKey: string,
    ): Promise<{ key: string; subSection: SubSection } | null> {
        return window.api.vault.duplicateSubSection(sectionId, subSectionKey)
    }
}
