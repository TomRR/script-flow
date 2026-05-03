import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandItem } from '@/components/ui/command'
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
import { Key, Plus, MoreVertical, Pencil, Trash2, Eye, EyeOff, Save } from 'lucide-react'
import { SecretsService } from '../services/secrets-service'
import type { SecretEntry, SecretsData } from '../../../../renderer.d'

interface SecretsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SecretsDialog({ open, onOpenChange }: SecretsDialogProps) {
    const [secrets, setSecrets] = useState<SecretEntry[]>([])
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [isDeleting, setIsDeleting] = useState<number | null>(null)

    useEffect(() => {
        if (open) {
            loadSecrets()
        }
    }, [open])

    const loadSecrets = async () => {
        try {
            const data = await SecretsService.getSecrets()
            const entries = Object.entries(data.secrets).map(([key, val]) => ({
                key,
                value: val.value,
                encrypted: val.encrypted,
            }))
            setSecrets(entries)
        } catch (error) {
            console.error('Failed to load secrets:', error)
        }
    }

    const handleSave = async () => {
        const secretsMap: Record<string, { value: string; encrypted: boolean }> = {}
        secrets.forEach((s) => {
            if (s.key.trim()) {
                secretsMap[s.key.trim()] = {
                    value: s.value,
                    encrypted: s.encrypted,
                }
            }
        })

        const data: SecretsData = {
            version: '1.0.0',
            secrets: secretsMap,
        }

        try {
            await SecretsService.saveSecrets(data)
            setEditingIndex(null)
            onOpenChange(false)
        } catch (error) {
            console.error('Failed to save secrets:', error)
        }
    }

    const handleCancel = () => {
        setEditingIndex(null)
        onOpenChange(false)
    }

    const handleAddSecret = () => {
        const newSecret: SecretEntry = { key: '', value: '', encrypted: false }
        setSecrets([...secrets, newSecret])
        setEditingIndex(secrets.length)
    }

    const handleDelete = (index: number) => {
        setSecrets(secrets.filter((_, i) => i !== index))
        setIsDeleting(null)
    }

    const updateSecret = (index: number, updates: Partial<SecretEntry>) => {
        setSecrets((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)))
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Key className="h-5 w-5" />
                            Secrets
                        </DialogTitle>
                        <DialogDescription>
                            Manage your project secrets. These are stored locally and can be used in your scripts.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto max-h-[60vh] py-4 space-y-4">
                        {secrets.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                No secrets found. Add one to get started.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {secrets.map((secret, index) => (
                                    <SecretCard
                                        key={index}
                                        secret={secret}
                                        isEditing={editingIndex === index}
                                        onEdit={() => setEditingIndex(index)}
                                        onDelete={() => setIsDeleting(index)}
                                        onUpdate={(updates) => updateSecret(index, updates)}
                                        onStopEditing={() => setEditingIndex(null)}
                                    />
                                ))}
                            </div>
                        )}

                        <div className="flex justify-center px-2 pt-4">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleAddSecret}
                                className="w-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold text-sm"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Secret
                            </Button>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleting !== null} onOpenChange={(open: boolean) => !open && setIsDeleting(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Secret?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this secret. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => isDeleting !== null && handleDelete(isDeleting)}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

interface SecretCardProps {
    secret: SecretEntry
    isEditing: boolean
    onEdit: () => void
    onDelete: () => void
    onUpdate: (updates: Partial<SecretEntry>) => void
    onStopEditing: () => void
}

function SecretCard({ secret, isEditing, onEdit, onDelete, onUpdate, onStopEditing }: SecretCardProps) {
    const [showValue, setShowValue] = useState(false)

    return (
        <div className="border rounded-md bg-card shadow-sm p-4 relative group">
            <div className="flex items-center justify-between mb-3">
                <input
                    value={secret.key}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate({ key: e.target.value })}
                    className="flex-1 font-semibold bg-transparent border-b border-transparent focus:border-primary outline-none px-1"
                    placeholder="SECRET_KEY"
                    disabled={!isEditing}
                    autoFocus={isEditing && !secret.key}
                />
                <div className="flex items-center gap-1">
                    {isEditing ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={onStopEditing}
                        >
                            <Save className="h-4 w-4" />
                        </Button>
                    ) : null}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-32 p-1">
                            <Command>
                                <CommandItem onSelect={onEdit} className="cursor-pointer">
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                </CommandItem>
                                <CommandItem
                                    onSelect={onDelete}
                                    className="text-red-500 hover:text-red-500 cursor-pointer"
                                >
                                    <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                                    Delete
                                </CommandItem>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            <div className="relative">
                <Input
                    value={secret.value}
                    onChange={(e) => onUpdate({ value: e.target.value })}
                    type={showValue ? 'text' : 'password'}
                    className="font-mono pr-10"
                    placeholder="secret-value"
                    disabled={!isEditing}
                />
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full hover:bg-transparent"
                    onClick={() => setShowValue(!showValue)}
                >
                    {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
        </div>
    )
}
