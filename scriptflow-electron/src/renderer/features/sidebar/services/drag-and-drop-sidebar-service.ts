import type { Section, SubSection } from '../../../../renderer.d'

export interface ReorderResult {
    success: boolean
    error?: string
}

export class DragAndDropSidebarService {
    /**
     * Gets sorted subsections by placement - utility method shared across components
     */
    static getSortedSubSections(subSections: Record<string, SubSection>): [string, SubSection][] {
        return Object.entries(subSections).sort((a, b) => a[1].placement - b[1].placement)
    }

    /**
     * Reorders sections by moving a section from one index to another.
     * Updates the placement values of all affected sections.
     *
     * @param sections - Current array of sections
     * @param fromIndex - The index of the section to move
     * @param toIndex - The target index to move the section to
     * @returns The reordered array of sections with updated placement values
     */
    static reorderSections(sections: Section[], fromIndex: number, toIndex: number): Section[] {
        if (
            fromIndex === toIndex ||
            fromIndex < 0 ||
            fromIndex >= sections.length ||
            toIndex < 0 ||
            toIndex >= sections.length
        ) {
            return [...sections]
        }

        const reorderedSections = [...sections]
        const [movedSection] = reorderedSections.splice(fromIndex, 1)
        reorderedSections.splice(toIndex, 0, movedSection)

        // Update placement values to reflect new order
        return reorderedSections.map((section, index) => ({
            ...section,
            placement: index,
        }))
    }

    /**
     * Reorders workflows within a section by moving a workflow from one index to another.
     * Updates the placement values of all affected workflows.
     *
     * @param workflows - Array of workflow entries (key and subsection)
     * @param fromIndex - The index of the workflow to move
     * @param toIndex - The target index to move the workflow to
     * @returns The reordered array of workflow entries with updated placement values
     */
    static reorderWorkflows(
        workflows: [string, SubSection][],
        fromIndex: number,
        toIndex: number,
    ): [string, SubSection][] {
        if (
            fromIndex === toIndex ||
            fromIndex < 0 ||
            fromIndex >= workflows.length ||
            toIndex < 0 ||
            toIndex >= workflows.length
        ) {
            return [...workflows]
        }

        const reorderedWorkflows = [...workflows]
        const [movedWorkflow] = reorderedWorkflows.splice(fromIndex, 1)
        reorderedWorkflows.splice(toIndex, 0, movedWorkflow)

        // Update placement values to reflect new order
        return reorderedWorkflows.map(([key, subSection], index) => [
            key,
            {
                ...subSection,
                placement: index,
            },
        ]) as [string, SubSection][]
    }

    /**
     * Moves a workflow from one section to another.
     * Removes the workflow from the source section and adds it to the target section.
     *
     * @param sourceSection - The section containing the workflow to move
     * @param targetSection - The section to move the workflow to
     * @param workflowKey - The key of the workflow to move
     * @param targetIndex - The index to insert the workflow at in the target section (defaults to end)
     * @returns An object containing the updated source and target sections
     */
    static moveWorkflowToSection(
        sourceSection: Section,
        targetSection: Section,
        workflowKey: string,
        targetIndex?: number,
    ): { sourceSection: Section; targetSection: Section } {
        const workflow = sourceSection['sub-sections'][workflowKey]
        if (!workflow) {
            return { sourceSection, targetSection }
        }

        // If moving within the same section, use reorderWorkflows instead
        if (sourceSection.id === targetSection.id) {
            const sortedWorkflows = this.getSortedSubSections(sourceSection['sub-sections'])
            const fromIndex = sortedWorkflows.findIndex(([key]) => key === workflowKey)
            const toIndex = targetIndex !== undefined ? targetIndex : sortedWorkflows.length - 1

            if (fromIndex === -1) {
                return { sourceSection, targetSection }
            }

            const reorderedWorkflows = this.reorderWorkflows(sortedWorkflows, fromIndex, toIndex)
            const reorderedSubSections: Record<string, SubSection> = {}
            reorderedWorkflows.forEach(([key, subSection]) => {
                reorderedSubSections[key] = subSection
            })

            return {
                sourceSection: {
                    ...sourceSection,
                    'sub-sections': reorderedSubSections,
                },
                targetSection: {
                    ...targetSection,
                    'sub-sections': reorderedSubSections,
                },
            }
        }

        // Moving between different sections
        // Create updated source section without the workflow
        const sourceSubSections = { ...sourceSection['sub-sections'] }
        delete sourceSubSections[workflowKey]

        // Renormalize source section placements
        const sortedSourceWorkflows = Object.entries(sourceSubSections).sort((a, b) => a[1].placement - b[1].placement)
        const normalizedSourceSubSections: Record<string, SubSection> = {}
        sortedSourceWorkflows.forEach(([key, subSection], index) => {
            normalizedSourceSubSections[key] = {
                ...subSection,
                placement: index,
            }
        })

        // Add workflow to target section
        const targetSubSections = { ...targetSection['sub-sections'] }
        const targetWorkflows = Object.entries(targetSubSections).sort((a, b) => a[1].placement - b[1].placement)

        const effectiveTargetIndex =
            targetIndex !== undefined ? Math.min(targetIndex, targetWorkflows.length) : targetWorkflows.length

        // Insert the workflow at the target index
        targetWorkflows.splice(effectiveTargetIndex, 0, [workflowKey, workflow])

        // Renormalize target section placements
        const normalizedTargetSubSections: Record<string, SubSection> = {}
        targetWorkflows.forEach(([key, subSection], index) => {
            normalizedTargetSubSections[key] = {
                ...subSection,
                placement: index,
            }
        })

        return {
            sourceSection: {
                ...sourceSection,
                'sub-sections': normalizedSourceSubSections,
            },
            targetSection: {
                ...targetSection,
                'sub-sections': normalizedTargetSubSections,
            },
        }
    }

    /**
     * Persists section reordering to the backend.
     *
     * @param fromIndex - The index of the section to move
     * @param toIndex - The target index to move the section to
     * @returns A promise that resolves to a ReorderResult
     */
    static async persistSectionReorder(fromIndex: number, toIndex: number): Promise<ReorderResult> {
        try {
            const success = await window.api.vault.reorderSections(fromIndex, toIndex)
            return { success }
        } catch (error) {
            console.error('Failed to persist section reorder:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }
        }
    }

    /**
     * Persists workflow reordering within a section to the backend.
     *
     * @param sectionId - The ID of the section containing the workflows
     * @param fromIndex - The index of the workflow to move
     * @param toIndex - The target index to move the workflow to
     * @returns A promise that resolves to a ReorderResult
     */
    static async persistWorkflowReorder(sectionId: string, fromIndex: number, toIndex: number): Promise<ReorderResult> {
        try {
            const success = await window.api.vault.reorderWorkflows(sectionId, fromIndex, toIndex)
            return { success }
        } catch (error) {
            console.error('Failed to persist workflow reorder:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }
        }
    }

    /**
     * Persists moving a workflow from one section to another.
     *
     * @param workflowKey - The key of the workflow to move
     * @param fromSectionId - The ID of the source section
     * @param toSectionId - The ID of the target section
     * @param toIndex - The index to insert the workflow at in the target section
     * @returns A promise that resolves to a ReorderResult
     */
    static async persistWorkflowMove(
        workflowKey: string,
        fromSectionId: string,
        toSectionId: string,
        toIndex: number,
    ): Promise<ReorderResult> {
        try {
            const success = await window.api.vault.moveWorkflow(workflowKey, fromSectionId, toSectionId, toIndex)
            return { success }
        } catch (error) {
            console.error('Failed to persist workflow move:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }
        }
    }
}
