import { execa } from 'execa'
import { BashRuntimeService } from '../../../../main/bash-runtime-service'
import type { ScriptEntry, VaultHandler, ConditionConfig } from '../../../../main/vault-handler'
import type { MultiVaultService } from '../../../../main/multi-vault-service'
import type { SecretsHandler } from '../../../../main/secrets-handler'
import { ConnectorService } from './connector-service'
import { ScriptCommandService } from './script-command-service'

export interface ScriptExecutionResult {
    success: boolean
    output: string
    stdout: string
}

export interface WorkflowExecutionResult {
    success: boolean
    stoppedAtScriptId?: string
    failureReason?: string
}

type ExecutionStatus = 'running' | 'success' | 'failed' | 'condition_failed'

interface ScriptExecutionStatusEvent {
    type: 'script'
    scriptId: string
    status: ExecutionStatus
    reason?: string
}

interface WorkflowExecutionStatusEvent {
    type: 'workflow'
    status: ExecutionStatus
    stoppedAtScriptId?: string
    reason?: string
}

interface ConnectorExecutionStatusEvent {
    type: 'connector'
    fromScriptId: string
    toScriptId?: string
    status: ExecutionStatus
    reason?: string
}

type ExecutionStatusEvent = ScriptExecutionStatusEvent | WorkflowExecutionStatusEvent | ConnectorExecutionStatusEvent

type ExecutionStatusCallback = (event: ExecutionStatusEvent) => void

export class ExecuteScriptService {
    private vaultHandler: VaultHandler
    private multiVaultService: MultiVaultService
    private secretsHandler: SecretsHandler
    private bashRuntimeService: Pick<BashRuntimeService, 'getPlatform' | 'resolveCommand'>
    private runningScripts: Map<string, any> = new Map()
    private dynamicEnvVars: Record<string, string> = {}
    private currentlyRunningWorkflowScriptId: string | null = null

    constructor(
        vaultHandler: VaultHandler,
        multiVaultService: MultiVaultService,
        secretsHandler: SecretsHandler,
        bashRuntimeService: Pick<BashRuntimeService, 'getPlatform' | 'resolveCommand'> = new BashRuntimeService(),
    ) {
        this.vaultHandler = vaultHandler
        this.multiVaultService = multiVaultService
        this.secretsHandler = secretsHandler
        this.bashRuntimeService = bashRuntimeService
    }

    /**
     * Checks if the script output meets the given condition.
     * Delegates to ConnectorService for the actual condition checking logic.
     */
    checkCondition(output: string, condition: ConditionConfig): boolean {
        return ConnectorService.checkCondition(output, condition)
    }

    async runSingleScript(
        script: ScriptEntry,
        onOutput?: (data: string) => void,
        onStatus?: ExecutionStatusCallback,
    ): Promise<ScriptExecutionResult> {
        console.log(`Executing script: ${script.type} - ${script.path}`)
        console.log(`Dynamic env vars before execution:`, JSON.stringify(this.dynamicEnvVars))
        onStatus?.({ type: 'script', scriptId: script.id, status: 'running' })

        // Resolve relative path to absolute path
        const absoluteScriptPath = await this.vaultHandler.resolveScriptPath(script.path)
        console.log(`Resolved path: ${absoluteScriptPath}`)

        const env = await this.resolveEnvironment(script)
        console.log(
            `Resolved environment for script ${script.id}:`,
            Object.keys(env)
                .filter((k) => k.includes('INPUT') || k.includes('SECRET') || k.includes('ENV_VAR'))
                .join(', '),
        )

        // Ensure we don't run the same script instance multiple times if that's a concern,
        // but for now we assume the UI handles preventing double clicks or we allow parallel runs.
        // We need a unique key for the running process if we want to stop it.
        // Using script.id is fine if we assume one instance per script entry at a time.

        let subprocess: any
        let capturedOutput = ''
        let capturedStdout = ''

        try {
            const bashCommand = script.type === 'bash' ? await this.bashRuntimeService.resolveCommand() : undefined
            const { command, args } = ScriptCommandService.buildCommand(script, absoluteScriptPath, {
                bashCommand,
                platform: this.bashRuntimeService.getPlatform(),
            })
            subprocess = execa(command, args, { env })

            this.runningScripts.set(script.id, subprocess)

            if (subprocess.stdout) {
                subprocess.stdout.on('data', (chunk: any) => {
                    const data = chunk.toString()
                    capturedOutput += data
                    capturedStdout += data
                    onOutput?.(data)
                })
            }
            if (subprocess.stderr) {
                subprocess.stderr.on('data', (chunk: any) => {
                    const data = chunk.toString()
                    capturedOutput += data
                    onOutput?.(data)
                })
            }

            await subprocess
            onStatus?.({ type: 'script', scriptId: script.id, status: 'success' })
            return { success: true, output: capturedOutput, stdout: capturedStdout }
        } catch (error: any) {
            // If the process was killed intentionally, strictly speaking it might throw/error.
            if (error.isCanceled || error.killed) {
                onOutput?.(`\nScript stopped by user.`)
                onStatus?.({ type: 'script', scriptId: script.id, status: 'failed', reason: 'Script stopped by user' })
                return { success: false, output: capturedOutput, stdout: capturedStdout }
            } else {
                console.error(`Script execution failed`, error)
                onOutput?.(`\nScript failed: ${error.message}`)
                onStatus?.({ type: 'script', scriptId: script.id, status: 'failed', reason: error.message })
                return { success: false, output: capturedOutput, stdout: capturedStdout }
            }
        } finally {
            this.runningScripts.delete(script.id)
            console.log(`Execution finished: ${script.id}`)
        }
    }

    async stopScript(scriptId: string): Promise<void> {
        const subprocess = this.runningScripts.get(scriptId)
        if (subprocess) {
            subprocess.kill()
            this.runningScripts.delete(scriptId)
        }
    }

    async stopWorkflow(onStatus?: ExecutionStatusCallback): Promise<boolean> {
        if (!this.currentlyRunningWorkflowScriptId) {
            return false
        }

        const scriptId = this.currentlyRunningWorkflowScriptId
        await this.stopScript(scriptId)

        onStatus?.({
            type: 'workflow',
            status: 'failed',
            stoppedAtScriptId: scriptId,
            reason: 'Stopped by user',
        })

        this.currentlyRunningWorkflowScriptId = null
        return true
    }

    async runAllScripts(
        scripts: ScriptEntry[],
        onOutput?: (scriptId: string, data: string) => void,
        onStatus?: ExecutionStatusCallback,
    ): Promise<WorkflowExecutionResult> {
        console.log(`Executing ${scripts.length} scripts sequence`)
        this.dynamicEnvVars = {} // Clear dynamic env vars for new workflow
        this.currentlyRunningWorkflowScriptId = null
        onStatus?.({ type: 'workflow', status: 'running' })

        for (let i = 0; i < scripts.length; i++) {
            const script = scripts[i]
            this.currentlyRunningWorkflowScriptId = script.id
            const nextScript = i < scripts.length - 1 ? scripts[i + 1] : null

            if (nextScript) {
                onStatus?.({
                    type: 'connector',
                    fromScriptId: script.id,
                    toScriptId: nextScript.id,
                    status: 'running',
                })
            }

            // Run the script and capture output
            const result = await this.runSingleScript(script, (data) => onOutput?.(script.id, data), onStatus)

            // If script itself failed (non-zero exit), stop the workflow
            if (!result.success) {
                console.log(`Script ${script.id} failed, stopping workflow`)
                if (nextScript) {
                    onStatus?.({
                        type: 'connector',
                        fromScriptId: script.id,
                        toScriptId: nextScript.id,
                        status: 'failed',
                        reason: 'Script execution failed',
                    })
                }
                onStatus?.({
                    type: 'workflow',
                    status: 'failed',
                    stoppedAtScriptId: script.id,
                    reason: 'Script execution failed',
                })
                return {
                    success: false,
                    stoppedAtScriptId: script.id,
                    failureReason: 'Script execution failed',
                }
            }

            // Check condition for next script (if this isn't the last script and has an enabled condition)
            if (script.successCondition && script.successCondition.enabled && i < scripts.length - 1 && nextScript) {
                const conditionMet = this.checkCondition(result.output, script.successCondition)

                if (!conditionMet) {
                    console.log(`Condition not met for script ${script.id}, stopping before ${nextScript.id}`)
                    const conditionLabel = ConnectorService.getConditionLabel(script.successCondition.type)
                    const lastLine = ConnectorService.getLastLine(result.output)
                    const truncatedOutput = this.truncateOutput(lastLine, 100)
                    onOutput?.(
                        script.id,
                        `\n⚠️ Workflow stopped: condition not met\n   Expected: ${conditionLabel} "${script.successCondition.value}"\n   Actual: "${truncatedOutput}"`,
                    )
                    if (nextScript) {
                        onStatus?.({
                            type: 'connector',
                            fromScriptId: script.id,
                            toScriptId: nextScript.id,
                            status: 'condition_failed',
                            reason: 'Condition not met',
                        })
                    }
                    onStatus?.({
                        type: 'script',
                        scriptId: script.id,
                        status: 'condition_failed',
                        reason: 'Condition not met',
                    })
                    onStatus?.({
                        type: 'workflow',
                        status: 'failed',
                        stoppedAtScriptId: nextScript ? nextScript.id : script.id,
                        reason: 'Condition not met',
                    })
                    return {
                        success: false,
                        stoppedAtScriptId: nextScript.id,
                        failureReason: `Condition not met: output does not ${script.successCondition.type} "${script.successCondition.value}"`,
                    }
                }
            }

            // Clear previous dynamic env vars before setting new ones.
            // Each script's output is only passed to the immediate next script.
            this.dynamicEnvVars = {}

            // Set environment variable for the next script when output passing is enabled.
            // This is independent of condition checks.
            if (script.outputPass?.enabled && script.outputPass.envVarName && i < scripts.length - 1 && nextScript) {
                const envVarValue = script.outputPass.stdoutOnly ? result.stdout : result.output
                this.dynamicEnvVars[script.outputPass.envVarName] = envVarValue
                console.log(
                    `Set environment variable: ${script.outputPass.envVarName} (output length: ${envVarValue.length}, stdoutOnly: ${!!script.outputPass.stdoutOnly})`,
                )
                console.log(`Dynamic env vars after setting:`, JSON.stringify(Object.keys(this.dynamicEnvVars)))
                onOutput?.(
                    script.id,
                    `\n🔧 Environment variable set: ${script.outputPass.envVarName} (value from latest script output${script.outputPass.stdoutOnly ? ', stdout only' : ''})`,
                )
            }

            if (nextScript) {
                onStatus?.({
                    type: 'connector',
                    fromScriptId: script.id,
                    toScriptId: nextScript.id,
                    status: 'success',
                })
            }
        }

        console.log('All scripts executed successfully')
        this.currentlyRunningWorkflowScriptId = null
        onStatus?.({ type: 'workflow', status: 'success' })
        return { success: true }
    }

    clearDynamicEnvVars(): void {
        console.log(`Clearing dynamic env vars. Current vars:`, JSON.stringify(this.dynamicEnvVars))
        this.dynamicEnvVars = {}
    }

    private truncateOutput(output: string, maxLength: number): string {
        // Replace newlines with spaces for display
        const singleLine = output.replace(/\n/g, ' ').replace(/\r/g, '')
        if (singleLine.length <= maxLength) {
            return singleLine
        }
        return singleLine.substring(0, maxLength) + '...'
    }

    private resolveEnvValue(value: import('../../../../main/vault-handler').EnvValue | string | undefined): string {
        if (value === undefined) return ''
        if (typeof value === 'string') return value
        if (value.type === 'static') {
            return value.value
        }
        if (value.type === 'multi-value') {
            return value.values[value.defaultValue] ?? ''
        }
        return ''
    }

    private async resolveEnvironment(script: ScriptEntry): Promise<NodeJS.ProcessEnv> {
        const env: NodeJS.ProcessEnv = {
            ...process.env,
            ...this.dynamicEnvVars, // Include dynamic environment variables
        }

        // Resolve script environment variables (support both old string format and new EnvValue format)
        if (script.env) {
            for (const [key, value] of Object.entries(script.env)) {
                env[key] = this.resolveEnvValue(value)
            }
        }

        if (script.secrets && script.secrets.length > 0) {
            try {
                const config = await this.multiVaultService.getVaultsConfig()
                if (config.activeVaultId) {
                    const vaultSecrets = await this.secretsHandler.getSecrets(config.activeVaultId)
                    for (const secretKey of script.secrets) {
                        const secret = vaultSecrets.secrets[secretKey]
                        if (secret) {
                            env[secretKey] = secret.value
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to resolve secrets:', error)
            }
        }

        return env
    }
}
