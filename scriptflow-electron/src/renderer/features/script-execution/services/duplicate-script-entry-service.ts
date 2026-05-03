import type { ScriptEntry } from '../../../../renderer.d'

export class DuplicateScriptEntryService {
    static async duplicateScriptInSubSection(
        sectionId: string,
        subSectionKey: string,
        scriptId: string,
    ): Promise<ScriptEntry | null> {
        return window.api.vault.duplicateScriptInSubSection(sectionId, subSectionKey, scriptId)
    }
}
