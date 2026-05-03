import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Square, FilePlus } from 'lucide-react'
import type {
    ScriptEntry,
    WorkflowExecutionResult,
    ExecutionStatus,
    ExecutionStatusEvent,
} from '../../../../renderer.d'
import { cn } from '@/lib/utils'
import { ScriptEntryComponent } from '../../script-execution/components/ScriptEntry'
import { ScriptConnector } from '../../script-execution/components/ScriptConnector'
import { ScriptDragHandle } from '../../script-execution/components/ScriptDragHandle'
import { Plus } from 'lucide-react'
import { getExecutionStatusStyles } from '../../script-execution/lib/execution-status'
import { DuplicateScriptEntryService } from '../../script-execution/services/duplicate-script-entry-service'
import { MultiValueVariableService } from '../../script-execution/services/multi-value-variable-service'
import { DragAndDropScriptService } from '../../script-execution/services/drag-and-drop-script-service'
import { AddScriptService } from '../../script-execution/services/add-script-service'
import { KeyboardService } from '@/lib/services/keyboard-service'
import { ToasterService, TOASTER_CONFIG } from '@/lib/services/toaster-service'
import { FeedbackTrigger, FeedbackDropdown, useFeedback } from '@/features/feedback'
import type { DragEndEvent } from '@dnd-kit/core'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'

interface WorkflowPageProps {
    sectionId: string
    subSectionKey: string
    title: string
}

export function WorkflowPage({ sectionId, subSectionKey, title }: WorkflowPageProps) {
    const [scripts, setScripts] = useState<ScriptEntry[]>([])
    const [workflowStatus, setWorkflowStatus] = useState<WorkflowExecutionResult | null>(null)
    const [workflowExecutionState, setWorkflowExecutionState] = useState<ExecutionStatus>('idle')
    const [scriptExecutionStates, setScriptExecutionStates] = useState<Record<string, ExecutionStatus>>({})
    const [connectorExecutionStates, setConnectorExecutionStates] = useState<Record<string, ExecutionStatus>>({})
    const [isStopping, setIsStopping] = useState(false)
    const [isDraggingFiles, setIsDraggingFiles] = useState(false)
    const [isFeedbackDropdownOpen, setIsFeedbackDropdownOpen] = useState(false)
    const { setIsDialogOpen, setCurrentRating } = useFeedback()
    const workflowStyles = getExecutionStatusStyles(workflowExecutionState)

    // @dnd-kit sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                delay: 250,
                distance: 5,
                tolerance: 10,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    )

    useEffect(() => {
        resetExecutionState()
        loadScripts()
    }, [sectionId, subSectionKey])

    useEffect(() => {
        const removeStatusListener = window.api.script.onStatus((event: ExecutionStatusEvent) => {
            if (event.type === 'workflow') {
                setWorkflowExecutionState(event.status)
                if (event.status !== 'running') {
                    setIsStopping(false)
                }
                return
            }

            if (event.type === 'script') {
                setScriptExecutionStates((prev) => ({
                    ...prev,
                    [event.scriptId]: event.status,
                }))
                return
            }

            if (event.type === 'connector') {
                setConnectorExecutionStates((prev) => ({
                    ...prev,
                    [event.fromScriptId]: event.status === 'condition_failed' ? 'failed' : event.status,
                }))
                if (event.status === 'condition_failed') {
                    setScriptExecutionStates((prev) => ({
                        ...prev,
                        [event.fromScriptId]: 'condition_failed',
                    }))
                }
            }
        })

        return () => {
            removeStatusListener()
        }
    }, [])

    useEffect(() => {
        if (workflowExecutionState !== 'running') {
            return
        }

        const removeKeyboardListener = KeyboardService.registerWorkflowStop(() => {
            handleStopWorkflow()
        })

        return () => {
            removeKeyboardListener()
        }
    }, [workflowExecutionState])

    // Show toast notifications when workflow completes
    useEffect(() => {
        if (workflowExecutionState === 'running' || workflowExecutionState === 'idle') {
            return
        }

        const timer = setTimeout(() => {
            if (workflowExecutionState === 'success') {
                ToasterService.showSuccess('Workflow completed successfully')
            } else if (workflowExecutionState === 'failed' && workflowStatus) {
                if (workflowStatus.failureReason?.includes('Condition not met')) {
                    // Find the script that failed the condition
                    const failedScriptId = workflowStatus.stoppedAtScriptId
                    const failedScript = scripts.find((s) => s.id === failedScriptId)
                    const scriptName = getScriptDisplayName(failedScript)

                    // Extract condition info from the failure reason
                    const conditionMatch = workflowStatus.failureReason.match(/does not (\w+) "([^"]+)"/)
                    if (conditionMatch && failedScript?.successCondition) {
                        const [, conditionType, expectedValue] = conditionMatch
                        ToasterService.showWarning(
                            `Script '${scriptName}' condition not met: expected output to ${conditionType} '${expectedValue}'`,
                        )
                    } else {
                        ToasterService.showWarning(`Script '${scriptName}' condition not met`)
                    }
                } else {
                    ToasterService.showError(workflowStatus.failureReason || 'Workflow failed')
                }
            }
        }, TOASTER_CONFIG.DELAY_SHOW)

        return () => clearTimeout(timer)
    }, [workflowExecutionState, workflowStatus, scripts])

    const getScriptDisplayName = (script: ScriptEntry | undefined): string => {
        if (!script) return 'Unknown'
        if (script.name) return script.name
        // Extract filename from path
        const pathParts = script.path.split('/')
        return pathParts[pathParts.length - 1] || script.path
    }

    const loadScripts = async () => {
        try {
            const sections = await window.api.vault.getSections()
            const section = sections.find((s) => s.id === sectionId)
            const subSection = section?.['sub-sections']?.[subSectionKey]

            if (subSection?.scripts) {
                // Sort scripts by placement
                const sortedScripts = DragAndDropScriptService.getSortedScripts(subSection.scripts)
                setScripts(sortedScripts)
            } else {
                setScripts([])
            }
        } catch (error) {
            console.error('Failed to load scripts:', error)
        }
    }

    const resetExecutionState = () => {
        setWorkflowExecutionState('idle')
        setScriptExecutionStates({})
        setConnectorExecutionStates({})
    }

    const handleAddScript = async () => {
        try {
            const filePaths = await window.api.dialog.openScripts()
            if (filePaths && filePaths.length > 0) {
                const result = await AddScriptService.addScriptsFromFiles(sectionId, subSectionKey, filePaths)
                if (result.success.length > 0) {
                    setScripts((prev) => [...prev, ...result.success])
                }
                if (result.failed.length > 0) {
                    console.error('Failed to add scripts:', result.failed)
                    ToasterService.showError(`Failed to add ${result.failed.length} script(s)`)
                }
            }
        } catch (error) {
            console.error('Failed to add scripts:', error)
            ToasterService.showError('Failed to add scripts')
        }
    }

    const handleDragOverFile = (event: React.DragEvent) => {
        event.preventDefault()
        if (event.dataTransfer.types.includes('Files')) {
            setIsDraggingFiles(true)
        }
    }

    const handleDragLeaveFile = (event: React.DragEvent) => {
        event.preventDefault()
        setIsDraggingFiles(false)
    }

    const handleDropFile = async (event: React.DragEvent) => {
        event.preventDefault()
        setIsDraggingFiles(false)

        const files = Array.from(event.dataTransfer.files) as unknown as Array<{ path: string }>
        const filePaths: string[] = files.map((file) => file.path)

        const validFiles = AddScriptService.filterValidScriptFiles(filePaths)

        if (validFiles.length === 0) {
            ToasterService.showError('No valid script files dropped')
            return
        }

        try {
            const result = await AddScriptService.addScriptsFromFiles(sectionId, subSectionKey, validFiles)
            if (result.success.length > 0) {
                setScripts((prev) => [...prev, ...result.success])
            }
            if (result.failed.length > 0) {
                console.error('Failed to add scripts:', result.failed)
                ToasterService.showError(`Failed to add ${result.failed.length} script(s)`)
            }
        } catch (error) {
            console.error('Failed to add scripts from drop:', error)
            ToasterService.showError('Failed to add scripts')
        }
    }

    const handleUpdateScript = async (updatedScript: ScriptEntry) => {
        try {
            // Optimistic update
            setScripts((prev) => prev.map((s) => (s.id === updatedScript.id ? updatedScript : s)))

            const success = await window.api.vault.updateScriptInSubSection(sectionId, subSectionKey, updatedScript)
            if (!success) {
                // Revert on failure (reload from executing source of truth would be safer but this is fine for now)
                loadScripts()
            }
        } catch (error) {
            console.error('Failed to update script:', error)
            loadScripts()
        }
    }

    const handleRemoveScript = async (scriptId: string) => {
        try {
            const success = await window.api.vault.removeScriptFromSubSection(sectionId, subSectionKey, scriptId)
            if (success) {
                setScripts((prev) => prev.filter((s) => s.id !== scriptId))
            }
        } catch (error) {
            console.error('Failed to remove script:', error)
        }
    }

    const handleDuplicateScript = async (script: ScriptEntry) => {
        try {
            const duplicated = await DuplicateScriptEntryService.duplicateScriptInSubSection(
                sectionId,
                subSectionKey,
                script.id,
            )
            if (!duplicated) return

            setScripts((prev) => {
                // Find index based on sorted placement
                const sortedScripts = DragAndDropScriptService.getSortedScripts(prev)
                const index = sortedScripts.findIndex((s) => s.id === script.id)
                if (index === -1) {
                    return prev
                }

                const next = [...sortedScripts]
                next.splice(index + 1, 0, duplicated)
                return next
            })
        } catch (error) {
            console.error('Failed to duplicate script:', error)
        }
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (!over || active.id === over.id) {
            return
        }

        const oldIndex = scripts.findIndex((script) => script.id === active.id)
        const newIndex = scripts.findIndex((script) => script.id === over.id)

        if (oldIndex === -1 || newIndex === -1) {
            return
        }

        // Optimistic update
        const reorderedScripts = DragAndDropScriptService.reorderScripts(scripts, oldIndex, newIndex)
        setScripts(reorderedScripts)

        // Persist to backend
        const result = await DragAndDropScriptService.persistScriptReorder(sectionId, subSectionKey, oldIndex, newIndex)
        if (!result.success) {
            console.error('Failed to persist script reorder:', result.error)
            // Revert on failure
            loadScripts()
        }
    }

    const handleRunSingle = async (script: ScriptEntry) => {
        try {
            setScriptExecutionStates((prev) => ({
                ...prev,
                [script.id]: 'running',
            }))
            await window.api.script.runSingleScript(script)
        } catch (error) {
            console.error(`Failed to run script ${script.id}:`, error)
        }
    }

    const handleRunAll = async () => {
        if (scripts.length === 0) return

        setWorkflowExecutionState('running')
        setScriptExecutionStates({})
        setConnectorExecutionStates({})
        setWorkflowStatus(null)
        try {
            const result = await window.api.script.runAllScripts(scripts)
            setWorkflowStatus(result as WorkflowExecutionResult)
        } catch (error) {
            console.error('Failed to run workflow:', error)
            setWorkflowStatus({
                success: false,
                failureReason: 'Workflow execution failed',
            })
            setWorkflowExecutionState('failed')
        } finally {
            // Workflow state updates are handled by status events
        }
    }

    const handleStopWorkflow = async () => {
        if (workflowExecutionState !== 'running' || isStopping) return

        setIsStopping(true)
        try {
            const stopped = await window.api.script.stopWorkflow()
            if (stopped) {
                ToasterService.showError('Workflow stopped by user')
            }
        } catch (error) {
            console.error('Failed to stop workflow:', error)
        } finally {
            setIsStopping(false)
        }
    }

    return (
        <div
            className={cn(
                'h-full flex flex-col transition-colors duration-200',
                isDraggingFiles && 'bg-primary/5 border-2 border-dashed border-primary/30 rounded-lg',
            )}
            onDragOver={handleDragOverFile}
            onDragLeave={handleDragLeaveFile}
            onDrop={handleDropFile}
        >
            {isDraggingFiles && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50 pointer-events-none">
                    <div className="flex flex-col items-center gap-2 text-primary">
                        <FilePlus className="h-12 w-12 animate-bounce" />
                        <p className="text-lg font-semibold">Drop files to add scripts</p>
                    </div>
                </div>
            )}
            <div className={cn('h-1 w-full rounded-full mb-4 transition-colors', workflowStyles.bar)} />
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">{title}</h1>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <FeedbackTrigger
                            onClick={() => setIsFeedbackDropdownOpen(!isFeedbackDropdownOpen)}
                            isOpen={isFeedbackDropdownOpen}
                        />
                        <FeedbackDropdown
                            isOpen={isFeedbackDropdownOpen}
                            onClose={() => setIsFeedbackDropdownOpen(false)}
                            onRatingSelect={(rating) => {
                                setCurrentRating(rating)
                                setIsDialogOpen(true)
                            }}
                        />
                    </div>
                    <Button onClick={handleAddScript}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Script
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
                {scripts.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10">
                        No scripts in this workflow. Click "Add Script" or drag and drop files here.
                    </div>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={scripts.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                            {scripts.map((script, index) => (
                                <div key={script.id}>
                                    <ScriptDragHandle id={script.id} disabled={workflowExecutionState === 'running'}>
                                        {(dragHandle) => (
                                            <ScriptEntryComponent
                                                script={script}
                                                scripts={scripts}
                                                executionStatus={scriptExecutionStates[script.id] || 'idle'}
                                                dragHandle={dragHandle}
                                                onCopyEnvVar={(key, value, targetId) => {
                                                    const target = scripts.find((s) => s.id === targetId)
                                                    if (!target) return
                                                    const updated = {
                                                        ...target,
                                                        env: {
                                                            ...(target.env || {}),
                                                            [key]: MultiValueVariableService.createStatic(value),
                                                        },
                                                    }
                                                    handleUpdateScript(updated)
                                                }}
                                                onCopySecret={(secretName, targetId) => {
                                                    const target = scripts.find((s) => s.id === targetId)
                                                    if (!target) return
                                                    const updated = {
                                                        ...target,
                                                        secrets: [...new Set([...(target.secrets || []), secretName])],
                                                    }
                                                    handleUpdateScript(updated)
                                                }}
                                                onUpdate={handleUpdateScript}
                                                onRemove={handleRemoveScript}
                                                onDuplicate={handleDuplicateScript}
                                                onRun={handleRunSingle}
                                            />
                                        )}
                                    </ScriptDragHandle>
                                    {/* Show connector between scripts (not after the last one) */}
                                    {index < scripts.length - 1 && (
                                        <ScriptConnector
                                            script={script}
                                            onUpdate={handleUpdateScript}
                                            executionStatus={connectorExecutionStates[script.id] || 'idle'}
                                        />
                                    )}
                                </div>
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            <div className="pt-6 border-t mt-4">
                <div className="flex gap-3">
                    {/* Run/Running button */}
                    <Button
                        size="lg"
                        className={cn(
                            'text-lg font-semibold transition-all duration-300 ease-in-out',
                            workflowExecutionState === 'running'
                                ? 'flex-[0.4] ring-2 ring-amber-400/40 cursor-default'
                                : 'flex-1',
                        )}
                        onClick={workflowExecutionState === 'running' ? undefined : handleRunAll}
                        disabled={workflowExecutionState === 'running' || scripts.length === 0}
                    >
                        <Play
                            className={`mr-2 h-5 w-5 ${workflowExecutionState === 'running' ? 'animate-pulse' : ''}`}
                        />
                        {workflowExecutionState === 'running' ? 'Running...' : 'Run Workflow'}
                    </Button>

                    {/* Stop button - only visible when running */}
                    <Button
                        size="lg"
                        variant="destructive"
                        className={cn(
                            'bg-red-600 hover:bg-red-700 text-white text-lg font-semibold transition-all duration-300 ease-in-out overflow-hidden',
                            workflowExecutionState === 'running' ? 'flex-[0.6] opacity-100' : 'flex-[0] opacity-0 px-0',
                        )}
                        onClick={handleStopWorkflow}
                        disabled={isStopping}
                    >
                        <Square className="mr-2 h-5 w-5 fill-current" />
                        Stop Workflow
                    </Button>
                </div>
            </div>
        </div>
    )
}
