import type { Section, SubSection, VaultsConfig, VaultMetadata } from '../../../../renderer.d'

export class SidebarService {
    static async getSections(): Promise<Section[]> {
        return window.api.vault.getSections()
    }

    static async addSection(title: string): Promise<Section | null> {
        return window.api.vault.addSection(title)
    }

    static async updateSection(id: string, title: string): Promise<Section | null> {
        return window.api.vault.updateSection(id, title)
    }

    static async deleteSection(id: string): Promise<boolean> {
        return window.api.vault.deleteSection(id)
    }

    static async addSubSection(
        sectionId: string,
        title: string,
    ): Promise<{ key: string; subSection: SubSection } | null> {
        return window.api.vault.addSubSection(sectionId, title)
    }

    static async deleteSubSection(sectionId: string, subSectionKey: string): Promise<boolean> {
        return window.api.vault.deleteSubSection(sectionId, subSectionKey)
    }

    static async updateSubSection(sectionId: string, subSectionKey: string, title: string): Promise<boolean> {
        return window.api.vault.updateSubSection(sectionId, subSectionKey, title)
    }

    static async selectVault(): Promise<string | null> {
        return window.api.vault.select()
    }

    static async initVault(path: string, name?: string): Promise<boolean> {
        return window.api.vault.init(path, name)
    }

    static async openConfigDirectory(): Promise<void> {
        return window.api.vault.openConfigDirectory()
    }

    // Multi-vault methods
    static async getVaults(): Promise<VaultsConfig> {
        return window.api.vault.getVaults()
    }

    static async setActiveVault(vaultId: string): Promise<boolean> {
        return window.api.vault.setActiveVault(vaultId)
    }

    static async addVault(name: string, vaultPath: string): Promise<VaultMetadata | null> {
        return window.api.vault.addVault(name, vaultPath)
    }

    static async removeVault(vaultId: string): Promise<boolean> {
        return window.api.vault.removeVault(vaultId)
    }

    static async updateVaultName(vaultId: string, name: string): Promise<boolean> {
        return window.api.vault.updateVaultName(vaultId, name)
    }
}
