import { ScriptFileEditorService } from './script-file-editor-service'

describe('ScriptFileEditorService', () => {
    const mockRead = jest.fn()
    const mockWrite = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
        // Setup mock window.api
        ;(window as any).api = {
            file: {
                read: mockRead,
                write: mockWrite,
            },
        }
    })

    describe('createInitialState', () => {
        test('returns initial state with default values', () => {
            const state = ScriptFileEditorService.createInitialState()

            expect(state).toEqual({
                isOpen: false,
                filePath: '',
                fileContent: '',
                originalContent: '',
                isLoading: false,
                error: null,
                saveSuccess: false,
            })
        })
    })

    describe('openEditor', () => {
        test('returns error when path is empty', async () => {
            const state = await ScriptFileEditorService.openEditor('')

            expect(state.error).toBe('No file path specified')
            expect(state.isOpen).toBe(false)
        })

        test('opens editor successfully when file is read', async () => {
            const mockContent = '#!/bin/bash\necho "Hello"'
            mockRead.mockResolvedValue({ content: mockContent })

            const state = await ScriptFileEditorService.openEditor('test.sh')

            expect(mockRead).toHaveBeenCalledWith('test.sh')
            expect(state.isOpen).toBe(true)
            expect(state.filePath).toBe('test.sh')
            expect(state.fileContent).toBe(mockContent)
            expect(state.originalContent).toBe(mockContent)
            expect(state.error).toBeNull()
        })

        test('handles file not found error', async () => {
            mockRead.mockResolvedValue({ content: null, error: 'File not found' })

            const state = await ScriptFileEditorService.openEditor('missing.sh')

            expect(state.error).toBe('File not found')
            expect(state.isOpen).toBe(false)
        })
    })

    describe('closeEditor', () => {
        test('returns initial state', () => {
            const state = ScriptFileEditorService.closeEditor()

            expect(state.isOpen).toBe(false)
            expect(state.fileContent).toBe('')
            expect(state.filePath).toBe('')
        })
    })

    describe('updateContent', () => {
        test('updates file content', () => {
            const initialState = ScriptFileEditorService.createInitialState()
            initialState.filePath = 'test.sh'
            initialState.originalContent = 'original'

            const newState = ScriptFileEditorService.updateContent(initialState, 'new content')

            expect(newState.fileContent).toBe('new content')
            expect(newState.error).toBeNull()
        })
    })

    describe('saveFile', () => {
        test('returns error when no file path', async () => {
            const state = ScriptFileEditorService.createInitialState()

            const result = await ScriptFileEditorService.saveFile(state)

            expect(result.error).toBe('No file path specified')
        })

        test('saves file successfully', async () => {
            mockWrite.mockResolvedValue({ success: true })

            const state = ScriptFileEditorService.createInitialState()
            state.filePath = 'test.sh'
            state.fileContent = 'new content'

            const result = await ScriptFileEditorService.saveFile(state)

            expect(mockWrite).toHaveBeenCalledWith('test.sh', 'new content')
            expect(result.saveSuccess).toBe(true)
            expect(result.originalContent).toBe('new content')
        })

        test('handles write error', async () => {
            mockWrite.mockResolvedValue({ success: false, error: 'Permission denied' })

            const state = ScriptFileEditorService.createInitialState()
            state.filePath = 'test.sh'
            state.fileContent = 'content'

            const result = await ScriptFileEditorService.saveFile(state)

            expect(result.error).toBe('Permission denied')
            expect(result.saveSuccess).toBe(false)
        })
    })

    describe('getFilename', () => {
        test('returns filename from path', () => {
            expect(ScriptFileEditorService.getFilename('path/to/test.sh')).toBe('test.sh')
        })

        test('returns path when no slashes', () => {
            expect(ScriptFileEditorService.getFilename('test.sh')).toBe('test.sh')
        })

        test('returns empty string for empty path', () => {
            expect(ScriptFileEditorService.getFilename('')).toBe('')
        })
    })

    describe('hasChanges', () => {
        test('returns true when content differs from original', () => {
            const state = ScriptFileEditorService.createInitialState()
            state.fileContent = 'changed'
            state.originalContent = 'original'

            expect(ScriptFileEditorService.hasChanges(state)).toBe(true)
        })

        test('returns false when content matches original', () => {
            const state = ScriptFileEditorService.createInitialState()
            state.fileContent = 'same'
            state.originalContent = 'same'

            expect(ScriptFileEditorService.hasChanges(state)).toBe(false)
        })
    })
})
