export class OutputClipboardService {
    static async copyOutput(output: string): Promise<boolean> {
        if (!output) {
            return false
        }

        try {
            await navigator.clipboard.writeText(output)
            return true
        } catch (error) {
            console.error('Failed to copy output:', error)
            return false
        }
    }
}
