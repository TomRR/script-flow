import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { SecretsHandler } from './secrets-handler'

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

interface LegacyVaultConfig {
    vaultPath: string
}

const VAULT_CONFIG_FILENAME = 'vault-config.json'

export class MultiVaultService {
    private configDir: string
    private secretsHandler: SecretsHandler

    constructor(configDir: string, secretsHandler: SecretsHandler) {
        this.configDir = configDir
        this.secretsHandler = secretsHandler
    }

    /**
     * Gets the path to the vault config file.
     */
    private getConfigPath(): string {
        return path.join(this.configDir, VAULT_CONFIG_FILENAME)
    }

    /**
     * Reads the raw vaults configuration from file without path validation.
     */
    private async readRawConfig(): Promise<VaultsConfig | null> {
        try {
            const configPath = this.getConfigPath()
            const content = await fs.readFile(configPath, 'utf-8')
            const data = JSON.parse(content)

            // Check if this is legacy format
            if (this.isLegacyConfig(data)) {
                return await this.migrateFromLegacy(data)
            }

            return data as VaultsConfig
        } catch {
            // Config doesn't exist or is invalid
            return null
        }
    }

    /**
     * Reads the vaults configuration.
     * Migrates from legacy format if needed.
     */
    async getVaultsConfig(): Promise<VaultsConfig> {
        const config = await this.readRawConfig()

        if (!config) {
            // Config doesn't exist or is invalid - return empty config
            return {
                activeVaultId: null,
                vaults: [],
            }
        }

        // Validate and enhance with exists status
        const validatedVaults = await Promise.all(
            config.vaults.map(async (vault) => ({
                ...vault,
                exists: await this.checkPathExists(vault.path),
            })),
        )

        return {
            ...config,
            vaults: validatedVaults,
        }
    }

    /**
     * Checks if the config is in legacy format (single vault).
     */
    private isLegacyConfig(data: unknown): data is LegacyVaultConfig {
        return (
            typeof data === 'object' &&
            data !== null &&
            'vaultPath' in data &&
            typeof (data as LegacyVaultConfig).vaultPath === 'string'
        )
    }

    /**
     * Migrates from legacy single-vault format to new multi-vault format.
     */
    private async migrateFromLegacy(legacy: LegacyVaultConfig): Promise<VaultsConfig> {
        const vaultId = randomUUID()
        const vaultName = this.generateVaultNameFromPath(legacy.vaultPath)
        const exists = await this.checkPathExists(legacy.vaultPath)

        const config: VaultsConfig = {
            activeVaultId: exists ? vaultId : null,
            vaults: [
                {
                    id: vaultId,
                    name: vaultName,
                    path: legacy.vaultPath,
                    exists,
                },
            ],
        }

        await this.saveVaultsConfig(config)
        return config
    }

    /**
     * Generates a vault name from the folder path.
     * Converts "folder-name" or "folder_name" to "Folder Name".
     */
    private generateVaultNameFromPath(vaultPath: string): string {
        const folderName = path.basename(vaultPath)
        // Convert snake_case and kebab-case to Title Case
        return folderName
            .replace(/[_-]/g, ' ')
            .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase())
    }

    /**
     * Checks if a path exists.
     */
    private async checkPathExists(checkPath: string): Promise<boolean> {
        try {
            await fs.access(checkPath)
            return true
        } catch {
            return false
        }
    }

    /**
     * Saves the vaults configuration.
     */
    async saveVaultsConfig(config: VaultsConfig): Promise<void> {
        await fs.mkdir(this.configDir, { recursive: true })
        const configPath = this.getConfigPath()
        await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
    }

    /**
     * Gets the currently active vault.
     * Returns null if no vault is active.
     */
    async getActiveVault(): Promise<VaultMetadata | null> {
        const config = await this.getVaultsConfig()
        if (!config.activeVaultId) {
            return null
        }

        const activeVault = config.vaults.find((v) => v.id === config.activeVaultId)
        if (!activeVault || !activeVault.exists) {
            return null
        }

        return activeVault
    }

    /**
     * Sets the active vault by ID.
     */
    async setActiveVault(vaultId: string): Promise<boolean> {
        const config = await this.getVaultsConfig()

        const vault = config.vaults.find((v) => v.id === vaultId)
        if (!vault) {
            return false
        }

        config.activeVaultId = vaultId
        await this.saveVaultsConfig(config)
        return true
    }

    /**
     * Adds a new vault.
     * Returns the newly created vault metadata.
     */
    async addVault(name: string, vaultPath: string): Promise<VaultMetadata | null> {
        const exists = await this.checkPathExists(vaultPath)
        if (!exists) {
            return null
        }

        const config = await this.getVaultsConfig()

        const newVault: VaultMetadata = {
            id: randomUUID(),
            name: name.trim() || 'Vault',
            path: vaultPath,
            exists: true,
        }

        config.vaults.push(newVault)

        // Always set the newly added vault as active
        config.activeVaultId = newVault.id

        await this.saveVaultsConfig(config)
        return newVault
    }

    /**
     * Removes a vault from the configuration.
     * Does not delete the vault folder but deletes associated secrets.
     */
    async removeVault(vaultId: string): Promise<boolean> {
        const config = await this.getVaultsConfig()

        const vaultIndex = config.vaults.findIndex((v) => v.id === vaultId)
        if (vaultIndex === -1) {
            return false
        }

        // Remove vault from config first
        config.vaults.splice(vaultIndex, 1)

        // If we removed the active vault, clear the active vault ID
        if (config.activeVaultId === vaultId) {
            config.activeVaultId = config.vaults.length > 0 ? config.vaults[0].id : null
        }

        await this.saveVaultsConfig(config)

        // Then delete associated secrets file
        await this.secretsHandler.deleteSecrets(vaultId)

        return true
    }

    /**
     * Validates all vault paths and updates their exists status.
     * Returns list of vaults with invalid paths.
     */
    async validateVaultPaths(): Promise<VaultMetadata[]> {
        const config = await this.readRawConfig()
        if (!config) {
            return []
        }

        const invalidVaults: VaultMetadata[] = []

        for (const vault of config.vaults) {
            const exists = await this.checkPathExists(vault.path)
            if (vault.exists !== exists) {
                vault.exists = exists
                if (!exists) {
                    invalidVaults.push(vault)
                }
            }
        }

        await this.saveVaultsConfig(config)
        return invalidVaults
    }

    /**
     * Gets the path to the active vault directory.
     * Returns null if no vault is active.
     */
    async getActiveVaultPath(): Promise<string | null> {
        const activeVault = await this.getActiveVault()
        return activeVault?.path || null
    }

    /**
     * Checks if any vault is configured and active.
     */
    async hasActiveVault(): Promise<boolean> {
        const activeVault = await this.getActiveVault()
        return activeVault !== null
    }

    /**
     * Updates a vault's name.
     */
    async updateVaultName(vaultId: string, newName: string): Promise<boolean> {
        const config = await this.getVaultsConfig()

        const vault = config.vaults.find((v) => v.id === vaultId)
        if (!vault) {
            return false
        }

        vault.name = newName.trim() || 'Vault'
        await this.saveVaultsConfig(config)
        return true
    }
}
