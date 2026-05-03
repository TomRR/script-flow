import { app, dialog, BrowserWindow } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import type { MultiVaultService, VaultMetadata, VaultsConfig } from './multi-vault-service'

const PROJECT_CONFIG_FILENAME = '.scriptflow.json'

// Define the shape of a subsection (workflow)

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

// Define the shape of a subsection (workflow)
export interface SubSection {
    title: string
    placement: number
    scripts?: ScriptEntry[]
}

// Define the shape of a section
export interface Section {
    id: string
    title: string
    'sub-sections': Record<string, SubSection>
    placement: number
}

// Define the shape of the project config
interface ProjectConfig {
    $schema?: string
    version: string
    sections: Section[]
}

export class VaultHandler {
    private userDataPath: string
    private configDir: string
    private multiVaultService: MultiVaultService

    constructor(multiVaultService: MultiVaultService) {
        this.userDataPath = app.getPath('userData')
        this.configDir = path.join(this.userDataPath, 'config')
        this.multiVaultService = multiVaultService
    }

    /**
     * Returns the path to the config directory.
     */
    getConfigDirectory(): string {
        return this.configDir
    }

    /**
     * Resolves a script path to an absolute path.
     * If the path is already absolute, returns it as-is.
     * If the path is relative, resolves it relative to the vault directory.
     */
    async resolveScriptPath(scriptPath: string): Promise<string> {
        // If it's already an absolute path, return as-is (for backwards compatibility)
        if (path.isAbsolute(scriptPath)) {
            return scriptPath
        }

        const vaultPath = await this.checkVaultConfig()
        if (!vaultPath) {
            throw new Error('No vault configured')
        }

        return path.join(vaultPath, scriptPath)
    }

    /**
     * Converts an absolute path to a relative path from the vault directory.
     * Returns the original path if it's already relative or if vault is not configured.
     */
    async makeRelativePath(absolutePath: string): Promise<string> {
        const vaultPath = await this.checkVaultConfig()
        if (!vaultPath) {
            return absolutePath
        }

        // If it's already relative, return as-is
        if (!path.isAbsolute(absolutePath)) {
            return absolutePath
        }

        // Calculate relative path from vault directory
        const relativePath = path.relative(vaultPath, absolutePath).split(path.sep).join('/')

        // Ensure it doesn't start with '..' (outside vault)
        if (relativePath.startsWith('..')) {
            console.warn(`Path ${absolutePath} is outside vault directory, storing as absolute`)
            return absolutePath
        }

        return relativePath
    }

    /**
     * Checks if a vault is already configured.
     * Returns the vault path if configured, or null.
     */
    async checkVaultConfig(): Promise<string | null> {
        return this.multiVaultService.getActiveVaultPath()
    }

    /**
     * Gets all vaults configuration.
     */
    async getVaults(): Promise<VaultsConfig> {
        return this.multiVaultService.getVaultsConfig()
    }

    /**
     * Sets the active vault by ID.
     */
    async setActiveVault(vaultId: string): Promise<boolean> {
        return this.multiVaultService.setActiveVault(vaultId)
    }

    /**
     * Adds a new vault with the given name and path.
     */
    async addVault(name: string, vaultPath: string): Promise<VaultMetadata | null> {
        return this.multiVaultService.addVault(name, vaultPath)
    }

    /**
     * Removes a vault from the configuration.
     */
    async removeVault(vaultId: string): Promise<boolean> {
        return this.multiVaultService.removeVault(vaultId)
    }

    /**
     * Updates a vault's name.
     */
    async updateVaultName(vaultId: string, newName: string): Promise<boolean> {
        return this.multiVaultService.updateVaultName(vaultId, newName)
    }

    /**
     * Opens a dialog for the user to select a folder.
     * Returns the selected path or null if canceled.
     */
    async selectVault(window: BrowserWindow): Promise<string | null> {
        const result = await dialog.showOpenDialog(window, {
            properties: ['openDirectory', 'createDirectory'],
            title: 'Select Vault Folder',
            buttonLabel: 'Select Vault',
        })

        if (result.canceled || result.filePaths.length === 0) {
            return null
        }

        return result.filePaths[0]
    }

    /**
     * Initializes the vault at the given path.
     * 1. Adds vault to multi-vault config with "Vault" as default name.
     * 2. Creates .scriptflow.json in the vault if it doesn't exist.
     */
    async initializeVault(vaultPath: string, name?: string): Promise<boolean> {
        try {
            // 1. Add to multi-vault config
            const vault = await this.multiVaultService.addVault(name || 'Vault', vaultPath)
            if (!vault) {
                return false
            }

            // 2. Initialize project config inside the vault
            const projectConfigPath = path.join(vaultPath, PROJECT_CONFIG_FILENAME)
            try {
                await fs.access(projectConfigPath)
                // .scriptflow.json already exists, do nothing (or maybe validate it)
            } catch {
                // .scriptflow.json does not exist, create it
                const defaultConfig = {
                    $schema: 'https://raw.githubusercontent.com/tomrr/script-flow/main/schemas/scriptflow.schema.json',
                    version: '1.0.0',
                    sections: [],
                }
                await fs.writeFile(projectConfigPath, JSON.stringify(defaultConfig, null, 2), 'utf-8')
            }

            return true
        } catch (error) {
            console.error('Failed to initialize vault:', error)
            return false
        }
    }

    /**
     * Gets the path to the project config file in the vault.
     * Returns null if no vault is configured.
     */
    private async getProjectConfigPath(): Promise<string | null> {
        const vaultPath = await this.checkVaultConfig()
        if (!vaultPath) {
            return null
        }
        return path.join(vaultPath, PROJECT_CONFIG_FILENAME)
    }

    /**
     * Reads and returns the project config from the vault.
     * Returns null if no vault is configured or config doesn't exist.
     * Automatically migrates legacy successCondition.setEnvVar/envVarName to outputPass.
     */
    private async readProjectConfig(): Promise<ProjectConfig | null> {
        const configPath = await this.getProjectConfigPath()
        if (!configPath) {
            return null
        }

        try {
            const content = await fs.readFile(configPath, 'utf-8')
            const config = JSON.parse(content) as ProjectConfig
            this.migrateOutputPassConfig(config)
            return config
        } catch (error) {
            console.error('Failed to read project config:', error)
            return null
        }
    }

    /**
     * Migrates legacy successCondition.setEnvVar/envVarName fields to the new
     * outputPass field on ScriptEntry. Mutates the config in place.
     * The migrated config will be persisted on the next write.
     */
    private migrateOutputPassConfig(config: ProjectConfig): void {
        for (const section of config.sections) {
            const subSections = section['sub-sections'] ?? {}
            for (const subSection of Object.values(subSections)) {
                if (!subSection.scripts) continue
                for (const script of subSection.scripts) {
                    if (script.successCondition && !script.outputPass) {
                        const { setEnvVar, envVarName } = script.successCondition
                        if (setEnvVar && envVarName) {
                            script.outputPass = {
                                enabled: true,
                                envVarName,
                            }
                        }
                    }
                    // Clean up deprecated fields from successCondition
                    if (script.successCondition) {
                        delete script.successCondition.setEnvVar
                        delete script.successCondition.envVarName
                    }
                }
            }
        }
    }

    /**
     * Writes the project config to the vault.
     */
    private async writeProjectConfig(config: ProjectConfig): Promise<boolean> {
        const configPath = await this.getProjectConfigPath()
        if (!configPath) {
            return false
        }

        try {
            await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
            return true
        } catch (error) {
            console.error('Failed to write project config:', error)
            return false
        }
    }

    /**
     * Gets all sections from the project config.
     */
    async getSections(): Promise<Section[]> {
        const config = await this.readProjectConfig()
        if (!config) {
            return []
        }
        return config.sections
    }

    /**
     * Adds a new section with the given title.
     * Returns the newly created section, or null on failure.
     */
    async addSection(title: string): Promise<Section | null> {
        const config = await this.readProjectConfig()
        if (!config) {
            return null
        }

        const newSection: Section = {
            id: randomUUID(),
            title,
            'sub-sections': {},
            placement: config.sections.length,
        }

        config.sections.push(newSection)
        const success = await this.writeProjectConfig(config)
        return success ? newSection : null
    }

    /**
     * Updates an existing section's title.
     * Returns the updated section, or null if not found or on failure.
     */
    async updateSection(id: string, title: string): Promise<Section | null> {
        const config = await this.readProjectConfig()
        if (!config) {
            return null
        }

        const sectionIndex = config.sections.findIndex((s) => s.id === id)
        if (sectionIndex === -1) {
            console.error(`Section with id ${id} not found`)
            return null
        }

        config.sections[sectionIndex].title = title
        const success = await this.writeProjectConfig(config)
        return success ? config.sections[sectionIndex] : null
    }

    /**
     * Duplicates a section and inserts it immediately after the original.
     */
    async duplicateSection(id: string): Promise<Section | null> {
        const config = await this.readProjectConfig()
        if (!config) {
            return null
        }

        const sectionIndex = config.sections.findIndex((s) => s.id === id)
        if (sectionIndex === -1) {
            console.error(`Section with id ${id} not found`)
            return null
        }

        const original = config.sections[sectionIndex]
        const duplicatedSection: Section = {
            id: randomUUID(),
            title: `${original.title} New`,
            placement: original.placement + 1,
            'sub-sections': {},
        }

        const originalSubSections = original['sub-sections'] ?? {}
        Object.entries(originalSubSections).forEach(([_, subSection]) => {
            const clonedSubSection: SubSection = {
                title: subSection.title,
                placement: subSection.placement,
                scripts: subSection.scripts
                    ? subSection.scripts.map((script) => {
                          const clone = JSON.parse(JSON.stringify(script)) as ScriptEntry
                          clone.id = randomUUID()
                          return clone
                      })
                    : undefined,
            }
            duplicatedSection['sub-sections'][randomUUID()] = clonedSubSection
        })

        config.sections.splice(sectionIndex + 1, 0, duplicatedSection)
        config.sections.forEach((section, index) => {
            section.placement = index
        })

        const success = await this.writeProjectConfig(config)
        return success ? duplicatedSection : null
    }

    /**
     * Deletes a section and all its contents.
     */
    async deleteSection(id: string): Promise<boolean> {
        const config = await this.readProjectConfig()
        if (!config) {
            return false
        }

        const initialLength = config.sections.length
        config.sections = config.sections.filter((s) => s.id !== id)

        if (config.sections.length === initialLength) {
            return false // Section not found
        }

        return await this.writeProjectConfig(config)
    }

    /**
     * Adds a new subsection (workflow) to a section.
     * Returns an object with the key and subsection, or null on failure.
     */
    async addSubSection(sectionId: string, title: string): Promise<{ key: string; subSection: SubSection } | null> {
        const config = await this.readProjectConfig()
        if (!config) {
            return null
        }

        const sectionIndex = config.sections.findIndex((s) => s.id === sectionId)
        if (sectionIndex === -1) {
            console.error(`Section with id ${sectionId} not found`)
            return null
        }

        const section = config.sections[sectionIndex]

        // Ensure sub-sections is an object
        if (!section['sub-sections'] || Array.isArray(section['sub-sections'])) {
            section['sub-sections'] = {}
        }

        const subSections = section['sub-sections']
        const key = randomUUID()
        const placement = Object.keys(subSections).length

        const newSubSection: SubSection = {
            title,
            placement,
            scripts: [],
        }

        subSections[key] = newSubSection
        const success = await this.writeProjectConfig(config)
        return success ? { key, subSection: newSubSection } : null
    }

    /**
     * Updates an existing subsection's title.
     */
    async updateSubSection(sectionId: string, subSectionKey: string, title: string): Promise<boolean> {
        const config = await this.readProjectConfig()
        if (!config) return false

        const section = config.sections.find((s) => s.id === sectionId)
        if (!section || !section['sub-sections'] || !section['sub-sections'][subSectionKey]) {
            return false
        }

        section['sub-sections'][subSectionKey].title = title
        return await this.writeProjectConfig(config)
    }

    /**
     * Deletes a subsection (workflow) from a section.
     */
    async deleteSubSection(sectionId: string, subSectionKey: string): Promise<boolean> {
        const config = await this.readProjectConfig()
        if (!config) {
            return false
        }

        const sectionIndex = config.sections.findIndex((s) => s.id === sectionId)
        if (sectionIndex === -1) {
            return false
        }

        const section = config.sections[sectionIndex]
        if (!section['sub-sections'] || !section['sub-sections'][subSectionKey]) {
            return false
        }

        delete section['sub-sections'][subSectionKey]
        return await this.writeProjectConfig(config)
    }

    /**
     * Duplicates a subsection (workflow) and inserts it immediately after the original.
     */
    async duplicateSubSection(
        sectionId: string,
        subSectionKey: string,
    ): Promise<{ key: string; subSection: SubSection } | null> {
        const config = await this.readProjectConfig()
        if (!config) {
            return null
        }

        const section = config.sections.find((s) => s.id === sectionId)
        if (!section || !section['sub-sections'] || !section['sub-sections'][subSectionKey]) {
            return null
        }

        const subSections = section['sub-sections']
        const original = subSections[subSectionKey]
        const originalPlacement = original.placement

        const clonedSubSection: SubSection = {
            title: `${original.title} New`,
            placement: originalPlacement + 1,
            scripts: original.scripts
                ? original.scripts.map((script) => {
                      const clone = JSON.parse(JSON.stringify(script)) as ScriptEntry
                      clone.id = randomUUID()
                      return clone
                  })
                : undefined,
        }

        Object.values(subSections).forEach((subSection) => {
            if (subSection.placement > originalPlacement) {
                subSection.placement += 1
            }
        })

        const newKey = randomUUID()
        subSections[newKey] = clonedSubSection

        const normalized = Object.entries(subSections).sort((a, b) => a[1].placement - b[1].placement)
        normalized.forEach(([_, subSection], index) => {
            subSection.placement = index
        })

        const success = await this.writeProjectConfig(config)
        return success ? { key: newKey, subSection: clonedSubSection } : null
    }

    /**
     * Duplicates a script entry and inserts it immediately after the original.
     */
    async duplicateScriptInSubSection(
        sectionId: string,
        subSectionKey: string,
        scriptId: string,
    ): Promise<ScriptEntry | null> {
        const config = await this.readProjectConfig()
        if (!config) return null

        const section = config.sections.find((s) => s.id === sectionId)
        if (!section || !section['sub-sections'] || !section['sub-sections'][subSectionKey]) {
            return null
        }

        const subSection = section['sub-sections'][subSectionKey]
        if (!subSection.scripts || subSection.scripts.length === 0) return null

        // Get sorted scripts by placement
        const sortedScripts = this.getSortedScripts(subSection.scripts)

        // Find the index in the sorted array
        const scriptIndex = sortedScripts.findIndex((script) => script.id === scriptId)
        if (scriptIndex === -1) return null

        const original = sortedScripts[scriptIndex]
        const cloned = JSON.parse(JSON.stringify(original)) as ScriptEntry
        cloned.id = randomUUID()
        if (cloned.name) {
            cloned.name = `${cloned.name} New`
        }

        // Insert after the original in the sorted array
        sortedScripts.splice(scriptIndex + 1, 0, cloned)

        // Update placement values for all scripts
        sortedScripts.forEach((script, index) => {
            script.placement = index
        })

        subSection.scripts = sortedScripts
        const success = await this.writeProjectConfig(config)
        return success ? cloned : null
    }

    async addScriptToSubSection(
        sectionId: string,
        subSectionKey: string,
        script: Omit<ScriptEntry, 'id'>,
    ): Promise<ScriptEntry | null> {
        const config = await this.readProjectConfig()
        if (!config) return null

        const section = config.sections.find((s) => s.id === sectionId)
        if (!section || !section['sub-sections'] || !section['sub-sections'][subSectionKey]) {
            return null
        }

        const subSection = section['sub-sections'][subSectionKey]
        if (!subSection.scripts) {
            subSection.scripts = []
        }

        const newScript: ScriptEntry = {
            ...script,
            id: randomUUID(),
            placement: subSection.scripts.length,
        }

        subSection.scripts.push(newScript)
        const success = await this.writeProjectConfig(config)
        return success ? newScript : null
    }

    async removeScriptFromSubSection(sectionId: string, subSectionKey: string, scriptId: string): Promise<boolean> {
        const config = await this.readProjectConfig()
        if (!config) return false

        const section = config.sections.find((s) => s.id === sectionId)
        if (!section || !section['sub-sections'] || !section['sub-sections'][subSectionKey]) {
            return false
        }

        const subSection = section['sub-sections'][subSectionKey]
        if (!subSection.scripts) return false

        const initialLength = subSection.scripts.length
        subSection.scripts = subSection.scripts.filter((s) => s.id !== scriptId)

        if (subSection.scripts.length === initialLength) return false

        // Renormalize placements after removal
        const sortedScripts = this.getSortedScripts(subSection.scripts)
        sortedScripts.forEach((script, index) => {
            script.placement = index
        })
        subSection.scripts = sortedScripts

        return await this.writeProjectConfig(config)
    }

    async updateScriptInSubSection(sectionId: string, subSectionKey: string, script: ScriptEntry): Promise<boolean> {
        const config = await this.readProjectConfig()
        if (!config) return false

        const section = config.sections.find((s) => s.id === sectionId)
        if (!section || !section['sub-sections'] || !section['sub-sections'][subSectionKey]) {
            return false
        }

        const subSection = section['sub-sections'][subSectionKey]
        if (!subSection.scripts) return false

        const scriptIndex = subSection.scripts.findIndex((s) => s.id === script.id)
        if (scriptIndex === -1) return false

        subSection.scripts[scriptIndex] = script
        return await this.writeProjectConfig(config)
    }

    /**
     * Helper to get sorted subsections by placement
     */
    private getSortedSubSections(subSections: Record<string, SubSection>): [string, SubSection][] {
        return Object.entries(subSections).sort((a, b) => a[1].placement - b[1].placement)
    }

    /**
     * Reorders sections by moving a section from one index to another.
     * Updates the placement values of all sections to reflect the new order.
     */
    async reorderSections(fromIndex: number, toIndex: number): Promise<boolean> {
        const config = await this.readProjectConfig()
        if (!config) return false

        // Sort sections by placement first to ensure consistent ordering
        const sortedSections = [...config.sections].sort((a, b) => a.placement - b.placement)

        if (fromIndex < 0 || fromIndex >= sortedSections.length || toIndex < 0 || toIndex >= sortedSections.length) {
            return false
        }

        // Reorder using array movement
        const reorderedSections = [...sortedSections]
        const [movedSection] = reorderedSections.splice(fromIndex, 1)
        reorderedSections.splice(toIndex, 0, movedSection)

        // Update placement values
        reorderedSections.forEach((section, index) => {
            section.placement = index
        })

        config.sections = reorderedSections
        return await this.writeProjectConfig(config)
    }

    /**
     * Reorders workflows within a section by moving a workflow from one index to another.
     * Updates the placement values of all workflows in the section to reflect the new order.
     */
    async reorderWorkflows(sectionId: string, fromIndex: number, toIndex: number): Promise<boolean> {
        const config = await this.readProjectConfig()
        if (!config) return false

        const section = config.sections.find((s) => s.id === sectionId)
        if (!section || !section['sub-sections']) {
            return false
        }

        const sortedWorkflows = this.getSortedSubSections(section['sub-sections'])

        if (fromIndex < 0 || fromIndex >= sortedWorkflows.length || toIndex < 0 || toIndex >= sortedWorkflows.length) {
            return false
        }

        // Reorder using array movement
        const reorderedWorkflows = [...sortedWorkflows]
        const [movedWorkflow] = reorderedWorkflows.splice(fromIndex, 1)
        reorderedWorkflows.splice(toIndex, 0, movedWorkflow)

        // Update placement values
        reorderedWorkflows.forEach(([_key, subSection], index) => {
            subSection.placement = index
        })

        // Update section with reordered workflows
        const normalizedSubSections: Record<string, SubSection> = {}
        reorderedWorkflows.forEach(([key, subSection]) => {
            normalizedSubSections[key] = subSection
        })

        section['sub-sections'] = normalizedSubSections
        return await this.writeProjectConfig(config)
    }

    /**
     * Moves a workflow from one section to another.
     * Removes the workflow from the source section and adds it to the target section.
     */
    async moveWorkflow(
        workflowKey: string,
        fromSectionId: string,
        toSectionId: string,
        toIndex: number,
    ): Promise<boolean> {
        const config = await this.readProjectConfig()
        if (!config) return false

        const fromSection = config.sections.find((s) => s.id === fromSectionId)
        const toSection = config.sections.find((s) => s.id === toSectionId)

        if (!fromSection || !toSection || !fromSection['sub-sections'] || !fromSection['sub-sections'][workflowKey]) {
            return false
        }

        // Ensure to-section has proper sub-sections structure
        if (!toSection['sub-sections']) {
            toSection['sub-sections'] = {}
        }

        // Handle moving within same section
        if (fromSectionId === toSectionId) {
            const sortedWorkflows = this.getSortedSubSections(fromSection['sub-sections'])
            const fromIdx = sortedWorkflows.findIndex(([key]) => key === workflowKey)
            const effectiveToIndex = toIndex !== undefined ? toIndex : sortedWorkflows.length - 1

            if (fromIdx === -1) return false

            // Reorder using array movement
            const reorderedWorkflows = [...sortedWorkflows]
            const [movedWorkflow] = reorderedWorkflows.splice(fromIdx, 1)
            reorderedWorkflows.splice(effectiveToIndex, 0, movedWorkflow)

            // Update placement values
            reorderedWorkflows.forEach(([_key, subSection], index) => {
                subSection.placement = index
            })

            // Update section with reordered workflows
            const normalizedSubSections: Record<string, SubSection> = {}
            reorderedWorkflows.forEach(([key, subSection]) => {
                normalizedSubSections[key] = subSection
            })

            fromSection['sub-sections'] = normalizedSubSections
            return await this.writeProjectConfig(config)
        }

        // Moving between different sections
        const workflow = fromSection['sub-sections'][workflowKey]

        // Remove workflow from source section
        const sourceSubSections = { ...fromSection['sub-sections'] }
        delete sourceSubSections[workflowKey]

        // Renormalize source section placements
        const sortedSourceWorkflows = this.getSortedSubSections(sourceSubSections)
        sortedSourceWorkflows.forEach(([_key, subSection], index) => {
            subSection.placement = index
        })

        // Add workflow to target section
        const targetSubSections = { ...toSection['sub-sections'] }
        const targetWorkflows = this.getSortedSubSections(targetSubSections)
        const effectiveTargetIndex = Math.min(toIndex, targetWorkflows.length)

        // Insert workflow at target index
        targetWorkflows.splice(effectiveTargetIndex, 0, [workflowKey, workflow])

        // Renormalize target section placements
        targetWorkflows.forEach(([_key, subSection], index) => {
            subSection.placement = index
        })

        // Update both sections with normalized subsections
        const normalizedSourceSubSections: Record<string, SubSection> = {}
        sortedSourceWorkflows.forEach(([key, subSection]) => {
            normalizedSourceSubSections[key] = subSection
        })

        const normalizedTargetSubSections: Record<string, SubSection> = {}
        targetWorkflows.forEach(([key, subSection]) => {
            normalizedTargetSubSections[key] = subSection
        })

        fromSection['sub-sections'] = normalizedSourceSubSections
        toSection['sub-sections'] = normalizedTargetSubSections

        return await this.writeProjectConfig(config)
    }

    /**
     * Helper to get sorted scripts by placement
     */
    private getSortedScripts(scripts: ScriptEntry[]): ScriptEntry[] {
        return [...scripts].sort((a, b) => a.placement - b.placement)
    }

    /**
     * Reorders scripts within a subsection (workflow) by moving a script from one index to another.
     * Updates the placement values of all scripts to reflect the new order.
     */
    async reorderScripts(
        sectionId: string,
        subSectionKey: string,
        fromIndex: number,
        toIndex: number,
    ): Promise<boolean> {
        const config = await this.readProjectConfig()
        if (!config) return false

        const section = config.sections.find((s) => s.id === sectionId)
        if (!section || !section['sub-sections'] || !section['sub-sections'][subSectionKey]) {
            return false
        }

        const subSection = section['sub-sections'][subSectionKey]
        if (!subSection.scripts || subSection.scripts.length === 0) {
            return false
        }

        const sortedScripts = this.getSortedScripts(subSection.scripts)

        if (fromIndex < 0 || fromIndex >= sortedScripts.length || toIndex < 0 || toIndex >= sortedScripts.length) {
            return false
        }

        // Reorder using array movement
        const reorderedScripts = [...sortedScripts]
        const [movedScript] = reorderedScripts.splice(fromIndex, 1)
        reorderedScripts.splice(toIndex, 0, movedScript)

        // Update placement values
        reorderedScripts.forEach((script, index) => {
            script.placement = index
        })

        subSection.scripts = reorderedScripts
        return await this.writeProjectConfig(config)
    }

    /**
     * Reads the content of a script file from the vault.
     * Returns an object with content or error message.
     */
    async readScriptFile(relativePath: string): Promise<{ content: string | null; error?: string }> {
        try {
            const absolutePath = await this.resolveScriptPath(relativePath)
            const content = await fs.readFile(absolutePath, 'utf-8')
            return { content }
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return { content: null, error: 'File not found' }
            } else if (error.code === 'EACCES' || error.code === 'EPERM') {
                return { content: null, error: 'Permission denied' }
            }
            console.error('Failed to read script file:', error)
            return { content: null, error: 'Failed to read file' }
        }
    }

    /**
     * Writes content to a script file in the vault.
     * Returns an object with success status or error message.
     */
    async writeScriptFile(relativePath: string, content: string): Promise<{ success: boolean; error?: string }> {
        try {
            const absolutePath = await this.resolveScriptPath(relativePath)
            await fs.writeFile(absolutePath, content, 'utf-8')
            return { success: true }
        } catch (error: any) {
            if (error.code === 'EACCES' || error.code === 'EPERM') {
                return { success: false, error: 'Permission denied' }
            }
            console.error('Failed to write script file:', error)
            return { success: false, error: 'Failed to write file' }
        }
    }
}
