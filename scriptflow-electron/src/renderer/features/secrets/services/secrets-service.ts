import type { SecretsData } from '../../../../renderer.d'

export class SecretsService {
    /**
     * IPC call to read secrets.json
     */
    static async getSecrets(): Promise<SecretsData> {
        return await window.api.secrets.get()
    }

    /**
     * IPC call to write secrets.json
     */
    static async saveSecrets(secrets: SecretsData): Promise<void> {
        await window.api.secrets.save(secrets)
    }
}
