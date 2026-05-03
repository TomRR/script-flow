import type { AppRuntimeInfo } from './shared/app-runtime-info'
import type { AppUpdateActionResult, AppUpdateState } from './shared/app-update-state'

export type ConditionType = 'contains' | 'equals' | 'startsWith' | 'endsWith'

export interface ConditionConfig {
    type: ConditionType
    value: string
    enabled: boolean
    /** @deprecated Use ScriptEntry.outputPass instead */
    setEnvVar?: boolean
    /** @deprecated Use ScriptEntry.outputPass instead */
    envVarName?: string
}

export interface OutputPassConfig {
    enabled: boolean
    envVarName: string
    stdoutOnly?: boolean
}

export interface StaticEnvValue {
    type: 'static'
    value: string
}

export interface MultiValueEnvVariable {
    type: 'multi-value'
    display: 'dropdown' | 'radio'
    values: string[]
    defaultValue: number
}

export type EnvValue = StaticEnvValue | MultiValueEnvVariable

export interface ScriptEntry {
    id: string
    name?: string
    type: 'bash' | 'csharp' | 'python' | 'powershell' | 'custom'
    path: string
    customCommand?: string
    env?: Record<string, EnvValue>
    secrets?: string[]
    successCondition?: ConditionConfig
    outputPass?: OutputPassConfig
    placement: number
}

export interface SubSection {
    title: string
    placement: number
    scripts?: ScriptEntry[]
}

export interface Section {
    id: string
    title: string
    'sub-sections': Record<string, SubSection>
    placement: number
}

// Multi-vault support types
export interface VaultMetadata {
    id: string
    name: string
    path: string
    exists: boolean
}

export interface VaultsConfig {
    activeVaultId: string | null
    vaults: VaultMetadata[]
}

export interface VaultApi {
    checkConfig: () => Promise<string | null>
    select: () => Promise<string | null>
    init: (vaultPath: string, name?: string) => Promise<boolean>
    openConfigDirectory: () => Promise<void>
    getSections: () => Promise<Section[]>
    addSection: (title: string) => Promise<Section | null>
    updateSection: (id: string, title: string) => Promise<Section | null>
    duplicateSection: (id: string) => Promise<Section | null>
    addSubSection: (sectionId: string, title: string) => Promise<{ key: string; subSection: SubSection } | null>
    deleteSection: (id: string) => Promise<boolean>
    deleteSubSection: (sectionId: string, subSectionKey: string) => Promise<boolean>
    updateSubSection: (sectionId: string, subSectionKey: string, title: string) => Promise<boolean>
    duplicateSubSection: (
        sectionId: string,
        subSectionKey: string,
    ) => Promise<{ key: string; subSection: SubSection } | null>
    addScriptToSubSection: (
        sectionId: string,
        subSectionKey: string,
        script: Omit<ScriptEntry, 'id'>,
    ) => Promise<ScriptEntry | null>
    removeScriptFromSubSection: (sectionId: string, subSectionKey: string, scriptId: string) => Promise<boolean>
    duplicateScriptInSubSection: (
        sectionId: string,
        subSectionKey: string,
        scriptId: string,
    ) => Promise<ScriptEntry | null>
    updateScriptInSubSection: (sectionId: string, subSectionKey: string, script: ScriptEntry) => Promise<boolean>

    // Drag and drop methods
    reorderSections: (fromIndex: number, toIndex: number) => Promise<boolean>
    reorderWorkflows: (sectionId: string, fromIndex: number, toIndex: number) => Promise<boolean>
    moveWorkflow: (workflowKey: string, fromSectionId: string, toSectionId: string, toIndex: number) => Promise<boolean>
    reorderScripts: (sectionId: string, subSectionKey: string, fromIndex: number, toIndex: number) => Promise<boolean>

    // Multi-vault methods
    getVaults: () => Promise<VaultsConfig>
    setActiveVault: (vaultId: string) => Promise<boolean>
    addVault: (name: string, vaultPath: string) => Promise<VaultMetadata | null>
    removeVault: (vaultId: string) => Promise<boolean>
    updateVaultName: (vaultId: string, newName: string) => Promise<boolean>
}

export interface DialogApi {
    openScript: () => Promise<string | null>
    openScripts: () => Promise<string[] | null>
}

export interface ScriptExecutionResult {
    success: boolean
    output: string
    stdout: string
}

export interface WorkflowExecutionResult {
    success: boolean
    stoppedAtScriptId?: string
    failureReason?: string
}

export type ExecutionStatus = 'idle' | 'running' | 'success' | 'failed' | 'condition_failed'

export type ExecutionStatusValue = Exclude<ExecutionStatus, 'idle'>

export interface ScriptExecutionStatusEvent {
    type: 'script'
    scriptId: string
    status: ExecutionStatusValue
    reason?: string
}

export interface WorkflowExecutionStatusEvent {
    type: 'workflow'
    status: ExecutionStatusValue
    stoppedAtScriptId?: string
    reason?: string
}

export interface ConnectorExecutionStatusEvent {
    type: 'connector'
    fromScriptId: string
    toScriptId?: string
    status: ExecutionStatusValue
    reason?: string
}

export type ExecutionStatusEvent =
    | ScriptExecutionStatusEvent
    | WorkflowExecutionStatusEvent
    | ConnectorExecutionStatusEvent

export interface ScriptApi {
    runSingleScript: (script: ScriptEntry) => Promise<ScriptExecutionResult>
    runAllScripts: (scripts: ScriptEntry[]) => Promise<WorkflowExecutionResult>
    stopScript: (scriptId: string) => Promise<void>
    stopWorkflow: () => Promise<boolean>
    onOutput: (callback: (data: { scriptId: string; data: string }) => void) => () => void
    onStatus: (callback: (data: ExecutionStatusEvent) => void) => () => void
}

export interface SecretsData {
    version: string
    secrets: Record<
        string,
        {
            value: string
            encrypted: boolean
        }
    >
}

export interface SecretEntry {
    key: string
    value: string
    encrypted: boolean
}

export interface SecretsApi {
    get: () => Promise<SecretsData>
    save: (data: SecretsData) => Promise<void>
}

export type LogLevel = 'log' | 'error' | 'warn' | 'info' | 'debug'

export interface LogEntry {
    timestamp: Date
    level: LogLevel
    source: 'main' | 'renderer'
    message: string
}

export interface LogsApi {
    getAll: () => Promise<LogEntry[]>
    clear: () => Promise<void>
    addFromRenderer: (level: LogLevel, message: string) => Promise<void>
}

export interface FileApi {
    read: (relativePath: string) => Promise<{ content: string | null; error?: string }>
    write: (relativePath: string, content: string) => Promise<{ success: boolean; error?: string }>
}

export interface AppUpdatesApi {
    getState: () => Promise<AppUpdateState>
    checkForUpdates: () => Promise<AppUpdateActionResult>
    downloadUpdate: () => Promise<AppUpdateActionResult>
    installUpdate: () => Promise<AppUpdateActionResult>
    onStateChange: (callback: (state: AppUpdateState) => void) => () => void
}

export interface AppApi {
    getInfo: () => Promise<AppRuntimeInfo>
    updates: AppUpdatesApi
}

export interface ExternalApi {
    open: (url: string) => Promise<void>
}

export interface VaultApi {
    checkConfig: () => Promise<string | null>
    select: () => Promise<string | null>
    init: (vaultPath: string, name?: string) => Promise<boolean>
    openConfigDirectory: () => Promise<void>
    getSections: () => Promise<Section[]>
    addSection: (title: string) => Promise<Section | null>
    updateSection: (id: string, title: string) => Promise<Section | null>
    duplicateSection: (id: string) => Promise<Section | null>
    addSubSection: (sectionId: string, title: string) => Promise<{ key: string; subSection: SubSection } | null>
    deleteSection: (id: string) => Promise<boolean>
    deleteSubSection: (sectionId: string, subSectionKey: string) => Promise<boolean>
    updateSubSection: (sectionId: string, subSectionKey: string, title: string) => Promise<boolean>
    duplicateSubSection: (
        sectionId: string,
        subSectionKey: string,
    ) => Promise<{ key: string; subSection: SubSection } | null>
    addScriptToSubSection: (
        sectionId: string,
        subSectionKey: string,
        script: Omit<ScriptEntry, 'id'>,
    ) => Promise<ScriptEntry | null>
    removeScriptFromSubSection: (sectionId: string, subSectionKey: string, scriptId: string) => Promise<boolean>
    duplicateScriptInSubSection: (
        sectionId: string,
        subSectionKey: string,
        scriptId: string,
    ) => Promise<ScriptEntry | null>
    updateScriptInSubSection: (sectionId: string, subSectionKey: string, script: ScriptEntry) => Promise<boolean>

    // Drag and drop methods
    reorderSections: (fromIndex: number, toIndex: number) => Promise<boolean>
    reorderWorkflows: (sectionId: string, fromIndex: number, toIndex: number) => Promise<boolean>
    moveWorkflow: (workflowKey: string, fromSectionId: string, toSectionId: string, toIndex: number) => Promise<boolean>
    reorderScripts: (sectionId: string, subSectionKey: string, fromIndex: number, toIndex: number) => Promise<boolean>

    // Multi-vault methods
    getVaults: () => Promise<VaultsConfig>
    setActiveVault: (vaultId: string) => Promise<boolean>
    addVault: (name: string, vaultPath: string) => Promise<VaultMetadata | null>
    removeVault: (vaultId: string) => Promise<boolean>
    updateVaultName: (vaultId: string, newName: string) => Promise<boolean>
}

export interface IElectronAPI {
    ping: () => Promise<string>
    app: AppApi
    external: ExternalApi
    vault: VaultApi
    secrets: SecretsApi
    dialog: DialogApi
    script: ScriptApi
    logs: LogsApi
    file: FileApi
}

declare global {
    interface Window {
        api: IElectronAPI
    }
}
