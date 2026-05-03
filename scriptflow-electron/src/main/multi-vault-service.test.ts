import { MultiVaultService, VaultsConfig, VaultMetadata } from './multi-vault-service'
import { SecretsHandler } from './secrets-handler'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'
import { randomUUID } from 'crypto'

describe('MultiVaultService', () => {
    let service: MultiVaultService
    let secretsHandler: SecretsHandler
    let tempDir: string
    let configDir: string

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scriptflow-test-'))
        configDir = path.join(tempDir, 'config')
        secretsHandler = new SecretsHandler(configDir)
        service = new MultiVaultService(configDir, secretsHandler)
    })

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true })
    })

    describe('getVaultsConfig', () => {
        test('should return empty config when no config file exists', async () => {
            const config = await service.getVaultsConfig()

            expect(config).toEqual({
                activeVaultId: null,
                vaults: [],
            })
        })

        test('should migrate from legacy format', async () => {
            const vaultDir = path.join(tempDir, 'my-vault')
            await fs.mkdir(vaultDir, { recursive: true })

            const legacyConfig = { vaultPath: vaultDir }
            await fs.mkdir(configDir, { recursive: true })
            await fs.writeFile(path.join(configDir, 'vault-config.json'), JSON.stringify(legacyConfig))

            const config = await service.getVaultsConfig()

            expect(config.vaults).toHaveLength(1)
            expect(config.vaults[0].path).toBe(vaultDir)
            expect(config.vaults[0].name).toBe('My Vault')
            expect(config.vaults[0].exists).toBe(true)
            expect(config.activeVaultId).toBe(config.vaults[0].id)
        })

        test('should handle legacy vault path that no longer exists', async () => {
            const nonExistentPath = path.join(tempDir, 'deleted-vault')
            const legacyConfig = { vaultPath: nonExistentPath }

            await fs.mkdir(configDir, { recursive: true })
            await fs.writeFile(path.join(configDir, 'vault-config.json'), JSON.stringify(legacyConfig))

            const config = await service.getVaultsConfig()

            expect(config.vaults).toHaveLength(1)
            expect(config.vaults[0].exists).toBe(false)
            expect(config.activeVaultId).toBeNull()
        })

        test('should read new format config correctly', async () => {
            const vault1Dir = path.join(tempDir, 'vault1')
            const vault2Dir = path.join(tempDir, 'vault2')
            await fs.mkdir(vault1Dir, { recursive: true })
            await fs.mkdir(vault2Dir, { recursive: true })

            const vault1Id = randomUUID()
            const vault2Id = randomUUID()

            const config: VaultsConfig = {
                activeVaultId: vault1Id,
                vaults: [
                    { id: vault1Id, name: 'Vault One', path: vault1Dir, exists: true },
                    { id: vault2Id, name: 'Vault Two', path: vault2Dir, exists: true },
                ],
            }

            await fs.mkdir(configDir, { recursive: true })
            await fs.writeFile(path.join(configDir, 'vault-config.json'), JSON.stringify(config))

            const result = await service.getVaultsConfig()

            expect(result.vaults).toHaveLength(2)
            expect(result.activeVaultId).toBe(vault1Id)
            expect(result.vaults[0].name).toBe('Vault One')
            expect(result.vaults[1].name).toBe('Vault Two')
        })

        test('should validate vault paths on read', async () => {
            const existingVaultDir = path.join(tempDir, 'exists')
            const deletedVaultDir = path.join(tempDir, 'deleted')
            await fs.mkdir(existingVaultDir, { recursive: true })
            // Don't create deletedVaultDir

            const config: VaultsConfig = {
                activeVaultId: randomUUID(),
                vaults: [
                    { id: randomUUID(), name: 'Exists', path: existingVaultDir, exists: true },
                    { id: randomUUID(), name: 'Deleted', path: deletedVaultDir, exists: true },
                ],
            }

            await fs.mkdir(configDir, { recursive: true })
            await fs.writeFile(path.join(configDir, 'vault-config.json'), JSON.stringify(config))

            const result = await service.getVaultsConfig()

            const existsVault = result.vaults.find((v) => v.name === 'Exists')
            const deletedVault = result.vaults.find((v) => v.name === 'Deleted')

            expect(existsVault?.exists).toBe(true)
            expect(deletedVault?.exists).toBe(false)
        })
    })

    describe('addVault', () => {
        test('should add new vault successfully', async () => {
            const vaultDir = path.join(tempDir, 'new-vault')
            await fs.mkdir(vaultDir, { recursive: true })

            const vault = await service.addVault('My New Vault', vaultDir)

            expect(vault).not.toBeNull()
            expect(vault?.name).toBe('My New Vault')
            expect(vault?.path).toBe(vaultDir)
            expect(vault?.exists).toBe(true)

            const config = await service.getVaultsConfig()
            expect(config.vaults).toHaveLength(1)
            expect(config.activeVaultId).toBe(vault?.id)
        })

        test('should use "Vault" as default name if empty', async () => {
            const vaultDir = path.join(tempDir, 'unnamed-vault')
            await fs.mkdir(vaultDir, { recursive: true })

            const vault = await service.addVault('  ', vaultDir)

            expect(vault?.name).toBe('Vault')
        })

        test('should return null if vault path does not exist', async () => {
            const nonExistentPath = path.join(tempDir, 'does-not-exist')

            const vault = await service.addVault('Test', nonExistentPath)

            expect(vault).toBeNull()
        })

        test('should set as active if first vault', async () => {
            const vaultDir = path.join(tempDir, 'first-vault')
            await fs.mkdir(vaultDir, { recursive: true })

            const vault = await service.addVault('First', vaultDir)

            const config = await service.getVaultsConfig()
            expect(config.activeVaultId).toBe(vault?.id)
        })

        test('should set new vault as active when adding second vault', async () => {
            const vault1Dir = path.join(tempDir, 'vault1')
            const vault2Dir = path.join(tempDir, 'vault2')
            await fs.mkdir(vault1Dir, { recursive: true })
            await fs.mkdir(vault2Dir, { recursive: true })

            const vault1 = await service.addVault('First', vault1Dir)
            const vault2 = await service.addVault('Second', vault2Dir)

            const config = await service.getVaultsConfig()
            expect(config.activeVaultId).toBe(vault2?.id)
        })
    })

    describe('setActiveVault', () => {
        test('should set active vault successfully', async () => {
            const vault1Dir = path.join(tempDir, 'vault1')
            const vault2Dir = path.join(tempDir, 'vault2')
            await fs.mkdir(vault1Dir, { recursive: true })
            await fs.mkdir(vault2Dir, { recursive: true })

            const vault1 = await service.addVault('First', vault1Dir)
            const vault2 = await service.addVault('Second', vault2Dir)

            const success = await service.setActiveVault(vault2!.id)

            expect(success).toBe(true)

            const config = await service.getVaultsConfig()
            expect(config.activeVaultId).toBe(vault2?.id)
        })

        test('should return false for non-existent vault ID', async () => {
            const success = await service.setActiveVault(randomUUID())
            expect(success).toBe(false)
        })
    })

    describe('getActiveVault', () => {
        test('should return active vault', async () => {
            const vaultDir = path.join(tempDir, 'active-vault')
            await fs.mkdir(vaultDir, { recursive: true })

            const vault = await service.addVault('Active', vaultDir)

            const activeVault = await service.getActiveVault()

            expect(activeVault?.id).toBe(vault?.id)
            expect(activeVault?.name).toBe('Active')
        })

        test('should return null when no active vault', async () => {
            const activeVault = await service.getActiveVault()
            expect(activeVault).toBeNull()
        })

        test('should return null when active vault path does not exist', async () => {
            const vaultDir = path.join(tempDir, 'deleted-vault')
            await fs.mkdir(vaultDir, { recursive: true })

            const vault = await service.addVault('Will Delete', vaultDir)

            // Delete the directory
            await fs.rm(vaultDir, { recursive: true, force: true })

            // Force re-read (which validates paths)
            const activeVault = await service.getActiveVault()
            expect(activeVault).toBeNull()
        })
    })

    describe('removeVault', () => {
        test('should remove vault from config', async () => {
            const vaultDir = path.join(tempDir, 'to-remove')
            await fs.mkdir(vaultDir, { recursive: true })

            const vault = await service.addVault('To Remove', vaultDir)

            const success = await service.removeVault(vault!.id)

            expect(success).toBe(true)

            const config = await service.getVaultsConfig()
            expect(config.vaults).toHaveLength(0)
        })

        test('should not delete vault folder', async () => {
            const vaultDir = path.join(tempDir, 'keep-folder')
            await fs.mkdir(vaultDir, { recursive: true })
            await fs.writeFile(path.join(vaultDir, 'test.txt'), 'content')

            const vault = await service.addVault('Keep', vaultDir)
            await service.removeVault(vault!.id)

            // Folder should still exist
            const folderExists = await fs
                .access(vaultDir)
                .then(() => true)
                .catch(() => false)
            expect(folderExists).toBe(true)

            const fileContent = await fs.readFile(path.join(vaultDir, 'test.txt'), 'utf-8')
            expect(fileContent).toBe('content')
        })

        test('should delete associated secrets file when removing vault', async () => {
            const vaultDir = path.join(tempDir, 'vault-with-secrets')
            await fs.mkdir(vaultDir, { recursive: true })

            const vault = await service.addVault('Vault With Secrets', vaultDir)

            // Save some secrets for this vault
            const testSecrets = {
                version: '1.0.0' as const,
                secrets: {
                    API_KEY: { value: 'secret-123', encrypted: false },
                },
            }
            await secretsHandler.saveSecrets(vault!.id, testSecrets)

            // Verify secrets file exists
            const secretsExistBefore = await secretsHandler.secretsFileExists(vault!.id)
            expect(secretsExistBefore).toBe(true)

            // Remove the vault
            await service.removeVault(vault!.id)

            // Verify secrets file is deleted
            const secretsExistAfter = await secretsHandler.secretsFileExists(vault!.id)
            expect(secretsExistAfter).toBe(false)
        })

        test('should clear active vault if removed vault was active', async () => {
            const vault1Dir = path.join(tempDir, 'vault1')
            const vault2Dir = path.join(tempDir, 'vault2')
            await fs.mkdir(vault1Dir, { recursive: true })
            await fs.mkdir(vault2Dir, { recursive: true })

            const vault1 = await service.addVault('First', vault1Dir)
            const vault2 = await service.addVault('Second', vault2Dir)

            await service.removeVault(vault1!.id)

            const config = await service.getVaultsConfig()
            // Should switch to the remaining vault
            expect(config.activeVaultId).toBe(vault2?.id)
        })

        test('should return false for non-existent vault ID', async () => {
            const success = await service.removeVault(randomUUID())
            expect(success).toBe(false)
        })
    })

    describe('validateVaultPaths', () => {
        test('should identify invalid vault paths', async () => {
            const existingDir = path.join(tempDir, 'exists')
            const deletedDir = path.join(tempDir, 'deleted')
            await fs.mkdir(existingDir, { recursive: true })
            await fs.mkdir(deletedDir, { recursive: true })

            await service.addVault('Exists', existingDir)
            const deletedVault = await service.addVault('Deleted', deletedDir)

            // Delete one directory
            await fs.rm(deletedDir, { recursive: true, force: true })

            const invalidVaults = await service.validateVaultPaths()

            expect(invalidVaults).toHaveLength(1)
            expect(invalidVaults[0].id).toBe(deletedVault?.id)
        })

        test('should update exists status in config', async () => {
            const vaultDir = path.join(tempDir, 'temp-vault')
            await fs.mkdir(vaultDir, { recursive: true })

            const vault = await service.addVault('Temp', vaultDir)
            await fs.rm(vaultDir, { recursive: true, force: true })

            await service.validateVaultPaths()

            const config = await service.getVaultsConfig()
            const updatedVault = config.vaults.find((v) => v.id === vault?.id)
            expect(updatedVault?.exists).toBe(false)
        })
    })

    describe('getActiveVaultPath', () => {
        test('should return path of active vault', async () => {
            const vaultDir = path.join(tempDir, 'active')
            await fs.mkdir(vaultDir, { recursive: true })

            await service.addVault('Active', vaultDir)

            const activePath = await service.getActiveVaultPath()
            expect(activePath).toBe(vaultDir)
        })

        test('should return null when no active vault', async () => {
            const activePath = await service.getActiveVaultPath()
            expect(activePath).toBeNull()
        })
    })

    describe('hasActiveVault', () => {
        test('should return true when vault is active', async () => {
            const vaultDir = path.join(tempDir, 'active')
            await fs.mkdir(vaultDir, { recursive: true })

            await service.addVault('Active', vaultDir)

            expect(await service.hasActiveVault()).toBe(true)
        })

        test('should return false when no vault', async () => {
            expect(await service.hasActiveVault()).toBe(false)
        })
    })

    describe('updateVaultName', () => {
        test('should update vault name', async () => {
            const vaultDir = path.join(tempDir, 'vault')
            await fs.mkdir(vaultDir, { recursive: true })

            const vault = await service.addVault('Old Name', vaultDir)

            const success = await service.updateVaultName(vault!.id, 'New Name')

            expect(success).toBe(true)

            const config = await service.getVaultsConfig()
            expect(config.vaults[0].name).toBe('New Name')
        })

        test('should use "Vault" as default if empty name', async () => {
            const vaultDir = path.join(tempDir, 'vault')
            await fs.mkdir(vaultDir, { recursive: true })

            const vault = await service.addVault('Old Name', vaultDir)
            await service.updateVaultName(vault!.id, '   ')

            const config = await service.getVaultsConfig()
            expect(config.vaults[0].name).toBe('Vault')
        })

        test('should return false for non-existent vault', async () => {
            const success = await service.updateVaultName(randomUUID(), 'New Name')
            expect(success).toBe(false)
        })
    })

    describe('generateVaultNameFromPath', () => {
        test('should convert kebab-case to Title Case', async () => {
            const vaultDir = path.join(tempDir, 'my-awesome-vault')
            await fs.mkdir(vaultDir, { recursive: true })

            const legacyConfig = { vaultPath: vaultDir }
            await fs.mkdir(configDir, { recursive: true })
            await fs.writeFile(path.join(configDir, 'vault-config.json'), JSON.stringify(legacyConfig))

            const config = await service.getVaultsConfig()
            expect(config.vaults[0].name).toBe('My Awesome Vault')
        })

        test('should convert snake_case to Title Case', async () => {
            const vaultDir = path.join(tempDir, 'my_awesome_vault')
            await fs.mkdir(vaultDir, { recursive: true })

            const legacyConfig = { vaultPath: vaultDir }
            await fs.mkdir(configDir, { recursive: true })
            await fs.writeFile(path.join(configDir, 'vault-config.json'), JSON.stringify(legacyConfig))

            const config = await service.getVaultsConfig()
            expect(config.vaults[0].name).toBe('My Awesome Vault')
        })
    })
})
