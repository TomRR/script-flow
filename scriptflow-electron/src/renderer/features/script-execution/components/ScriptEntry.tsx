import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import type { ScriptEntry, ExecutionStatus } from '../../../../renderer.d'
import { ScriptEntryStatusService } from '../services/script-entry-status-service'
import { FolderOpen, Trash2, Play, MoreVertical, X, Plus, Lock, Pencil, Copy, Settings, FileEdit } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SecretsService } from '../../secrets/services/secrets-service'
import { EnvSecretEditorService, type EditFormState } from '../services/env-secret-editor-service'
import { CopyScriptService } from '../services/copy-script-service'
import { ScriptNameEditorService, type NameEditState } from '../services/script-name-editor-service'
import { EnvVariableDialog } from './EnvVariableDialog'
import { ManageVariablesDialog } from './ManageVariablesDialog'
import { EditScriptDialog } from './EditScriptDialog'
import { ScriptFileEditorService, type ScriptFileEditorState } from '../services/script-file-editor-service'
import { MultiValueVariableService } from '../services/multi-value-variable-service'
import { MultiValueDropdown } from './MultiValueDropdown'
import { MultiValueRadio } from './MultiValueRadio'
import { MultiValueVariableDialog } from './MultiValueVariableDialog'
import type { MultiValueEnvVariable, EnvValue } from '../../../../renderer.d'

interface ScriptEntryProps {
    script: ScriptEntry
    scripts: ScriptEntry[]
    executionStatus?: ExecutionStatus
    onUpdate: (script: ScriptEntry) => void
    onRemove: (id: string) => void
    onRun: (script: ScriptEntry) => void
    onDuplicate?: (script: ScriptEntry) => void
    onCopyEnvVar?: (key: string, value: string, targetId: string) => void
    onCopySecret?: (secretName: string, targetId: string) => void
    dragHandle?: React.ReactNode
}

export function ScriptEntryComponent({
    script,
    scripts,
    executionStatus = 'idle',
    onUpdate,
    onRemove,
    onRun,
    onCopyEnvVar,
    onCopySecret,
    dragHandle,
}: ScriptEntryProps) {
    const [isRunning, setIsRunning] = useState(false)
    const [output, setOutput] = useState<string>('')
    const [open, setOpen] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [editFormState, setEditFormState] = useState<EditFormState>(EnvSecretEditorService.createInitialState())
    const [availableSecrets, setAvailableSecrets] = useState<string[]>([])
    const [copyToOpen, setCopyToOpen] = useState<string | null>(null)
    const [showOverwriteDialog, setShowOverwriteDialog] = useState(false)
    const [overwriteInfo, setOverwriteInfo] = useState<{
        type: 'env' | 'secret'
        key: string
        value: string
        envValue?: EnvValue
        targetScriptId: string
        targetScriptName: string
    } | null>(null)
    const [nameEditState, setNameEditState] = useState<NameEditState>(
        ScriptNameEditorService.createInitialState(script.name),
    )
    const [showManageVariables, setShowManageVariables] = useState(false)
    const [showMultiValueDialog, setShowMultiValueDialog] = useState(false)
    const [editingMultiValueKey, setEditingMultiValueKey] = useState<string | undefined>()
    const [editingMultiValueValue, setEditingMultiValueValue] = useState<EnvValue | undefined>()
    const [availableSecretsData, setAvailableSecretsData] = useState<
        Record<string, { value: string; encrypted: boolean }>
    >({})
    const [showDeleteItemDialog, setShowDeleteItemDialog] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<{
        type: 'env' | 'secret'
        key: string
    } | null>(null)
    const [scriptEditorState, setScriptEditorState] = useState<ScriptFileEditorState>(
        ScriptFileEditorService.createInitialState(),
    )

    const { isAddingEnv, isAddingSecret, envEditState, secretEditState } = editFormState
    const { editingEnvKey, newEnvKey, newEnvValue } = envEditState
    const { editingSecretName } = secretEditState

    useEffect(() => {
        const loadSecrets = async () => {
            const data = await SecretsService.getSecrets()
            setAvailableSecrets(Object.keys(data.secrets))
        }
        loadSecrets()

        // Listen for output
        const removeListener = window.api.script.onOutput((data) => {
            if (data.scriptId === script.id) {
                setOutput((prev) => prev + data.data)
            }
        })

        return () => {
            removeListener()
        }
    }, [script.id])

    const handleTypeChange = (value: string) => {
        onUpdate({
            ...script,
            type: value as 'bash' | 'csharp' | 'python' | 'powershell' | 'custom',
        })
    }

    const handleCustomCommandChange = (value: string) => {
        onUpdate({ ...script, customCommand: value })
    }

    const handleFileSelect = async () => {
        try {
            const path = await window.api.dialog.openScript()
            if (path) {
                onUpdate({ ...script, path })
            }
        } catch (error) {
            console.error('Failed to select file:', error)
        }
    }

    const handleDeleteClick = () => {
        setOpen(false)
        setShowDeleteDialog(true)
    }

    const handleAddEnv = () => {
        setOpen(false)
        setEditingMultiValueKey(undefined)
        setEditingMultiValueValue(undefined)
        setShowMultiValueDialog(true)
    }

    const handleAddSecret = () => {
        setOpen(false)
        setEditFormState((prev) => ({
            ...prev,
            ...EnvSecretEditorService.startAddingSecret(),
        }))
    }

    const handleManageVariables = async () => {
        setOpen(false)
        const data = await SecretsService.getSecrets()
        setAvailableSecretsData(data.secrets)
        setShowManageVariables(true)
    }

    const handleEditEnv = (key: string) => {
        setEditFormState((prev) => ({
            ...prev,
            ...EnvSecretEditorService.startEditingEnv(script, key),
        }))
    }

    const handleEditSecret = (secretName: string) => {
        setEditFormState((prev) => ({
            ...prev,
            ...EnvSecretEditorService.startEditingSecret(secretName),
        }))
    }

    const handleCancelEdit = () => {
        setEditFormState((prev) => ({
            ...prev,
            ...EnvSecretEditorService.cancelEditing(),
        }))
    }

    const handleMultiValueDialogSave = (key: string, envValue: EnvValue) => {
        const result = {
            env: {
                ...(script.env || {}),
                [key]: envValue,
            },
        }

        onUpdate({ ...script, ...result })
        setShowMultiValueDialog(false)
        setEditingMultiValueKey(undefined)
        setEditingMultiValueValue(undefined)
    }

    const handleSaveEnv = () => {
        let result
        if (EnvSecretEditorService.isEditingEnv(editFormState)) {
            result = EnvSecretEditorService.updateEnv(script, editingEnvKey!, newEnvValue)
        } else {
            result = EnvSecretEditorService.saveEnv(script, newEnvKey, newEnvValue)
        }

        if (result) {
            onUpdate({ ...script, ...result })
            setEditFormState((prev) => ({
                ...prev,
                ...EnvSecretEditorService.cancelEditing(),
            }))
        }
    }

    const handleSaveSecret = (secretName: string) => {
        if (EnvSecretEditorService.isEditingSecret(editFormState)) {
            const result = EnvSecretEditorService.updateSecret(script, editingSecretName!, secretName)
            if (result) {
                onUpdate({ ...script, ...result })
                setEditFormState((prev) => ({
                    ...prev,
                    ...EnvSecretEditorService.cancelEditing(),
                }))
            }
        } else {
            const result = EnvSecretEditorService.saveSecret(script, secretName)
            if (result) {
                onUpdate({ ...script, ...result })
                setEditFormState((prev) => ({
                    ...prev,
                    ...EnvSecretEditorService.cancelEditing(),
                }))
            }
        }
    }

    const handleRemoveEnvClick = (key: string) => {
        setItemToDelete({ type: 'env', key })
        setShowDeleteItemDialog(true)
    }

    const handleRemoveSecretClick = (secretName: string) => {
        setItemToDelete({ type: 'secret', key: secretName })
        setShowDeleteItemDialog(true)
    }

    const handleConfirmItemDelete = () => {
        if (!itemToDelete) return
        if (itemToDelete.type === 'env') {
            const result = EnvSecretEditorService.removeEnv(script, itemToDelete.key)
            onUpdate({ ...script, ...result })
        } else {
            const result = EnvSecretEditorService.removeSecret(script, itemToDelete.key)
            onUpdate({ ...script, ...result })
        }
        setShowDeleteItemDialog(false)
        setItemToDelete(null)
    }

    const handleCancelItemDelete = () => {
        setShowDeleteItemDialog(false)
        setItemToDelete(null)
    }

    const handleConfirmDelete = () => {
        onRemove(script.id)
        setShowDeleteDialog(false)
    }

    const handleRunClick = async () => {
        setIsRunning(true)
        setOutput('') // Clear previous output
        try {
            await onRun(script)
        } finally {
            setIsRunning(false)
        }
    }

    const handleStopClick = async () => {
        try {
            await window.api.script.stopScript(script.id)
            // setIsRunning will be set to false when the run promise rejects/resolves in the parent or here if we awaited it differently
            // But since onRun awaits the main process, triggering stop should cause onRun to complete/fail.
        } catch (error) {
            console.error('Failed to stop script:', error)
        }
    }

    const handleCopyEnvVar = (key: string, envValue: EnvValue, targetScriptId: string) => {
        if (!onCopyEnvVar || !scripts) return
        setCopyToOpen(null)

        const result = CopyScriptService.copyEnvVar(scripts, script.id, key, envValue, targetScriptId)

        if (result.success) {
            onCopyEnvVar(key, MultiValueVariableService.getCurrentValue(envValue), targetScriptId)
        } else if (result.conflict) {
            setOverwriteInfo({
                type: 'env',
                key: result.conflict.key,
                value: MultiValueVariableService.getCurrentValue(envValue),
                envValue,
                targetScriptId: result.conflict.targetScriptId,
                targetScriptName: result.conflict.targetScriptName,
            })
            setShowOverwriteDialog(true)
        }
    }

    const handleCopySecret = (secretName: string, targetScriptId: string) => {
        if (!onCopySecret || !scripts) return
        setCopyToOpen(null)

        const result = CopyScriptService.copySecret(scripts, script.id, secretName, targetScriptId)

        if (result.success) {
            onCopySecret(secretName, targetScriptId)
        } else if (result.conflict) {
            setOverwriteInfo({
                type: 'secret',
                key: result.conflict.key,
                value: '',
                targetScriptId: result.conflict.targetScriptId,
                targetScriptName: result.conflict.targetScriptName,
            })
            setShowOverwriteDialog(true)
        }
    }

    const handleConfirmOverwrite = () => {
        if (!overwriteInfo || !scripts) return
        const updated = CopyScriptService.performCopyWithOverwrite(
            scripts,
            overwriteInfo.type,
            overwriteInfo.key,
            overwriteInfo.envValue || MultiValueVariableService.createStatic(overwriteInfo.value),
            overwriteInfo.targetScriptId,
        )
        if (updated) {
            onUpdate(updated)
        }
        setShowOverwriteDialog(false)
        setOverwriteInfo(null)
    }

    const handleCancelOverwrite = () => {
        setShowOverwriteDialog(false)
        setOverwriteInfo(null)
    }

    // Sync name edit state when script.name changes externally
    useEffect(() => {
        setNameEditState((prev) => ({
            ...prev,
            value: script.name || '',
        }))
    }, [script.name])

    const handleNameChange = (value: string) => {
        setNameEditState((prev) => ({
            ...prev,
            value: ScriptNameEditorService.updateValue(prev.value, value),
        }))
    }

    const handleSaveName = () => {
        const result = ScriptNameEditorService.saveName(nameEditState.value)
        onUpdate({ ...script, ...result })
        setNameEditState((prev) => ({ ...prev, isEditing: false }))
    }

    const handleCancelNameEdit = () => {
        setNameEditState((prev) => ({
            ...prev,
            ...ScriptNameEditorService.cancelEditing(script.name),
        }))
    }

    const handleStartEditingName = () => {
        setNameEditState((prev) => ({
            ...prev,
            ...ScriptNameEditorService.startEditing(script.name),
        }))
    }

    const handleOpenScriptEditor = async () => {
        if (!script.path) {
            return
        }
        const state = await ScriptFileEditorService.openEditor(script.path)
        setScriptEditorState(state)
    }

    const handleCloseScriptEditor = () => {
        setScriptEditorState(ScriptFileEditorService.closeEditor())
    }

    const handleScriptContentChange = (content: string) => {
        setScriptEditorState((prev) => ScriptFileEditorService.updateContent(prev, content))
    }

    const handleSaveScriptFile = async () => {
        const result = await ScriptFileEditorService.saveFile(scriptEditorState)
        setScriptEditorState(result)
    }

    return (
        <div
            className={ScriptEntryStatusService.getContainerClasses(
                'flex flex-col gap-5 p-4 border rounded-md bg-card shadow-sm',
                executionStatus,
            )}
        >
            {/* Name Section - Top Row with Menu */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    {dragHandle}
                    {nameEditState.isEditing ? (
                        // Edit Mode
                        <>
                            <Input
                                placeholder="Enter script name"
                                value={nameEditState.value}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNameChange(e.target.value)}
                                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                    if (e.key === 'Enter') {
                                        e.stopPropagation()
                                        handleSaveName()
                                    }
                                    if (e.key === 'Escape') {
                                        e.stopPropagation()
                                        handleCancelNameEdit()
                                    }
                                }}
                                autoFocus
                                className="flex-1 max-w-[200px]"
                            />
                            <Button size="sm" onClick={handleSaveName}>
                                Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancelNameEdit}>
                                <X className="h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        // Display Mode
                        <>
                            {script.name ? (
                                // Has name: show name + edit icon on right
                                <>
                                    <span className="font-medium">{script.name}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleStartEditingName}
                                        title="Edit script name"
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                </>
                            ) : (
                                // No name: show only edit icon
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleStartEditingName}
                                    title="Edit script name"
                                >
                                    <Pencil className="h-3 w-3" />
                                </Button>
                            )}
                        </>
                    )}
                </div>

                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground" title="Open menu">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="end">
                        <Command>
                            <CommandList>
                                <CommandGroup>
                                    <CommandItem onSelect={handleAddEnv}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Variable
                                    </CommandItem>
                                    <CommandItem onSelect={handleAddSecret}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Secret
                                    </CommandItem>
                                    <CommandItem onSelect={handleManageVariables}>
                                        <Settings className="mr-2 h-4 w-4" />
                                        Manage Variables
                                    </CommandItem>
                                    <CommandItem
                                        onSelect={handleDeleteClick}
                                        className="text-red-500 aria-selected:text-red-500"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </CommandItem>
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>

                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the script entry.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-500 hover:bg-red-600">
                                Confirm
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog
                    open={showOverwriteDialog}
                    onOpenChange={(open: boolean) => !open && handleCancelOverwrite()}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Overwrite {overwriteInfo?.key}?</AlertDialogTitle>
                            <AlertDialogDescription>
                                {overwriteInfo?.type === 'env' ? (
                                    <>
                                        "{overwriteInfo?.key}" already exists in "{overwriteInfo?.targetScriptName}".
                                        Overwrite with "{overwriteInfo?.value}"?
                                    </>
                                ) : (
                                    <>
                                        Secret "{overwriteInfo?.key}" is already used in "
                                        {overwriteInfo?.targetScriptName}". Add it again?
                                    </>
                                )}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={handleCancelOverwrite}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmOverwrite}>Overwrite</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={showDeleteItemDialog} onOpenChange={setShowDeleteItemDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Delete {itemToDelete?.type === 'env' ? 'variable' : 'secret'}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete "{itemToDelete?.key}"? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={handleCancelItemDelete}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleConfirmItemDelete}
                                className="bg-red-500 hover:bg-red-600"
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            {/* Environment Variables and Secrets Section */}
            <div className="flex flex-col gap-2">
                {/* Environment Variables List */}
                {script.env && Object.keys(script.env).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(script.env).map(([key, envValue]) => {
                            // Handle multi-value variables
                            if (MultiValueVariableService.isMultiValue(envValue)) {
                                const handleMultiValueChange = (newValue: MultiValueEnvVariable) => {
                                    onUpdate({
                                        ...script,
                                        env: {
                                            ...script.env,
                                            [key]: newValue,
                                        },
                                    })
                                }

                                if (envValue.display === 'dropdown') {
                                    return (
                                        <MultiValueDropdown
                                            key={key}
                                            name={key}
                                            value={envValue}
                                            onChange={handleMultiValueChange}
                                        />
                                    )
                                } else {
                                    return (
                                        <MultiValueRadio
                                            key={key}
                                            name={key}
                                            value={envValue}
                                            onChange={handleMultiValueChange}
                                        />
                                    )
                                }
                            }

                            // Handle static variables
                            const value = MultiValueVariableService.getCurrentValue(envValue)
                            return (
                                <div
                                    key={key}
                                    className="flex items-center gap-2 px-2 py-1 bg-secondary rounded text-xs border"
                                >
                                    <span className="font-medium text-secondary-foreground">{key}</span>
                                    <span className="text-muted-foreground">=</span>
                                    <span className="truncate max-w-[100px]">
                                        {value || <span className="italic text-muted-foreground">empty</span>}
                                    </span>
                                    <button
                                        onClick={() => handleEditEnv(key)}
                                        className="hover:text-primary transition-colors"
                                        title="Edit environment variable"
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </button>
                                    {scripts && scripts.length > 1 && (
                                        <Popover
                                            open={copyToOpen === `env-${key}`}
                                            onOpenChange={(open: boolean) => setCopyToOpen(open ? `env-${key}` : null)}
                                        >
                                            <PopoverTrigger asChild>
                                                <button
                                                    className="hover:text-primary transition-colors"
                                                    title="Copy to another script"
                                                >
                                                    <Copy className="h-3 w-3" />
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="p-0" align="start">
                                                <Command>
                                                    <CommandList>
                                                        <CommandGroup>
                                                            {scripts
                                                                .filter((s) => s.id !== script.id)
                                                                .map((target) => (
                                                                    <CommandItem
                                                                        key={target.id}
                                                                        onSelect={() =>
                                                                            handleCopyEnvVar(
                                                                                key,
                                                                                envValue as EnvValue,
                                                                                target.id,
                                                                            )
                                                                        }
                                                                    >
                                                                        {target.name || 'Unnamed Script'}
                                                                    </CommandItem>
                                                                ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                    <button
                                        onClick={() => handleRemoveEnvClick(key)}
                                        className="hover:text-red-500 transition-colors"
                                        title="Remove environment variable"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Secrets List */}
                {script.secrets && script.secrets.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {script.secrets.map((secret: string) => (
                            <div
                                key={secret}
                                className="flex items-center gap-2 px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded text-xs border border-yellow-500/20"
                            >
                                <Lock className="h-3 w-3" />
                                <span className="font-medium">{secret}</span>
                                <button
                                    onClick={() => handleEditSecret(secret)}
                                    className="hover:text-primary transition-colors"
                                    title="Edit secret"
                                >
                                    <Pencil className="h-3 w-3" />
                                </button>
                                {scripts && scripts.length > 1 && (
                                    <Popover
                                        open={copyToOpen === `secret-${secret}`}
                                        onOpenChange={(open: boolean) =>
                                            setCopyToOpen(open ? `secret-${secret}` : null)
                                        }
                                    >
                                        <PopoverTrigger asChild>
                                            <button
                                                className="hover:text-primary transition-colors"
                                                title="Copy to another script"
                                            >
                                                <Copy className="h-3 w-3" />
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="p-0" align="start">
                                            <Command>
                                                <CommandList>
                                                    <CommandGroup>
                                                        {scripts
                                                            .filter((s) => s.id !== script.id)
                                                            .map((target) => (
                                                                <CommandItem
                                                                    key={target.id}
                                                                    onSelect={() => handleCopySecret(secret, target.id)}
                                                                >
                                                                    {target.name || 'Unnamed Script'}
                                                                </CommandItem>
                                                            ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                )}
                                <button
                                    onClick={() => handleRemoveSecretClick(secret)}
                                    className="hover:text-red-500 transition-colors"
                                    title="Remove secret"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Env Variable Dialog */}
                <EnvVariableDialog
                    open={isAddingEnv}
                    onOpenChange={(open) => {
                        if (!open) {
                            handleCancelEdit()
                        }
                    }}
                    envKey={newEnvKey}
                    envValue={newEnvValue}
                    isEditing={!!editingEnvKey}
                    onEnvKeyChange={(key) =>
                        setEditFormState((prev) => ({
                            ...prev,
                            envEditState: EnvSecretEditorService.updateEnvKey(prev.envEditState, key),
                        }))
                    }
                    onEnvValueChange={(value) =>
                        setEditFormState((prev) => ({
                            ...prev,
                            envEditState: EnvSecretEditorService.updateEnvValue(prev.envEditState, value),
                        }))
                    }
                    onSave={handleSaveEnv}
                    onCancel={handleCancelEdit}
                />

                {/* Add/Edit Secret Form */}
                {isAddingSecret && (
                    <div className="flex gap-2 items-end p-2 border rounded bg-muted/50">
                        <div className="flex-1 space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground">
                                {editingSecretName ? 'Change Secret' : 'Select Secret'}
                            </Label>
                            <Select onValueChange={handleSaveSecret}>
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue
                                        placeholder={
                                            editingSecretName ? `Currently: ${editingSecretName}` : 'Select a secret...'
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {EnvSecretEditorService.getFilteredAvailableSecrets(
                                        availableSecrets,
                                        script.secrets || [],
                                        editingSecretName,
                                    ).map((secret: string) => (
                                        <SelectItem key={secret} value={secret}>
                                            {secret}
                                        </SelectItem>
                                    ))}
                                    {!EnvSecretEditorService.hasAvailableSecrets(
                                        availableSecrets,
                                        script.secrets || [],
                                        editingSecretName,
                                    ) && (
                                        <div className="p-2 text-xs text-muted-foreground italic">
                                            {editingSecretName
                                                ? 'No other secrets available'
                                                : 'No more secrets available'}
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8 p-0">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            <hr></hr>
            {/* Script Type Selection */}
            <div className="flex items-center gap-2 ml-2.5">
                <RadioGroup
                    value={script.type}
                    onValueChange={handleTypeChange}
                    className="flex flex-row gap-4 flex-wrap"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="bash" id={`bash-${script.id}`} />
                        <Label htmlFor={`bash-${script.id}`}>Bash</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="csharp" id={`csharp-${script.id}`} />
                        <Label htmlFor={`csharp-${script.id}`}>C#</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="python" id={`python-${script.id}`} />
                        <Label htmlFor={`python-${script.id}`}>Python</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="powershell" id={`powershell-${script.id}`} />
                        <Label htmlFor={`powershell-${script.id}`}>PowerShell</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="custom" id={`custom-${script.id}`} />
                        <Label htmlFor={`custom-${script.id}`}>Custom</Label>
                    </div>
                </RadioGroup>
            </div>

            {/* Custom Command Input */}
            {script.type === 'custom' && (
                <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Custom Command</Label>
                    <Input
                        placeholder="Enter custom command (e.g., node script.js)"
                        value={script.customCommand || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCustomCommandChange(e.target.value)}
                        className="text-sm"
                    />
                </div>
            )}

            <div className="flex gap-2">
                {!isRunning ? (
                    <Button variant="ghost" size="icon" onClick={handleRunClick}>
                        <Play className="h-4 w-4" />
                    </Button>
                ) : (
                    <Button variant="destructive" size="icon" onClick={handleStopClick}>
                        <div className="h-3 w-3 bg-current rounded-sm" />
                    </Button>
                )}
                <div className="flex-1 p-2 bg-muted rounded text-sm font-mono truncate border">
                    {script.path || <span className="text-muted-foreground italic">No file selected</span>}
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleOpenScriptEditor}
                    disabled={!script.path}
                    title="Edit script file"
                    className="text-muted-foreground hover:text-foreground shrink-0"
                >
                    <FileEdit className="h-4 w-4" />
                </Button>
                <Button variant="secondary" onClick={handleFileSelect} className="shrink-0">
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Select Script
                </Button>
            </div>

            {/* Output Display */}
            {output && (
                <div className="mt-2 p-2 bg-black text-white font-mono text-xs rounded h-32 overflow-y-auto whitespace-pre-wrap">
                    {output}
                </div>
            )}

            <ManageVariablesDialog
                open={showManageVariables}
                onOpenChange={setShowManageVariables}
                script={script}
                availableSecrets={availableSecretsData}
                onUpdate={onUpdate}
            />

            <MultiValueVariableDialog
                open={showMultiValueDialog}
                onOpenChange={setShowMultiValueDialog}
                initialKey={editingMultiValueKey}
                initialValue={editingMultiValueValue}
                onSave={handleMultiValueDialogSave}
                existingKeys={Object.keys(script.env || {})}
            />

            <EditScriptDialog
                open={scriptEditorState.isOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        handleCloseScriptEditor()
                    }
                }}
                filePath={scriptEditorState.filePath}
                fileContent={scriptEditorState.fileContent}
                originalContent={scriptEditorState.originalContent}
                error={scriptEditorState.error}
                saveSuccess={scriptEditorState.saveSuccess}
                isLoading={scriptEditorState.isLoading}
                onContentChange={handleScriptContentChange}
                onSave={handleSaveScriptFile}
                onCancel={handleCloseScriptEditor}
            />
        </div>
    )
}
