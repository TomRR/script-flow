export type ScriptType = 'bash' | 'csharp' | 'python' | 'powershell' | 'custom'

const EXTENSION_TO_TYPE_MAP: Record<string, ScriptType> = {
    '.sh': 'bash',
    '.bash': 'bash',
    '.ps1': 'powershell',
    '.ps': 'powershell',
    '.py': 'python',
    '.cs': 'csharp',
    '.bat': 'custom',
    '.cmd': 'custom',
}

function getExtension(filePath: string): string {
    const lastDotIndex = filePath.lastIndexOf('.')
    if (lastDotIndex === -1) {
        return ''
    }
    return filePath.substring(lastDotIndex).toLowerCase()
}

export class ScriptTypeDetectorService {
    static detectType(filePath: string): ScriptType {
        const extension = getExtension(filePath)
        return EXTENSION_TO_TYPE_MAP[extension] || 'custom'
    }
}
