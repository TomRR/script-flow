import type { ScriptEntry } from '../../../../renderer.d'

export interface ReorderResult {
    success: boolean
    error?: string
}

export class DragAndDropScriptService {
    /**
     * Gets sorted scripts by placement - utility method shared across components
     */
    static getSortedScripts(scripts: ScriptEntry[]): ScriptEntry[] {
        return [...scripts].sort((a, b) => a.placement - b.placement)
    }

    /**
     * Reorders scripts by moving a script from one index to another.
     * Updates the placement values of all affected scripts.
     *
     * @param scripts - Current array of scripts
     * @param fromIndex - The index of the script to move
     * @param toIndex - The target index to move the script to
     * @returns The reordered array of scripts with updated placement values
     */
    static reorderScripts(scripts: ScriptEntry[], fromIndex: number, toIndex: number): ScriptEntry[] {
        if (
            fromIndex === toIndex ||
            fromIndex < 0 ||
            fromIndex >= scripts.length ||
            toIndex < 0 ||
            toIndex >= scripts.length
        ) {
            return [...scripts]
        }

        // Get scripts sorted by placement first
        const sortedScripts = this.getSortedScripts(scripts)
        const reorderedScripts = [...sortedScripts]
        const [movedScript] = reorderedScripts.splice(fromIndex, 1)
        reorderedScripts.splice(toIndex, 0, movedScript)

        // Update placement values to reflect new order
        return reorderedScripts.map((script, index) => ({
            ...script,
            placement: index,
        }))
    }

    /**
     * Persists script reordering to the backend.
     *
     * @param sectionId - The ID of the section containing the workflow
     * @param subSectionKey - The key of the subsection (workflow) containing the scripts
     * @param fromIndex - The index of the script to move
     * @param toIndex - The target index to move the script to
     * @returns A promise that resolves to a ReorderResult
     */
    static async persistScriptReorder(
        sectionId: string,
        subSectionKey: string,
        fromIndex: number,
        toIndex: number,
    ): Promise<ReorderResult> {
        try {
            const success = await window.api.vault.reorderScripts(sectionId, subSectionKey, fromIndex, toIndex)
            return { success }
        } catch (error) {
            console.error('Failed to persist script reorder:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }
        }
    }
}
