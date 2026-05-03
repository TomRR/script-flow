import fs from 'node:fs/promises'
import path from 'node:path'

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

export class SecretsHandler {
    private configDir: string

    constructor(configDir: string) {
        this.configDir = configDir
    }

    /**
     * Gets the path to a vault's secrets file.
     */
    private getSecretsFilePath(vaultId: string): string {
        return path.join(this.configDir, `${vaultId}.secrets.json`)
    }

    /**
     * Gets secrets for a specific vault.
     * Returns default empty secrets if file doesn't exist.
     */
    async getSecrets(vaultId: string): Promise<SecretsData> {
        const secretsPath = this.getSecretsFilePath(vaultId)

        try {
            const content = await fs.readFile(secretsPath, 'utf-8')
            return JSON.parse(content)
        } catch {
            // File doesn't exist or is invalid - return default
            return { version: '1.0.0', secrets: {} }
        }
    }

    /**
     * Saves secrets for a specific vault.
     */
    async saveSecrets(vaultId: string, data: SecretsData): Promise<void> {
        const secretsPath = this.getSecretsFilePath(vaultId)
        await fs.mkdir(this.configDir, { recursive: true })
        await fs.writeFile(secretsPath, JSON.stringify(data, null, 2), 'utf-8')
    }

    /**
     * Deletes secrets file for a specific vault.
     * Returns true if file was deleted or didn't exist.
     */
    async deleteSecrets(vaultId: string): Promise<boolean> {
        const secretsPath = this.getSecretsFilePath(vaultId)

        try {
            await fs.unlink(secretsPath)
            return true
        } catch {
            // File doesn't exist - that's fine
            return true
        }
    }

    /**
     * Checks if secrets file exists for a vault.
     */
    async secretsFileExists(vaultId: string): Promise<boolean> {
        const secretsPath = this.getSecretsFilePath(vaultId)

        try {
            await fs.access(secretsPath)
            return true
        } catch {
            return false
        }
    }
}
