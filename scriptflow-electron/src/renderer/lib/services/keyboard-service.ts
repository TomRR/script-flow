export class KeyboardService {
    static registerWorkflowStop(callback: () => void): () => void {
        const handleKeyDown = (event: KeyboardEvent) => {
            const isMac = navigator.platform.toLowerCase().includes('mac')
            const modifierKey = isMac ? event.metaKey : event.ctrlKey

            if (modifierKey && event.key.toLowerCase() === 'c') {
                event.preventDefault()
                callback()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }
}
