import { SecretsHandler, SecretsData } from './secrets-handler'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'

describe('SecretsHandler', () => {
    let handler: SecretsHandler
    let tempDir: string

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scriptflow-secrets-test-'))
        handler = new SecretsHandler(tempDir)
    })

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true })
    })

    describe('getSecrets', () => {
        test('should return default secrets when file does not exist', async () => {
            const secrets = await handler.getSecrets('non-existent-vault-id')

            expect(secrets).toEqual({
                version: '1.0.0',
                secrets: {},
            })
        })

        test('should read existing secrets file', async () => {
            const vaultId = 'test-vault-123'
            const testData: SecretsData = {
                version: '1.0.0',
                secrets: {
                    API_KEY: { value: 'secret-value', encrypted: false },
                    PASSWORD: { value: 'my-password', encrypted: true },
                },
            }

            await fs.mkdir(tempDir, { recursive: true })
            await fs.writeFile(path.join(tempDir, `${vaultId}.secrets.json`), JSON.stringify(testData))

            const secrets = await handler.getSecrets(vaultId)

            expect(secrets).toEqual(testData)
        })

        test('should return default for invalid JSON', async () => {
            const vaultId = 'corrupted-vault'

            await fs.mkdir(tempDir, { recursive: true })
            await fs.writeFile(path.join(tempDir, `${vaultId}.secrets.json`), 'invalid json content')

            const secrets = await handler.getSecrets(vaultId)

            expect(secrets).toEqual({
                version: '1.0.0',
                secrets: {},
            })
        })
    })

    describe('saveSecrets', () => {
        test('should save secrets to file', async () => {
            const vaultId = 'test-vault-456'
            const testData: SecretsData = {
                version: '1.0.0',
                secrets: {
                    SECRET_KEY: { value: 'my-secret', encrypted: false },
                },
            }

            await handler.saveSecrets(vaultId, testData)

            const filePath = path.join(tempDir, `${vaultId}.secrets.json`)
            const content = await fs.readFile(filePath, 'utf-8')
            const savedData = JSON.parse(content)

            expect(savedData).toEqual(testData)
        })

        test('should create config directory if it does not exist', async () => {
            const nestedDir = path.join(tempDir, 'nested', 'config')
            const nestedHandler = new SecretsHandler(nestedDir)
            const vaultId = 'new-vault'
            const testData: SecretsData = {
                version: '1.0.0',
                secrets: {},
            }

            await nestedHandler.saveSecrets(vaultId, testData)

            const filePath = path.join(nestedDir, `${vaultId}.secrets.json`)
            const exists = await fs
                .access(filePath)
                .then(() => true)
                .catch(() => false)
            expect(exists).toBe(true)
        })

        test('should overwrite existing secrets', async () => {
            const vaultId = 'test-vault-789'
            const initialData: SecretsData = {
                version: '1.0.0',
                secrets: {
                    OLD_KEY: { value: 'old-value', encrypted: false },
                },
            }
            const newData: SecretsData = {
                version: '1.0.0',
                secrets: {
                    NEW_KEY: { value: 'new-value', encrypted: true },
                },
            }

            await handler.saveSecrets(vaultId, initialData)
            await handler.saveSecrets(vaultId, newData)

            const secrets = await handler.getSecrets(vaultId)
            expect(secrets).toEqual(newData)
            expect(secrets.secrets['OLD_KEY']).toBeUndefined()
        })
    })

    describe('deleteSecrets', () => {
        test('should delete existing secrets file', async () => {
            const vaultId = 'vault-to-delete'
            const testData: SecretsData = {
                version: '1.0.0',
                secrets: { KEY: { value: 'value', encrypted: false } },
            }

            await handler.saveSecrets(vaultId, testData)

            const success = await handler.deleteSecrets(vaultId)

            expect(success).toBe(true)

            const filePath = path.join(tempDir, `${vaultId}.secrets.json`)
            const exists = await fs
                .access(filePath)
                .then(() => true)
                .catch(() => false)
            expect(exists).toBe(false)
        })

        test('should return true when file does not exist', async () => {
            const vaultId = 'never-existed'

            const success = await handler.deleteSecrets(vaultId)

            expect(success).toBe(true)
        })
    })

    describe('secretsFileExists', () => {
        test('should return true when file exists', async () => {
            const vaultId = 'existing-vault'
            const testData: SecretsData = {
                version: '1.0.0',
                secrets: {},
            }

            await handler.saveSecrets(vaultId, testData)

            const exists = await handler.secretsFileExists(vaultId)

            expect(exists).toBe(true)
        })

        test('should return false when file does not exist', async () => {
            const vaultId = 'non-existing-vault'

            const exists = await handler.secretsFileExists(vaultId)

            expect(exists).toBe(false)
        })
    })

    describe('file naming', () => {
        test('should use vaultId.secrets.json naming pattern', async () => {
            const vaultId = 'a13bc3f-6445-4536-b9ee-7073d743cd85'
            const testData: SecretsData = {
                version: '1.0.0',
                secrets: { TEST: { value: 'test', encrypted: false } },
            }

            await handler.saveSecrets(vaultId, testData)

            const expectedFileName = 'a13bc3f-6445-4536-b9ee-7073d743cd85.secrets.json'
            const filePath = path.join(tempDir, expectedFileName)
            const exists = await fs
                .access(filePath)
                .then(() => true)
                .catch(() => false)

            expect(exists).toBe(true)
        })

        test('should isolate secrets between different vaults', async () => {
            const vaultId1 = 'vault-one-123'
            const vaultId2 = 'vault-two-456'

            const secrets1: SecretsData = {
                version: '1.0.0',
                secrets: { SECRET_1: { value: 'value1', encrypted: false } },
            }
            const secrets2: SecretsData = {
                version: '1.0.0',
                secrets: { SECRET_2: { value: 'value2', encrypted: false } },
            }

            await handler.saveSecrets(vaultId1, secrets1)
            await handler.saveSecrets(vaultId2, secrets2)

            const retrieved1 = await handler.getSecrets(vaultId1)
            const retrieved2 = await handler.getSecrets(vaultId2)

            expect(retrieved1.secrets['SECRET_1']).toBeDefined()
            expect(retrieved1.secrets['SECRET_2']).toBeUndefined()
            expect(retrieved2.secrets['SECRET_2']).toBeDefined()
            expect(retrieved2.secrets['SECRET_1']).toBeUndefined()
        })
    })
})
