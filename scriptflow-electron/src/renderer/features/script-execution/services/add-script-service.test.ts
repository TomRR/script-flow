import { AddScriptService, AddScriptResult } from './add-script-service'
import { ScriptEntry } from '../../../../renderer'

describe('AddScriptService', () => {
    const mockVault = {
        addScriptToSubSection: jest.fn(),
    }

    beforeAll(() => {
        Object.defineProperty(window, 'api', {
            value: {
                vault: mockVault,
            },
            writable: true,
        })
    })

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('addScriptsFromFiles', () => {
        test('adds multiple scripts successfully', async () => {
            const mockScripts: ScriptEntry[] = [
                { id: '1', name: 'deploy', type: 'bash', path: 'scripts/deploy.sh', placement: 0 },
                { id: '2', name: 'build', type: 'python', path: 'scripts/build.py', placement: 0 },
            ]
            mockVault.addScriptToSubSection.mockResolvedValueOnce(mockScripts[0]).mockResolvedValueOnce(mockScripts[1])

            const result = await AddScriptService.addScriptsFromFiles('section-1', 'sub-1', [
                'scripts/deploy.sh',
                'scripts/build.py',
            ])

            expect(result.success).toHaveLength(2)
            expect(result.failed).toHaveLength(0)
            expect(mockVault.addScriptToSubSection).toHaveBeenCalledTimes(2)
        })

        test('handles partial failures gracefully', async () => {
            const mockScript: ScriptEntry = {
                id: '1',
                name: 'deploy',
                type: 'bash',
                path: 'scripts/deploy.sh',
                placement: 0,
            }
            mockVault.addScriptToSubSection.mockResolvedValueOnce(mockScript).mockResolvedValueOnce(null)

            const result = await AddScriptService.addScriptsFromFiles('section-1', 'sub-1', [
                'scripts/deploy.sh',
                'scripts/failed.py',
            ])

            expect(result.success).toHaveLength(1)
            expect(result.failed).toContain('scripts/failed.py')
        })

        test('returns empty arrays when all scripts fail', async () => {
            mockVault.addScriptToSubSection.mockResolvedValue(null)

            const result = await AddScriptService.addScriptsFromFiles('section-1', 'sub-1', [
                'scripts/script1.sh',
                'scripts/script2.py',
            ])

            expect(result.success).toHaveLength(0)
            expect(result.failed).toHaveLength(2)
        })

        test('handles empty file paths array', async () => {
            const result = await AddScriptService.addScriptsFromFiles('section-1', 'sub-1', [])

            expect(result.success).toHaveLength(0)
            expect(result.failed).toHaveLength(0)
            expect(mockVault.addScriptToSubSection).not.toHaveBeenCalled()
        })

        test('continues adding scripts even if one throws an error', async () => {
            const mockScript: ScriptEntry = {
                id: '1',
                name: 'deploy',
                type: 'bash',
                path: 'scripts/deploy.sh',
                placement: 0,
            }
            mockVault.addScriptToSubSection
                .mockResolvedValueOnce(mockScript)
                .mockRejectedValueOnce(new Error('IPC error'))

            const result = await AddScriptService.addScriptsFromFiles('section-1', 'sub-1', [
                'scripts/deploy.sh',
                'scripts/error.py',
            ])

            expect(result.success).toHaveLength(1)
            expect(result.failed).toContain('scripts/error.py')
        })
    })

    describe('addSingleScript', () => {
        test('creates script with detected type and name', async () => {
            const mockScript: ScriptEntry = {
                id: '1',
                name: 'deploy',
                type: 'bash',
                path: 'scripts/deploy.sh',
                placement: 0,
            }
            mockVault.addScriptToSubSection.mockResolvedValue(mockScript)

            const result = await AddScriptService.addSingleScript('section-1', 'sub-1', 'scripts/deploy.sh')

            expect(result).toEqual(mockScript)
            expect(mockVault.addScriptToSubSection).toHaveBeenCalledWith(
                'section-1',
                'sub-1',
                expect.objectContaining({
                    type: 'bash',
                    path: 'scripts/deploy.sh',
                    name: 'deploy',
                }),
            )
        })

        test('returns null when vault operation fails', async () => {
            mockVault.addScriptToSubSection.mockResolvedValue(null)

            const result = await AddScriptService.addSingleScript('section-1', 'sub-1', 'scripts/deploy.sh')

            expect(result).toBeNull()
        })

        test('detects python type for .py files', async () => {
            const mockScript: ScriptEntry = {
                id: '1',
                name: 'build',
                type: 'python',
                path: 'scripts/build.py',
                placement: 0,
            }
            mockVault.addScriptToSubSection.mockResolvedValue(mockScript)

            await AddScriptService.addSingleScript('section-1', 'sub-1', 'scripts/build.py')

            expect(mockVault.addScriptToSubSection).toHaveBeenCalledWith(
                'section-1',
                'sub-1',
                expect.objectContaining({
                    type: 'python',
                    name: 'build',
                }),
            )
        })

        test('detects powershell type for .ps1 files', async () => {
            const mockScript: ScriptEntry = {
                id: '1',
                name: 'install',
                type: 'powershell',
                path: 'scripts/install.ps1',
                placement: 0,
            }
            mockVault.addScriptToSubSection.mockResolvedValue(mockScript)

            await AddScriptService.addSingleScript('section-1', 'sub-1', 'scripts/install.ps1')

            expect(mockVault.addScriptToSubSection).toHaveBeenCalledWith(
                'section-1',
                'sub-1',
                expect.objectContaining({
                    type: 'powershell',
                    name: 'install',
                }),
            )
        })

        test('detects csharp type for .cs files', async () => {
            const mockScript: ScriptEntry = {
                id: '1',
                name: 'Program',
                type: 'csharp',
                path: 'scripts/Program.cs',
                placement: 0,
            }
            mockVault.addScriptToSubSection.mockResolvedValue(mockScript)

            await AddScriptService.addSingleScript('section-1', 'sub-1', 'scripts/Program.cs')

            expect(mockVault.addScriptToSubSection).toHaveBeenCalledWith(
                'section-1',
                'sub-1',
                expect.objectContaining({
                    type: 'csharp',
                    name: 'Program',
                }),
            )
        })

        test('detects custom type for .bat files', async () => {
            const mockScript: ScriptEntry = {
                id: '1',
                name: 'setup',
                type: 'custom',
                path: 'scripts/setup.bat',
                placement: 0,
            }
            mockVault.addScriptToSubSection.mockResolvedValue(mockScript)

            await AddScriptService.addSingleScript('section-1', 'sub-1', 'scripts/setup.bat')

            expect(mockVault.addScriptToSubSection).toHaveBeenCalledWith(
                'section-1',
                'sub-1',
                expect.objectContaining({
                    type: 'custom',
                    name: 'setup',
                }),
            )
        })
    })

    describe('generateScriptName', () => {
        test('extracts name without extension from simple path', () => {
            expect(AddScriptService.generateScriptName('deploy.sh')).toBe('deploy')
        })

        test('extracts name from nested path', () => {
            expect(AddScriptService.generateScriptName('/home/user/scripts/deploy.sh')).toBe('deploy')
        })

        test('handles path with multiple dots correctly', () => {
            expect(AddScriptService.generateScriptName('my.script.name.sh')).toBe('my.script.name')
        })

        test('handles uppercase extension', () => {
            expect(AddScriptService.generateScriptName('BUILD.PY')).toBe('BUILD')
        })

        test('handles empty extension', () => {
            expect(AddScriptService.generateScriptName('Makefile')).toBe('Makefile')
        })
    })

    describe('getValidScriptExtensions', () => {
        test('returns all supported extensions', () => {
            const extensions = AddScriptService.getValidScriptExtensions()

            expect(extensions).toContain('.sh')
            expect(extensions).toContain('.bash')
            expect(extensions).toContain('.ps1')
            expect(extensions).toContain('.ps')
            expect(extensions).toContain('.py')
            expect(extensions).toContain('.cs')
            expect(extensions).toContain('.bat')
            expect(extensions).toContain('.cmd')
            expect(extensions.length).toBe(8)
        })
    })

    describe('isValidScriptExtension', () => {
        test('returns true for valid bash extensions', () => {
            expect(AddScriptService.isValidScriptExtension('script.sh')).toBe(true)
            expect(AddScriptService.isValidScriptExtension('script.bash')).toBe(true)
        })

        test('returns true for valid powershell extensions', () => {
            expect(AddScriptService.isValidScriptExtension('script.ps1')).toBe(true)
            expect(AddScriptService.isValidScriptExtension('script.ps')).toBe(true)
        })

        test('returns true for valid python extension', () => {
            expect(AddScriptService.isValidScriptExtension('script.py')).toBe(true)
        })

        test('returns true for valid csharp extension', () => {
            expect(AddScriptService.isValidScriptExtension('script.cs')).toBe(true)
        })

        test('returns true for valid custom extensions', () => {
            expect(AddScriptService.isValidScriptExtension('script.bat')).toBe(true)
            expect(AddScriptService.isValidScriptExtension('script.cmd')).toBe(true)
        })

        test('returns true for uppercase extensions (case-insensitive)', () => {
            expect(AddScriptService.isValidScriptExtension('script.SH')).toBe(true)
            expect(AddScriptService.isValidScriptExtension('script.PY')).toBe(true)
            expect(AddScriptService.isValidScriptExtension('script.PS1')).toBe(true)
        })

        test('returns false for unsupported extensions', () => {
            expect(AddScriptService.isValidScriptExtension('script.js')).toBe(false)
            expect(AddScriptService.isValidScriptExtension('script.rb')).toBe(false)
            expect(AddScriptService.isValidScriptExtension('document.pdf')).toBe(false)
        })

        test('returns false for files without extension', () => {
            expect(AddScriptService.isValidScriptExtension('Makefile')).toBe(false)
        })
    })

    describe('filterValidScriptFiles', () => {
        test('filters valid script files from mixed list', () => {
            const files = ['deploy.sh', 'build.py', 'document.pdf', 'install.ps1', 'readme.txt', 'Program.cs']

            const filtered = AddScriptService.filterValidScriptFiles(files)

            expect(filtered).toHaveLength(4)
            expect(filtered).toContain('deploy.sh')
            expect(filtered).toContain('build.py')
            expect(filtered).toContain('install.ps1')
            expect(filtered).toContain('Program.cs')
            expect(filtered).not.toContain('document.pdf')
            expect(filtered).not.toContain('readme.txt')
        })

        test('handles empty array', () => {
            const filtered = AddScriptService.filterValidScriptFiles([])
            expect(filtered).toHaveLength(0)
        })

        test('handles array with no valid files', () => {
            const files = ['document.pdf', 'readme.txt', 'image.jpg']
            const filtered = AddScriptService.filterValidScriptFiles(files)
            expect(filtered).toHaveLength(0)
        })

        test('handles case-insensitive extensions correctly', () => {
            const files = ['script.SH', 'script.py', 'script.PY', 'script.Sh']
            const filtered = AddScriptService.filterValidScriptFiles(files)

            expect(filtered).toHaveLength(4)
            expect(filtered).toContain('script.SH')
            expect(filtered).toContain('script.py')
            expect(filtered).toContain('script.PY')
            expect(filtered).toContain('script.Sh')
        })
    })
})
