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

    test('resolves Git Bash from PATH on Windows', async () => {
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

    test('prefers common Git Bash install locations over incompatible bash.exe on PATH', async () => {
        const systemBashPath = path.win32.join('C:\\Windows\\System32', 'bash.exe')
        const expectedPath = path.win32.join('C:\\Program Files', 'Git', 'bin', 'bash.exe')
        const fileExists = jest.fn<Promise<boolean>, [string]>().mockImplementation(async (filePath) => {
            return filePath === systemBashPath || filePath === expectedPath
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

    test('ignores incompatible bash.exe candidates before Git Bash on PATH', async () => {
        const systemBashPath = path.win32.join('C:\\Windows\\System32', 'bash.exe')
        const gitBinPath = 'D:\\Tools\\Git\\bin'
        const expectedPath = path.win32.join(gitBinPath, 'bash.exe')
        const fileExists = jest.fn<Promise<boolean>, [string]>().mockImplementation(async (filePath) => {
            return filePath === systemBashPath || filePath === expectedPath
        })
        const service = new BashRuntimeService({
            platform: 'win32',
            env: {
                PATH: `C:\\Windows\\System32;${gitBinPath}`,
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
            'Git Bash not found. Install Git for Windows or put Git Bash ahead of incompatible bash.exe entries on PATH',
        )
    })

    test('reports rejected incompatible bash.exe candidates when Git Bash cannot be found on Windows', async () => {
        const systemBashPath = path.win32.join('C:\\Windows\\System32', 'bash.exe')
        const wslBashPath = path.win32.join('C:\\Windows\\System32\\Wsl', 'bash.exe')
        const fileExists = jest.fn<Promise<boolean>, [string]>().mockImplementation(async (filePath) => {
            return filePath === systemBashPath || filePath === wslBashPath
        })
        const service = new BashRuntimeService({
            platform: 'win32',
            env: {
                PATH: 'C:\\Windows\\System32;C:\\Windows\\System32\\Wsl',
                ProgramFiles: 'C:\\Program Files',
            },
            fileExists,
        })

        await expect(service.resolveCommand()).rejects.toThrow(
            `Rejected non-Git Bash candidates found on PATH: ${systemBashPath}, ${wslBashPath}`,
        )
    })
})
