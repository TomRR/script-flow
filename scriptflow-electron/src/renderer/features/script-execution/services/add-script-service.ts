import type { ScriptEntry } from '../../../../renderer'
import { ScriptTypeDetectorService } from './script-type-detector-service'

function getExtension(filePath: string): string {
    const lastDotIndex = filePath.lastIndexOf('.')
    if (lastDotIndex === -1) {
        return ''
    }
    return filePath.substring(lastDotIndex).toLowerCase()
}

function getBaseName(filePath: string): string {
    const lastSlashIndex = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
    const fileName = lastSlashIndex === -1 ? filePath : filePath.substring(lastSlashIndex + 1)
    const lastDotIndex = fileName.lastIndexOf('.')
    if (lastDotIndex === -1) {
        return fileName
    }
    return fileName.substring(0, lastDotIndex)
}

export interface AddScriptResult {
    success: ScriptEntry[]
    failed: string[]
}

export class AddScriptService {
    static async addScriptsFromFiles(
        sectionId: string,
        subSectionKey: string,
        filePaths: string[],
    ): Promise<AddScriptResult> {
        const success: ScriptEntry[] = []
        const failed: string[] = []

        for (const filePath of filePaths) {
            try {
                const script = await this.addSingleScript(sectionId, subSectionKey, filePath)
                if (script) {
                    success.push(script)
                } else {
                    failed.push(filePath)
                }
            } catch {
                failed.push(filePath)
            }
        }

        return { success, failed }
    }

    static async addSingleScript(
        sectionId: string,
        subSectionKey: string,
        filePath: string,
    ): Promise<ScriptEntry | null> {
        const type = ScriptTypeDetectorService.detectType(filePath)
        const name = this.generateScriptName(filePath)

        return window.api.vault.addScriptToSubSection(sectionId, subSectionKey, {
            type,
            path: filePath,
            name,
            placement: 0,
        })
    }

    static generateScriptName(filePath: string): string {
        return getBaseName(filePath)
    }

    static getValidScriptExtensions(): string[] {
        return ['.sh', '.bash', '.ps1', '.ps', '.py', '.cs', '.bat', '.cmd']
    }

    static isValidScriptExtension(filePath: string): boolean {
        const extension = getExtension(filePath)
        return this.getValidScriptExtensions().includes(extension)
    }

    static filterValidScriptFiles(filePaths: string[]): string[] {
        return filePaths.filter((filePath) => this.isValidScriptExtension(filePath))
    }
}
