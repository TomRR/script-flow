export type ScriptType = 'bash' | 'csharp' | 'python' | 'powershell' | 'custom'
export type BuiltInScriptType = Exclude<ScriptType, 'custom'>

const BUILT_IN_EXTENSION_TO_TYPE_MAP: Record<string, BuiltInScriptType> = {
    '.sh': 'bash',
    '.bash': 'bash',
    '.ps1': 'powershell',
    '.ps': 'powershell',
    '.py': 'python',
    '.cs': 'csharp',
    '.csproj': 'csharp',
}

const CUSTOM_EXTENSION_TO_TYPE_MAP: Record<string, ScriptType> = {
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
    static detectBuiltInType(filePath: string): BuiltInScriptType | null {
        const extension = getExtension(filePath)
        return BUILT_IN_EXTENSION_TO_TYPE_MAP[extension] || null
    }

    static detectType(filePath: string): ScriptType {
        const extension = getExtension(filePath)
        return this.detectBuiltInType(filePath) || CUSTOM_EXTENSION_TO_TYPE_MAP[extension] || 'custom'
    }
}
