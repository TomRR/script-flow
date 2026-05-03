import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEffect, useRef } from 'react'

interface EnvVariableDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    envKey: string
    envValue: string
    isEditing: boolean
    onEnvKeyChange: (key: string) => void
    onEnvValueChange: (value: string) => void
    onSave: () => void
    onCancel: () => void
}

export function EnvVariableDialog({
    open,
    onOpenChange,
    envKey,
    envValue,
    isEditing,
    onEnvKeyChange,
    onEnvValueChange,
    onSave,
    onCancel,
}: EnvVariableDialogProps) {
    const keyInputRef = useRef<HTMLInputElement>(null)
    const valueInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (open) {
            setTimeout(() => {
                if (isEditing) {
                    valueInputRef.current?.focus()
                } else {
                    keyInputRef.current?.focus()
                }
            }, 100)
        }
    }, [open, isEditing])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            if (envKey.trim()) {
                onSave()
            }
        }
        if (e.key === 'Escape') {
            e.preventDefault()
            onCancel()
        }
    }

    const handleSave = () => {
        if (envKey.trim()) {
            onSave()
        }
    }

    const handleCancel = () => {
        onCancel()
    }

    const canSave = envKey.trim().length > 0

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Environment Variable' : 'Add Environment Variable'}</DialogTitle>
                    <DialogDescription>Define a key-pair for your script execution.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="envKey">Variable Key</Label>
                        <Input
                            id="envKey"
                            ref={keyInputRef}
                            placeholder="API_ENDPOINT"
                            value={envKey}
                            onChange={(e) => onEnvKeyChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isEditing}
                            className="font-mono"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="envValue">Value</Label>
                        <Input
                            id="envValue"
                            ref={valueInputRef}
                            placeholder="https://api.scriptflow.dev"
                            value={envValue}
                            onChange={(e) => onEnvValueChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!canSave}>
                        {isEditing ? 'Save' : 'Add Variable'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
