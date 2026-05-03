import { AppIconService } from '../src/main/app-icon-service'

async function main(): Promise<void> {
    try {
        await AppIconService.ensureMacIconAssets()
    } catch (error) {
        console.error('Failed to generate macOS app icon:', error)
        process.exitCode = 1
    }
}

void main()
