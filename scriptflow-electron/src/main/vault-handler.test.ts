import { VaultHandler, ScriptEntry } from './vault-handler'
import { MultiVaultService } from './multi-vault-service'
import { SecretsHandler } from './secrets-handler'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'
import { app } from 'electron'

// Mock electron app
jest.mock('electron', () => ({
    app: {
        getPath: jest.fn(),
    },
    dialog: {
        showOpenDialog: jest.fn(),
    },
    BrowserWindow: jest.fn(),
}))

describe('VaultHandler Script Management', () => {
    let vaultHandler: VaultHandler
    let multiVaultService: MultiVaultService
    let secretsHandler: SecretsHandler
    let tempDir: string
    let vaultDir: string

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scriptflow-test-'))
        vaultDir = path.join(tempDir, 'vault')
        await fs.mkdir(vaultDir, { recursive: true })

        ;(app.getPath as jest.Mock).mockReturnValue(tempDir)

        const configDir = path.join(tempDir, 'config')
        secretsHandler = new SecretsHandler(configDir)
        multiVaultService = new MultiVaultService(configDir, secretsHandler)
        vaultHandler = new VaultHandler(multiVaultService)
        await vaultHandler.initializeVault(vaultDir, 'Test Vault')
    })

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true })
    })

    it('should add a script to a subsection', async () => {
        const section = await vaultHandler.addSection('Test Section')
        expect(section).not.toBeNull()

        const subSectionResult = await vaultHandler.addSubSection(section!.id, 'Test Workflow')
        expect(subSectionResult).not.toBeNull()
        const { key } = subSectionResult!

        const scriptData = { type: 'bash' as const, path: '/tmp/test.sh', placement: 0 }
        const script = await vaultHandler.addScriptToSubSection(section!.id, key, scriptData)

        expect(script).not.toBeNull()
        expect(script!.type).toBe('bash')
        expect(script!.path).toBe('/tmp/test.sh')
        expect(script!.id).toBeDefined()

        // Verify via getSections
        const sections = await vaultHandler.getSections()
        const savedScript = sections[0]['sub-sections'][key].scripts![0]
        expect(savedScript).toEqual(script)
    })

    it('should remove a script from a subsection', async () => {
        const section = await vaultHandler.addSection('Test Section')
        const { key } = (await vaultHandler.addSubSection(section!.id, 'Test Workflow'))!

        const script = await vaultHandler.addScriptToSubSection(section!.id, key, {
            type: 'python',
            path: '/tmp/test.py',
            placement: 0,
        })

        const success = await vaultHandler.removeScriptFromSubSection(section!.id, key, script!.id)
        expect(success).toBe(true)

        const sections = await vaultHandler.getSections()
        expect(sections[0]['sub-sections'][key].scripts).toHaveLength(0)
    })

    it('should update a script in a subsection', async () => {
        const section = await vaultHandler.addSection('Test Section')
        const { key } = (await vaultHandler.addSubSection(section!.id, 'Test Workflow'))!

        const script = await vaultHandler.addScriptToSubSection(section!.id, key, {
            type: 'csharp',
            path: '/tmp/test.cs',
            placement: 0,
        })

        const updatedScript: ScriptEntry = { ...script!, path: '/tmp/updated.cs' }
        const success = await vaultHandler.updateScriptInSubSection(section!.id, key, updatedScript)
        expect(success).toBe(true)

        const sections = await vaultHandler.getSections()
        const savedScript = sections[0]['sub-sections'][key].scripts![0]
        expect(savedScript.path).toBe('/tmp/updated.cs')
    })

    describe('Duplication', () => {
        it('should duplicate a section with contents and insert it after the original', async () => {
            const section = await vaultHandler.addSection('First')
            const { key } = (await vaultHandler.addSubSection(section!.id, 'Workflow'))!
            const script = await vaultHandler.addScriptToSubSection(section!.id, key, {
                type: 'bash',
                path: '/tmp/test.sh',
                placement: 0,
            })

            await vaultHandler.addSection('Second')

            const duplicated = await vaultHandler.duplicateSection(section!.id)
            expect(duplicated).not.toBeNull()

            const sections = await vaultHandler.getSections()
            expect(sections).toHaveLength(3)
            expect(sections[1].title).toBe('First New')
            expect(sections.map((s) => s.placement)).toEqual([0, 1, 2])

            const originalSubSections = sections[0]['sub-sections']
            const duplicatedSubSections = sections[1]['sub-sections']
            expect(Object.keys(duplicatedSubSections)).toHaveLength(Object.keys(originalSubSections).length)
            Object.keys(duplicatedSubSections).forEach((keyValue) => {
                expect(originalSubSections[keyValue]).toBeUndefined()
            })

            const duplicatedWorkflow = Object.values(duplicatedSubSections)[0]
            expect(duplicatedWorkflow.title).toBe('Workflow')
            expect(duplicatedWorkflow.scripts).toHaveLength(1)
            expect(duplicatedWorkflow.scripts![0].path).toBe(script!.path)
            expect(duplicatedWorkflow.scripts![0].id).not.toBe(script!.id)
        })

        it('should duplicate a subsection and insert it after the original', async () => {
            const section = await vaultHandler.addSection('Section')
            const { key: alphaKey } = (await vaultHandler.addSubSection(section!.id, 'Alpha'))!
            const { key: betaKey } = (await vaultHandler.addSubSection(section!.id, 'Beta'))!
            const script = await vaultHandler.addScriptToSubSection(section!.id, alphaKey, {
                type: 'python',
                path: '/tmp/a.py',
                placement: 0,
            })

            const duplicated = await vaultHandler.duplicateSubSection(section!.id, alphaKey)
            expect(duplicated).not.toBeNull()

            const sections = await vaultHandler.getSections()
            const subSections = sections[0]['sub-sections']
            const sorted = Object.entries(subSections).sort((a, b) => a[1].placement - b[1].placement)

            expect(sorted).toHaveLength(3)
            expect(sorted.map(([_, subSection]) => subSection.title)).toEqual(['Alpha', 'Alpha New', 'Beta'])
            expect(sorted.map(([_, subSection]) => subSection.placement)).toEqual([0, 1, 2])

            const duplicatedEntry = sorted[1][1]
            expect(duplicatedEntry.scripts).toHaveLength(1)
            expect(duplicatedEntry.scripts![0].path).toBe(script!.path)
            expect(duplicatedEntry.scripts![0].id).not.toBe(script!.id)
            expect(sorted[2][0]).toBe(betaKey)
        })

        it('should duplicate a script entry and insert it after the original with connector', async () => {
            const section = await vaultHandler.addSection('Section')
            const { key } = (await vaultHandler.addSubSection(section!.id, 'Workflow'))!
            const script = await vaultHandler.addScriptToSubSection(section!.id, key, {
                type: 'bash',
                path: '/tmp/a.sh',
                placement: 0,
                name: 'Build',
                successCondition: {
                    type: 'contains',
                    value: 'OK',
                    enabled: true,
                },
            })

            const duplicated = await vaultHandler.duplicateScriptInSubSection(section!.id, key, script!.id)
            expect(duplicated).not.toBeNull()
            expect(duplicated!.id).not.toBe(script!.id)
            expect(duplicated!.name).toBe('Build New')
            expect(duplicated!.successCondition).toEqual(script!.successCondition)

            const sections = await vaultHandler.getSections()
            const scripts = sections[0]['sub-sections'][key].scripts || []
            expect(scripts).toHaveLength(2)
            expect(scripts[0].id).toBe(script!.id)
            expect(scripts[1].id).toBe(duplicated!.id)
        })
    })

    describe('VaultHandler Path Resolution', () => {
        let vaultHandler: VaultHandler
        let multiVaultService: MultiVaultService
        let secretsHandler: SecretsHandler
        let tempDir: string
        let vaultDir: string

        beforeEach(async () => {
            tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scriptflow-test-'))
            vaultDir = path.join(tempDir, 'vault')
            await fs.mkdir(vaultDir, { recursive: true })

            ;(app.getPath as jest.Mock).mockReturnValue(tempDir)

            const configDir = path.join(tempDir, 'config')
            secretsHandler = new SecretsHandler(configDir)
            multiVaultService = new MultiVaultService(configDir, secretsHandler)
            vaultHandler = new VaultHandler(multiVaultService)
            await vaultHandler.initializeVault(vaultDir, 'Test Vault')
        })

        afterEach(async () => {
            await fs.rm(tempDir, { recursive: true, force: true })
        })

        describe('resolveScriptPath', () => {
            it('should return absolute paths unchanged', async () => {
                const absolutePath = '/some/absolute/path/script.sh'
                const resolved = await vaultHandler.resolveScriptPath(absolutePath)
                expect(resolved).toBe(absolutePath)
            })

            it('should resolve relative paths from vault directory', async () => {
                const relativePath = 'scripts/test.sh'
                const resolved = await vaultHandler.resolveScriptPath(relativePath)
                expect(resolved).toBe(path.join(vaultDir, 'scripts/test.sh'))
            })

            it('should resolve relative paths with subdirectories', async () => {
                const relativePath = 'examples/nested/deep/script.py'
                const resolved = await vaultHandler.resolveScriptPath(relativePath)
                expect(resolved).toBe(path.join(vaultDir, 'examples/nested/deep/script.py'))
            })
        })

        describe('makeRelativePath', () => {
            it('should convert absolute path to relative path from vault', async () => {
                const absolutePath = path.join(vaultDir, 'scripts/test.sh')
                const relative = await vaultHandler.makeRelativePath(absolutePath)
                expect(relative).toBe('scripts/test.sh')
            })

            it('should return relative paths unchanged', async () => {
                const relativePath = 'scripts/test.sh'
                const result = await vaultHandler.makeRelativePath(relativePath)
                expect(result).toBe(relativePath)
            })

            it('should handle paths outside vault by keeping them absolute', async () => {
                const outsidePath = '/some/other/path/script.sh'
                const result = await vaultHandler.makeRelativePath(outsidePath)
                expect(result).toBe(outsidePath)
            })

            it('should handle nested paths correctly', async () => {
                const absolutePath = path.join(vaultDir, 'examples/nested/script.cs')
                const relative = await vaultHandler.makeRelativePath(absolutePath)
                expect(relative).toBe('examples/nested/script.cs')
            })
        })
    })
})
