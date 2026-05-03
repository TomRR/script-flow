import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { List, Lock, Pencil, Trash2, Settings, Plus } from 'lucide-react'
import type { ScriptEntry, EnvValue } from '../../../../renderer.d'
import { MultiValueVariableService } from '../services/multi-value-variable-service'
import { MultiValueVariableDialog } from './MultiValueVariableDialog'

interface ManageVariablesDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    script: ScriptEntry
    availableSecrets: Record<string, { value: string; encrypted: boolean }>
    onUpdate: (script: ScriptEntry) => void
}

interface VariableItem {
    id: string
    type: 'variable' | 'secret'
    key: string
    value: string
    envValue?: EnvValue
}

export function ManageVariablesDialog({
    open,
    onOpenChange,
    script,
    availableSecrets,
    onUpdate,
}: ManageVariablesDialogProps) {
    const [items, setItems] = useState<VariableItem[]>([])
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<VariableItem | null>(null)
    const [showVariableDialog, setShowVariableDialog] = useState(false)
    const [editingItem, setEditingItem] = useState<VariableItem | null>(null)

    useEffect(() => {
        if (open) {
            const variableItems: VariableItem[] = Object.entries(script.env || {}).map(([key, envValue]) => ({
                id: `var-${key}`,
                type: 'variable',
                key,
                value: MultiValueVariableService.getDisplayValue(envValue),
                envValue,
            }))

            const secretItems: VariableItem[] = (script.secrets || []).map((secretName) => ({
                id: `sec-${secretName}`,
                type: 'secret',
                key: secretName,
                value: '*****',
            }))

            const allItems = [...variableItems, ...secretItems].sort((a, b) => a.key.localeCompare(b.key))

            setItems(allItems)
        }
    }, [open, script.env, script.secrets, availableSecrets])

    const truncateValue = (value: string, maxLength = 50) => {
        if (value.length <= maxLength) return value
        return value.substring(0, maxLength) + '...'
    }

    const handleDeleteClick = (item: VariableItem) => {
        setItemToDelete(item)
        setShowDeleteDialog(true)
    }

    const handleConfirmDelete = () => {
        if (itemToDelete) {
            setItems((prev) => prev.filter((item) => item.id !== itemToDelete.id))
            setShowDeleteDialog(false)
            setItemToDelete(null)
        }
    }

    const handleCancelDelete = () => {
        setShowDeleteDialog(false)
        setItemToDelete(null)
    }

    const handleEditClick = (item: VariableItem) => {
        if (item.type === 'variable') {
            setEditingItem(item)
            setShowVariableDialog(true)
        }
    }

    const handleAddVariable = () => {
        setEditingItem(null)
        setShowVariableDialog(true)
    }

    const handleVariableSave = (key: string, value: EnvValue) => {
        if (editingItem) {
            // Update existing
            setItems((prev) =>
                prev.map((item) =>
                    item.id === editingItem.id
                        ? {
                              ...item,
                              key,
                              value: MultiValueVariableService.getDisplayValue(value),
                              envValue: value,
                          }
                        : item,
                ),
            )
        } else {
            // Add new
            setItems((prev) => [
                ...prev,
                {
                    id: `var-${key}`,
                    type: 'variable',
                    key,
                    value: MultiValueVariableService.getDisplayValue(value),
                    envValue: value,
                },
            ])
        }
    }

    const handleVariableDialogClose = (open: boolean) => {
        setShowVariableDialog(open)
        if (!open) {
            setEditingItem(null)
        }
    }

    const handleSave = () => {
        const newEnv: Record<string, EnvValue> = {}
        const newSecrets: string[] = []

        items.forEach((item) => {
            if (item.type === 'variable') {
                if (item.envValue) {
                    newEnv[item.key] = item.envValue
                }
            } else if (item.type === 'secret') {
                newSecrets.push(item.key)
            }
        })

        onUpdate({
            ...script,
            env: newEnv,
            secrets: newSecrets,
        })

        onOpenChange(false)
    }

    const handleCancel = () => {
        onOpenChange(false)
    }

    const hasItems = items.length > 0

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Manage Variables
                        </DialogTitle>
                        <DialogDescription>
                            View and manage environment variables and secrets for this script.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto py-4">
                        <div className="mb-4">
                            <Button onClick={handleAddVariable} size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Variable
                            </Button>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Type</TableHead>
                                    <TableHead>Key</TableHead>
                                    <TableHead>Value</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {hasItems ? (
                                    items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                {item.type === 'variable' ? (
                                                    <List className="h-4 w-4 text-blue-500" />
                                                ) : (
                                                    <Lock className="h-4 w-4 text-yellow-500" />
                                                )}
                                            </TableCell>
                                            <TableCell className="font-mono font-medium">{item.key}</TableCell>
                                            <TableCell>
                                                {item.type === 'secret' ? (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger className="cursor-help">
                                                                <span className="text-muted-foreground">*****</span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Can be edited under &apos;Manage Secrets&apos;</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                ) : (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger className="cursor-help text-left max-w-[200px] truncate">
                                                                {item.envValue &&
                                                                MultiValueVariableService.isMultiValue(
                                                                    item.envValue,
                                                                ) ? (
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        {item.envValue.display === 'dropdown'
                                                                            ? 'Dropdown'
                                                                            : 'Radio'}
                                                                    </Badge>
                                                                ) : (
                                                                    truncateValue(item.value)
                                                                )}
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p className="max-w-[300px] break-all">{item.value}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleEditClick(item)}
                                                        disabled={item.type === 'secret'}
                                                        title={
                                                            item.type === 'secret'
                                                                ? 'Secrets can only be edited in Manage Secrets'
                                                                : 'Edit variable'
                                                        }
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:text-red-500"
                                                        onClick={() => handleDeleteClick(item)}
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                            No variables or secrets configured
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <MultiValueVariableDialog
                open={showVariableDialog}
                onOpenChange={handleVariableDialogClose}
                initialKey={editingItem?.key}
                initialValue={editingItem?.envValue}
                onSave={handleVariableSave}
                existingKeys={items.filter((i) => i.id !== editingItem?.id).map((i) => i.key)}
                isEditing={!!editingItem}
            />

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {itemToDelete?.type}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{itemToDelete?.key}&quot;? This action cannot be
                            undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-500 hover:bg-red-600">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
