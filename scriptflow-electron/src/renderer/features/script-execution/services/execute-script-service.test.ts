import { ScriptEntry, VaultHandler } from '../../../../main/vault-handler'
import { BashRuntimeService } from '../../../../main/bash-runtime-service'
import { MultiVaultService } from '../../../../main/multi-vault-service'
import { SecretsHandler } from '../../../../main/secrets-handler'
import { ExecuteScriptService } from './execute-script-service'
import { execa } from 'execa'
import { MultiValueVariableService } from './multi-value-variable-service'

// Mock execa
jest.mock('execa', () => ({
    execa: jest.fn(),
}))

describe('ExecuteScriptService', () => {
    let service: ExecuteScriptService
    let mockVaultHandler: jest.Mocked<VaultHandler>
    let mockMultiVaultService: jest.Mocked<MultiVaultService>
    let mockSecretsHandler: jest.Mocked<SecretsHandler>
    let mockBashRuntimeService: jest.Mocked<Pick<BashRuntimeService, 'getPlatform' | 'resolveCommand'>>

    beforeEach(() => {
        // Create mock services
        mockVaultHandler = {
            resolveScriptPath: jest.fn().mockResolvedValue('/resolved/path/to/script'),
        } as unknown as jest.Mocked<VaultHandler>

        mockMultiVaultService = {
            getVaultsConfig: jest.fn().mockResolvedValue({
                activeVaultId: 'test-vault',
                vaults: [],
            }),
        } as unknown as jest.Mocked<MultiVaultService>

        mockSecretsHandler = {
            getSecrets: jest.fn().mockResolvedValue({
                version: '1.0.0',
                secrets: {
                    API_KEY: { value: 'secret-123', encrypted: false },
                    DB_PASS: { value: 'password', encrypted: false },
                },
            }),
        } as unknown as jest.Mocked<SecretsHandler>

        mockBashRuntimeService = {
            getPlatform: jest.fn().mockReturnValue('linux'),
            resolveCommand: jest.fn().mockResolvedValue('bash'),
        }

        service = new ExecuteScriptService(
            mockVaultHandler,
            mockMultiVaultService,
            mockSecretsHandler,
            mockBashRuntimeService,
        )
        jest.clearAllMocks()

        // Default mock implementation
        ;(execa as any).mockImplementation(() => {
            const promise = Promise.resolve({ stdout: '', stderr: '' }) as any
            promise.stdout = { on: jest.fn() }
            promise.stderr = { on: jest.fn() }
            return promise
        })
    })

    it('should run a bash script', async () => {
        const script: ScriptEntry = {
            id: '1',
            type: 'bash',
            path: '/scripts/test.sh',
            placement: 0,
        }

        await service.runSingleScript(script)

        expect(mockBashRuntimeService.resolveCommand).toHaveBeenCalled()
        expect(execa).toHaveBeenCalledWith(
            'bash',
            ['/resolved/path/to/script'],
            expect.objectContaining({
                env: expect.any(Object),
            }),
        )
    })

    it('should run a python script', async () => {
        const script: ScriptEntry = {
            id: '2',
            type: 'python',
            path: '/scripts/test.py',
            placement: 0,
        }

        await service.runSingleScript(script)

        expect(mockBashRuntimeService.resolveCommand).not.toHaveBeenCalled()
        expect(execa).toHaveBeenCalledWith(
            'python3',
            ['-u', '/resolved/path/to/script'],
            expect.objectContaining({
                env: expect.any(Object),
            }),
        )
    })

    it('should run a dotnet project directory with --project', async () => {
        const script: ScriptEntry = {
            id: '3',
            type: 'csharp',
            path: '/scripts/TestProject',
            placement: 0,
        }

        mockVaultHandler.resolveScriptPath.mockResolvedValueOnce('/resolved/path/to/TestProject')

        await service.runSingleScript(script)

        expect(execa).toHaveBeenCalledWith(
            'dotnet',
            ['run', '--project', '/resolved/path/to/TestProject'],
            expect.objectContaining({
                env: expect.any(Object),
            }),
        )
    })

    it('should run a dotnet project file with --project', async () => {
        const script: ScriptEntry = {
            id: '3a',
            type: 'csharp',
            path: '/scripts/TestProject/TestProject.csproj',
            placement: 0,
        }

        mockVaultHandler.resolveScriptPath.mockResolvedValueOnce('/resolved/path/to/TestProject/TestProject.csproj')

        await service.runSingleScript(script)

        expect(execa).toHaveBeenCalledWith(
            'dotnet',
            ['run', '--project', '/resolved/path/to/TestProject/TestProject.csproj'],
            expect.objectContaining({
                env: expect.any(Object),
            }),
        )
    })

    it('should run a dotnet single-file app with --file', async () => {
        const script: ScriptEntry = {
            id: '3b',
            type: 'csharp',
            path: '/scripts/Program.cs',
            placement: 0,
        }

        mockVaultHandler.resolveScriptPath.mockResolvedValueOnce('/resolved/path/to/Program.cs')

        await service.runSingleScript(script)

        expect(execa).toHaveBeenCalledWith(
            'dotnet',
            ['run', '--file', '/resolved/path/to/Program.cs'],
            expect.objectContaining({
                env: expect.any(Object),
            }),
        )
    })

    it('should pass environment variables', async () => {
        const script: ScriptEntry = {
            id: '4',
            type: 'bash',
            path: '/scripts/env.sh',
            placement: 0,
            env: { CUSTOM_VAR: MultiValueVariableService.createStatic('custom_value') },
        }

        await service.runSingleScript(script)

        const call = (execa as jest.Mock).mock.calls[0]
        expect(call[2].env.CUSTOM_VAR).toBe('custom_value')
    })

    it('should inject secrets as environment variables', async () => {
        const script: ScriptEntry = {
            id: '5',
            type: 'bash',
            path: '/scripts/secret.sh',
            placement: 0,
            secrets: ['API_KEY'],
        }

        await service.runSingleScript(script)

        expect(mockSecretsHandler.getSecrets).toHaveBeenCalled()
        const call = (execa as jest.Mock).mock.calls[0]
        expect(call[2].env.API_KEY).toBe('secret-123')
    })

    it('should stream output', async () => {
        const script: ScriptEntry = {
            id: '7',
            type: 'bash',
            path: '/scripts/output.sh',
            placement: 0,
        }

        const outputChunks: string[] = []
        const onOutput = (data: string) => outputChunks.push(data)

        // Mock stdout/stderr with data
        ;(execa as any).mockImplementation(() => {
            const promise = Promise.resolve({ stdout: 'line1\nline2', stderr: '' }) as any
            promise.stdout = {
                on: jest.fn((event: string, callback: (chunk: any) => void) => {
                    if (event === 'data') {
                        callback(Buffer.from('line1\n'))
                        callback(Buffer.from('line2'))
                    }
                }),
            }
            promise.stderr = { on: jest.fn() }
            return promise
        })

        await service.runSingleScript(script, onOutput)

        expect(outputChunks).toContain('line1\n')
        expect(outputChunks).toContain('line2')
    })

    it('should translate Windows bash script paths for Git Bash', async () => {
        const script: ScriptEntry = {
            id: '7a',
            type: 'bash',
            path: '/scripts/windows-path.sh',
            placement: 0,
        }

        mockBashRuntimeService.getPlatform.mockReturnValue('win32')
        mockBashRuntimeService.resolveCommand.mockResolvedValue('C:\\Program Files\\Git\\bin\\bash.exe')
        mockVaultHandler.resolveScriptPath.mockResolvedValueOnce('C:\\dev\\ScriptVault\\MR\\mr.sh')

        await service.runSingleScript(script)

        expect(execa).toHaveBeenCalledWith(
            'C:\\Program Files\\Git\\bin\\bash.exe',
            ['/c/dev/ScriptVault/MR/mr.sh'],
            expect.objectContaining({
                env: expect.any(Object),
            }),
        )
    })

    it('should return a helpful error when Git Bash is unavailable on Windows', async () => {
        const script: ScriptEntry = {
            id: '7b',
            type: 'bash',
            path: '/scripts/missing-bash.sh',
            placement: 0,
        }

        mockBashRuntimeService.getPlatform.mockReturnValue('win32')
        mockBashRuntimeService.resolveCommand.mockRejectedValue(
            new Error(
                'Git Bash not found. Install Git for Windows and ensure bash.exe is available on PATH or in a standard Git installation folder',
            ),
        )

        const result = await service.runSingleScript(script)

        expect(result.success).toBe(false)
        expect(execa).not.toHaveBeenCalled()
    })

    it('should stop a running script', async () => {
        const script: ScriptEntry = {
            id: '8',
            type: 'bash',
            path: '/scripts/long.sh',
            placement: 0,
        }

        const killMock = jest.fn()
        let subprocessRef: any
        ;(execa as any).mockImplementation(() => {
            const promise = new Promise(() => {}) as any // Never resolves
            promise.stdout = { on: jest.fn() }
            promise.stderr = { on: jest.fn() }
            promise.kill = killMock
            subprocessRef = promise
            return promise
        })

        // Start script
        const runPromise = service.runSingleScript(script)

        // Give time for the subprocess to be stored
        await new Promise((resolve) => setTimeout(resolve, 10))

        // Stop it
        await service.stopScript('8')

        expect(killMock).toHaveBeenCalled()
    })

    it('should run all scripts in sequence', async () => {
        const scripts: ScriptEntry[] = [
            { id: '1', type: 'bash', path: '/scripts/1.sh', placement: 0 },
            { id: '2', type: 'bash', path: '/scripts/2.sh', placement: 1 },
        ]

        let callCount = 0
        ;(execa as any).mockImplementation(() => {
            callCount++
            const promise = Promise.resolve({ stdout: `output${callCount}`, stderr: '' }) as any
            promise.stdout = { on: jest.fn() }
            promise.stderr = { on: jest.fn() }
            return promise
        })

        const result = await service.runAllScripts(scripts)

        expect(result.success).toBe(true)
        expect(execa).toHaveBeenCalledTimes(2)
    })

    it('should stop workflow on script failure', async () => {
        const scripts: ScriptEntry[] = [
            { id: '1', type: 'bash', path: '/scripts/1.sh', placement: 0 },
            { id: '2', type: 'bash', path: '/scripts/2.sh', placement: 1 },
        ]

        ;(execa as any).mockImplementationOnce(() => {
            const promise = Promise.reject(new Error('Script failed')) as any
            promise.stdout = { on: jest.fn() }
            promise.stderr = { on: jest.fn() }
            return promise
        })

        const result = await service.runAllScripts(scripts)

        expect(result.success).toBe(false)
        expect(result.stoppedAtScriptId).toBe('1')
        expect(execa).toHaveBeenCalledTimes(1)
    })

    it('should handle custom script type', async () => {
        const script: ScriptEntry = {
            id: '9',
            type: 'custom',
            path: '/scripts/custom.js',
            customCommand: 'node --experimental-modules',
            placement: 0,
        }

        await service.runSingleScript(script)

        expect(execa).toHaveBeenCalledWith(
            'node',
            ['--experimental-modules', '/resolved/path/to/script'],
            expect.objectContaining({
                env: expect.any(Object),
            }),
        )
    })

    it('should return failure for custom script without command', async () => {
        const script: ScriptEntry = {
            id: '10',
            type: 'custom',
            path: '/scripts/custom.js',
            placement: 0,
        }

        const result = await service.runSingleScript(script)
        expect(result.success).toBe(false)
    })

    it('should handle script with success condition', async () => {
        const scripts: ScriptEntry[] = [
            {
                id: '1',
                type: 'bash',
                path: '/scripts/1.sh',
                placement: 0,
                successCondition: {
                    type: 'contains',
                    value: 'success',
                    enabled: true,
                },
            },
            { id: '2', type: 'bash', path: '/scripts/2.sh', placement: 1 },
        ]

        ;(execa as any).mockImplementation(() => {
            const promise = Promise.resolve({ stdout: 'success message', stderr: '' }) as any
            promise.stdout = {
                on: jest.fn((event: string, callback: (chunk: any) => void) => {
                    if (event === 'data') {
                        callback(Buffer.from('success message'))
                    }
                }),
            }
            promise.stderr = { on: jest.fn() }
            return promise
        })

        const result = await service.runAllScripts(scripts)

        expect(result.success).toBe(true)
    })

    it('should stop workflow when condition is not met', async () => {
        const scripts: ScriptEntry[] = [
            {
                id: '1',
                type: 'bash',
                path: '/scripts/1.sh',
                placement: 0,
                successCondition: {
                    type: 'contains',
                    value: 'success',
                    enabled: true,
                },
            },
            { id: '2', type: 'bash', path: '/scripts/2.sh', placement: 1 },
        ]

        ;(execa as any).mockImplementation(() => {
            const promise = Promise.resolve({ stdout: 'failure message', stderr: '' }) as any
            promise.stdout = { on: jest.fn() }
            promise.stderr = { on: jest.fn() }
            return promise
        })

        const result = await service.runAllScripts(scripts)

        expect(result.success).toBe(false)
        expect(result.stoppedAtScriptId).toBe('2')
        expect(result.failureReason).toContain('Condition not met')
    })

    it('should set environment variable to full output when enabled and condition is met', async () => {
        const scripts: ScriptEntry[] = [
            {
                id: '1',
                type: 'bash',
                path: '/scripts/1.sh',
                placement: 0,
                successCondition: {
                    type: 'contains',
                    value: 'success',
                    enabled: true,
                },
                outputPass: {
                    enabled: true,
                    envVarName: 'NEXT_VAR',
                },
            },
            { id: '2', type: 'bash', path: '/scripts/2.sh', placement: 1 },
        ]

        ;(execa as any).mockImplementation(() => {
            const promise = Promise.resolve({ stdout: 'success message', stderr: '' }) as any
            promise.stdout = {
                on: jest.fn((event: string, callback: (chunk: any) => void) => {
                    if (event === 'data') {
                        callback(Buffer.from('success message'))
                    }
                }),
            }
            promise.stderr = { on: jest.fn() }
            return promise
        })

        await service.runAllScripts(scripts)

        // Second script should receive the dynamic env var
        const secondCall = (execa as jest.Mock).mock.calls[1]
        expect(secondCall[2].env.NEXT_VAR).toBe('success message')
    })

    it('should set environment variable even when condition is disabled', async () => {
        const scripts: ScriptEntry[] = [
            {
                id: '1',
                type: 'bash',
                path: '/scripts/1.sh',
                placement: 0,
                successCondition: {
                    type: 'contains',
                    value: 'ignored',
                    enabled: false,
                },
                outputPass: {
                    enabled: true,
                    envVarName: 'NEXT_VAR',
                },
            },
            { id: '2', type: 'bash', path: '/scripts/2.sh', placement: 1 },
        ]

        ;(execa as any).mockImplementation(() => {
            const promise = Promise.resolve({ stdout: 'payload', stderr: '' }) as any
            promise.stdout = {
                on: jest.fn((event: string, callback: (chunk: any) => void) => {
                    if (event === 'data') {
                        callback(Buffer.from('payload'))
                    }
                }),
            }
            promise.stderr = { on: jest.fn() }
            return promise
        })

        const result = await service.runAllScripts(scripts)

        expect(result.success).toBe(true)
        const secondCall = (execa as jest.Mock).mock.calls[1]
        expect(secondCall[2].env.NEXT_VAR).toBe('payload')
    })

    it('should pass multi-line output including line breaks as environment variable value', async () => {
        const scripts: ScriptEntry[] = [
            {
                id: '1',
                type: 'bash',
                path: '/scripts/1.sh',
                placement: 0,
                outputPass: {
                    enabled: true,
                    envVarName: 'RESULT_JSON',
                },
            },
            { id: '2', type: 'bash', path: '/scripts/2.sh', placement: 1 },
        ]

        const multiLineJson = '{\n  "status": "ok",\n  "data": [1, 2, 3]\n}\n'

        ;(execa as any).mockImplementation(() => {
            const promise = Promise.resolve({ stdout: multiLineJson, stderr: '' }) as any
            promise.stdout = {
                on: jest.fn((event: string, callback: (chunk: any) => void) => {
                    if (event === 'data') {
                        callback(Buffer.from(multiLineJson))
                    }
                }),
            }
            promise.stderr = { on: jest.fn() }
            return promise
        })

        await service.runAllScripts(scripts)

        const secondCall = (execa as jest.Mock).mock.calls[1]
        expect(secondCall[2].env.RESULT_JSON).toBe(multiLineJson)
    })

    it('should pass output through a 3-script chain (A→B→C)', async () => {
        const scripts: ScriptEntry[] = [
            {
                id: '1',
                type: 'bash',
                path: '/scripts/1.sh',
                placement: 0,
                outputPass: {
                    enabled: true,
                    envVarName: 'RESULT_A',
                },
            },
            {
                id: '2',
                type: 'bash',
                path: '/scripts/2.sh',
                placement: 1,
                outputPass: {
                    enabled: true,
                    envVarName: 'RESULT_B',
                },
            },
            { id: '3', type: 'bash', path: '/scripts/3.sh', placement: 2 },
        ]

        let callCount = 0
        ;(execa as any).mockImplementation(() => {
            callCount++
            const output = `output_from_script_${callCount}`
            const promise = Promise.resolve({ stdout: output, stderr: '' }) as any
            promise.stdout = {
                on: jest.fn((event: string, callback: (chunk: any) => void) => {
                    if (event === 'data') {
                        callback(Buffer.from(output))
                    }
                }),
            }
            promise.stderr = { on: jest.fn() }
            return promise
        })

        const result = await service.runAllScripts(scripts)

        expect(result.success).toBe(true)
        expect(execa).toHaveBeenCalledTimes(3)

        // Script B should receive Script A's output
        const secondCall = (execa as jest.Mock).mock.calls[1]
        expect(secondCall[2].env.RESULT_A).toBe('output_from_script_1')

        // Script C should receive Script B's output (NOT Script A's)
        const thirdCall = (execa as jest.Mock).mock.calls[2]
        expect(thirdCall[2].env.RESULT_B).toBe('output_from_script_2')
        expect(thirdCall[2].env.RESULT_A).toBeUndefined()
    })

    it('should pass only stdout when stdoutOnly is enabled', async () => {
        const scripts: ScriptEntry[] = [
            {
                id: '1',
                type: 'bash',
                path: '/scripts/1.sh',
                placement: 0,
                outputPass: {
                    enabled: true,
                    envVarName: 'RESULT',
                    stdoutOnly: true,
                },
            },
            { id: '2', type: 'bash', path: '/scripts/2.sh', placement: 1 },
        ]

        ;(execa as any).mockImplementation(() => {
            const promise = Promise.resolve({ stdout: 'stdout_data', stderr: 'stderr_data' }) as any
            promise.stdout = {
                on: jest.fn((event: string, callback: (chunk: any) => void) => {
                    if (event === 'data') {
                        callback(Buffer.from('stdout_data'))
                    }
                }),
            }
            promise.stderr = {
                on: jest.fn((event: string, callback: (chunk: any) => void) => {
                    if (event === 'data') {
                        callback(Buffer.from('stderr_data'))
                    }
                }),
            }
            return promise
        })

        await service.runAllScripts(scripts)

        const secondCall = (execa as jest.Mock).mock.calls[1]
        expect(secondCall[2].env.RESULT).toBe('stdout_data')
    })

    it('should pass stdout+stderr when stdoutOnly is not set', async () => {
        const scripts: ScriptEntry[] = [
            {
                id: '1',
                type: 'bash',
                path: '/scripts/1.sh',
                placement: 0,
                outputPass: {
                    enabled: true,
                    envVarName: 'RESULT',
                },
            },
            { id: '2', type: 'bash', path: '/scripts/2.sh', placement: 1 },
        ]

        ;(execa as any).mockImplementation(() => {
            const promise = Promise.resolve({ stdout: 'stdout_data', stderr: 'stderr_data' }) as any
            promise.stdout = {
                on: jest.fn((event: string, callback: (chunk: any) => void) => {
                    if (event === 'data') {
                        callback(Buffer.from('stdout_data'))
                    }
                }),
            }
            promise.stderr = {
                on: jest.fn((event: string, callback: (chunk: any) => void) => {
                    if (event === 'data') {
                        callback(Buffer.from('stderr_data'))
                    }
                }),
            }
            return promise
        })

        await service.runAllScripts(scripts)

        const secondCall = (execa as jest.Mock).mock.calls[1]
        expect(secondCall[2].env.RESULT).toBe('stdout_datastderr_data')
    })

    it('should handle user stopping the workflow', async () => {
        const scripts: ScriptEntry[] = [
            { id: '1', type: 'bash', path: '/scripts/1.sh', placement: 0 },
            { id: '2', type: 'bash', path: '/scripts/2.sh', placement: 1 },
        ]

        // First script runs long
        const killMock = jest.fn()
        let resolveFirstScript: any
        let subprocessRef: any
        ;(execa as any).mockImplementationOnce(() => {
            const promise = new Promise((resolve) => {
                resolveFirstScript = resolve
            }) as any
            promise.stdout = { on: jest.fn() }
            promise.stderr = { on: jest.fn() }
            promise.kill = killMock
            subprocessRef = promise
            return promise
        })

        const runPromise = service.runAllScripts(scripts)

        // Give time for the subprocess to be stored
        await new Promise((resolve) => setTimeout(resolve, 10))

        // Stop the workflow
        await service.stopWorkflow()

        // Resolve the first script (as if it was killed)
        resolveFirstScript({ stdout: '', stderr: '' })

        await runPromise

        expect(killMock).toHaveBeenCalled()
    })
})
