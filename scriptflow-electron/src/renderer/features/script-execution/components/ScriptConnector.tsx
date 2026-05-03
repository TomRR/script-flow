import { useState } from 'react'
import type {
    ScriptEntry,
    ConditionType,
    ConditionConfig,
    OutputPassConfig,
    ExecutionStatus,
} from '../../../../renderer.d'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ChevronDown, Link2, Check, X, Variable } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConnectorService } from '../services/connector-service'
import { getExecutionStatusStyles } from '../lib/execution-status'

interface ScriptConnectorProps {
    script: ScriptEntry
    onUpdate: (script: ScriptEntry) => void
    executionStatus?: ExecutionStatus
}

export function ScriptConnector({ script, onUpdate, executionStatus }: ScriptConnectorProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const executionState = executionStatus || 'idle'
    const executionStyles = getExecutionStatusStyles(executionState)

    const condition = script.successCondition || {
        type: 'contains' as ConditionType,
        value: '',
        enabled: false,
    }

    const outputPass = script.outputPass || {
        enabled: false,
        envVarName: '',
    }

    const handleConditionChange = (updates: Partial<ConditionConfig>) => {
        const newCondition: ConditionConfig = {
            ...condition,
            ...updates,
        }
        onUpdate({ ...script, successCondition: newCondition })
    }

    const handleOutputPassChange = (updates: Partial<OutputPassConfig>) => {
        const newOutputPass: OutputPassConfig = {
            ...outputPass,
            ...updates,
        }
        onUpdate({ ...script, outputPass: newOutputPass })
    }

    const handleTypeChange = (type: ConditionType) => {
        handleConditionChange({ type })
    }

    const handleValueChange = (value: string) => {
        handleConditionChange({ value })
    }

    const handleEnabledToggle = () => {
        handleConditionChange({ enabled: !condition.enabled })
    }

    const handleOutputPassToggle = () => {
        handleOutputPassChange({ enabled: !outputPass.enabled })
    }

    const handleEnvVarNameChange = (envVarName: string) => {
        handleOutputPassChange({ envVarName })
    }

    const handleStdoutOnlyToggle = () => {
        handleOutputPassChange({ stdoutOnly: !outputPass.stdoutOnly })
    }

    return (
        <div className="flex flex-col items-center py-1">
            {/* Connection Line */}
            <div className={cn('w-px h-3 bg-border transition-colors', executionStyles.line)} />

            {/* Connector Badge */}
            <div
                className={cn(
                    'relative flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all duration-200 hover:shadow-sm',
                    condition.enabled || outputPass.enabled
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted',
                    executionStyles.badge,
                )}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <Link2 className="h-3 w-3" />
                {condition.enabled ? (
                    <span className="text-xs font-medium">
                        {ConnectorService.getConditionLabel(condition.type)}: "{condition.value || '...'}"
                        {outputPass.enabled && outputPass.envVarName && (
                            <span className="ml-1 text-xs opacity-75">→ ${outputPass.envVarName}</span>
                        )}
                    </span>
                ) : outputPass.enabled && outputPass.envVarName ? (
                    <span className="text-xs font-medium">Pass Output → ${outputPass.envVarName}</span>
                ) : (
                    <span className="text-xs">Add Condition</span>
                )}
                <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>

            {/* Expanded Configuration */}
            {isExpanded && (
                <div className="mt-2 p-3 bg-card border rounded-lg shadow-sm w-full max-w-md">
                    <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium">Enable Condition</Label>
                        <Button
                            variant={condition.enabled ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 px-2"
                            onClick={(e) => {
                                e.stopPropagation()
                                handleEnabledToggle()
                            }}
                        >
                            {condition.enabled ? (
                                <>
                                    <Check className="h-3 w-3 mr-1" /> Enabled
                                </>
                            ) : (
                                <>
                                    <X className="h-3 w-3 mr-1" /> Disabled
                                </>
                            )}
                        </Button>
                    </div>

                    <div className={`space-y-3 ${!condition.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground uppercase">Condition Type</Label>
                            <Select value={condition.type} onValueChange={handleTypeChange}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="contains">Contains</SelectItem>
                                    <SelectItem value="equals">Equals</SelectItem>
                                    <SelectItem value="startsWith">Starts With</SelectItem>
                                    <SelectItem value="endsWith">Ends With</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground uppercase">Expected Value</Label>
                            <Input
                                placeholder="e.g., SUCCESS, 0, done..."
                                value={condition.value}
                                onChange={(e) => handleValueChange(e.target.value)}
                                className="h-9"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>

                        <p className="text-xs text-muted-foreground">
                            The next script will only run if this script's output{' '}
                            {ConnectorService.getConditionLabel(condition.type).toLowerCase()} "
                            {condition.value || '...'}"
                        </p>
                    </div>

                    <div className="space-y-3 mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground uppercase">
                                Pass Output as Environment Variable
                            </Label>
                            <Button
                                variant={outputPass.enabled ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 px-2"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleOutputPassToggle()
                                }}
                            >
                                <Variable className="h-3 w-3 mr-1" />
                                {outputPass.enabled ? 'Enabled' : 'Disabled'}
                            </Button>
                        </div>

                        {outputPass.enabled && (
                            <>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground uppercase">Variable Name</Label>
                                    <Input
                                        placeholder="e.g., API_KEY, RESULT_JSON..."
                                        value={outputPass.envVarName || ''}
                                        onChange={(e) => handleEnvVarNameChange(e.target.value)}
                                        className={`h-9 ${outputPass.envVarName && !ConnectorService.isValidEnvVarName(outputPass.envVarName) ? 'border-red-500' : ''}`}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    {outputPass.envVarName &&
                                        !ConnectorService.isValidEnvVarName(outputPass.envVarName) && (
                                            <p className="text-xs text-red-500">
                                                Invalid variable name. Use letters, numbers, and underscores. Must start
                                                with letter or underscore.
                                            </p>
                                        )}
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">
                                        Stdout only (exclude stderr)
                                    </Label>
                                    <Switch
                                        checked={!!outputPass.stdoutOnly}
                                        onCheckedChange={() => handleStdoutOnlyToggle()}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </>
                        )}

                        <p className="text-xs text-muted-foreground">
                            {outputPass.enabled && outputPass.envVarName && (
                                <span className="block mt-1">
                                    The next script will receive the latest script output in{' '}
                                    <code>${outputPass.envVarName}</code>
                                    {outputPass.stdoutOnly ? ' (stdout only)' : ''}.
                                </span>
                            )}
                            {!outputPass.enabled && (
                                <span className="block mt-1">
                                    Enable this to pass the latest script output to the next script.
                                </span>
                            )}
                        </p>
                    </div>
                </div>
            )}

            {/* Connection Line (bottom) */}
            <div className={cn('w-px h-3 bg-border transition-colors', executionStyles.line)} />
            <ChevronDown className="h-3 w-3 text-muted-foreground -mt-0.5" />
        </div>
    )
}
