import { AppIconService } from '../src/main/app-icon-service'

async function main(): Promise<void> {
    try {
        await AppIconService.ensureWindowsIconAssets()
    } catch (error) {
        console.error('Failed to generate Windows app icon:', error)
        process.exitCode = 1
    }
}

void main()
