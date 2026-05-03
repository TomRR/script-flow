import type { IElectronAPI } from '../../../../renderer.d'

export interface ScriptFileEditorState {
    isOpen: boolean
    filePath: string
    fileContent: string
    originalContent: string
    isLoading: boolean
    error: string | null
    saveSuccess: boolean
}

// Extend Window interface for file API
declare global {
    interface Window {
        api: IElectronAPI
    }
}

export class ScriptFileEditorService {
    static createInitialState(): ScriptFileEditorState {
        return {
            isOpen: false,
            filePath: '',
            fileContent: '',
            originalContent: '',
            isLoading: false,
            error: null,
            saveSuccess: false,
        }
    }

    static async openEditor(path: string): Promise<ScriptFileEditorState> {
        if (!path) {
            return {
                ...ScriptFileEditorService.createInitialState(),
                error: 'No file path specified',
            }
        }

        const result = await window.api.file.read(path)

        if (result.error) {
            return {
                ...ScriptFileEditorService.createInitialState(),
                error: result.error,
            }
        }

        return {
            isOpen: true,
            filePath: path,
            fileContent: result.content || '',
            originalContent: result.content || '',
            isLoading: false,
            error: null,
            saveSuccess: false,
        }
    }

    static closeEditor(): ScriptFileEditorState {
        return ScriptFileEditorService.createInitialState()
    }

    static updateContent(currentState: ScriptFileEditorState, content: string): ScriptFileEditorState {
        return {
            ...currentState,
            fileContent: content,
            error: null,
            saveSuccess: false,
        }
    }

    static async saveFile(currentState: ScriptFileEditorState): Promise<ScriptFileEditorState> {
        if (!currentState.filePath) {
            return {
                ...currentState,
                error: 'No file path specified',
            }
        }

        const result = await window.api.file.write(currentState.filePath, currentState.fileContent)

        if (result.error) {
            return {
                ...currentState,
                error: result.error,
            }
        }

        return {
            ...currentState,
            originalContent: currentState.fileContent,
            error: null,
            saveSuccess: true,
        }
    }

    static dismissSuccess(currentState: ScriptFileEditorState): ScriptFileEditorState {
        return {
            ...currentState,
            saveSuccess: false,
        }
    }

    static getFilename(path: string): string {
        if (!path) return ''
        const parts = path.split('/')
        return parts[parts.length - 1] || path
    }

    static hasChanges(currentState: ScriptFileEditorState): boolean {
        return currentState.fileContent !== currentState.originalContent
    }
}
