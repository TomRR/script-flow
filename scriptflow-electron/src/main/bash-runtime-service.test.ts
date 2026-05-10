import path from 'node:path'
import { BashRuntimeService } from './bash-runtime-service'

describe('BashRuntimeService', () => {
    test('returns bash directly on non-Windows platforms', async () => {
        const fileExists = jest.fn<Promise<boolean>, [string]>()
        const service = new BashRuntimeService({
            platform: 'linux',
            fileExists,
        })

        await expect(service.resolveCommand()).resolves.toBe('bash')
        expect(fileExists).not.toHaveBeenCalled()
    })

    test('resolves bash.exe from PATH on Windows', async () => {
        const gitBinPath = 'C:\\Program Files\\Git\\bin'
        const expectedPath = path.win32.join(gitBinPath, 'bash.exe')
        const fileExists = jest.fn<Promise<boolean>, [string]>().mockImplementation(async (filePath) => {
            return filePath === expectedPath
        })
        const service = new BashRuntimeService({
            platform: 'win32',
            env: {
                PATH: `${gitBinPath};C:\\Windows\\System32`,
            },
            fileExists,
        })

        await expect(service.resolveCommand()).resolves.toBe(expectedPath)
    })

    test('falls back to common Git Bash install locations on Windows', async () => {
        const expectedPath = path.win32.join('C:\\Program Files', 'Git', 'usr', 'bin', 'bash.exe')
        const fileExists = jest.fn<Promise<boolean>, [string]>().mockImplementation(async (filePath) => {
            return filePath === expectedPath
        })
        const service = new BashRuntimeService({
            platform: 'win32',
            env: {
                PATH: 'C:\\Windows\\System32',
                ProgramFiles: 'C:\\Program Files',
            },
            fileExists,
        })

        await expect(service.resolveCommand()).resolves.toBe(expectedPath)
    })

    test('throws an actionable error when Git Bash cannot be found on Windows', async () => {
        const fileExists = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(false)
        const service = new BashRuntimeService({
            platform: 'win32',
            env: {
                PATH: 'C:\\Windows\\System32',
                ProgramFiles: 'C:\\Program Files',
                'ProgramFiles(x86)': 'C:\\Program Files (x86)',
                LocalAppData: 'C:\\Users\\tom\\AppData\\Local',
            },
            fileExists,
        })

        await expect(service.resolveCommand()).rejects.toThrow(
            'Git Bash not found. Install Git for Windows and ensure bash.exe is available on PATH or in a standard Git installation folder',
        )
    })
})
