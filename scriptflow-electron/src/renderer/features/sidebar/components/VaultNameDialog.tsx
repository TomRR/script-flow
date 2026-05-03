import { useState, useEffect, useRef } from 'react'
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

interface VaultNameDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (name: string) => void
    onCancel: () => void
    initialValue?: string
    mode?: 'create' | 'rename'
}

export function VaultNameDialog({
    open,
    onOpenChange,
    onConfirm,
    onCancel,
    initialValue = '',
    mode = 'create',
}: VaultNameDialogProps) {
    const [name, setName] = useState(initialValue)
    const inputRef = useRef<HTMLInputElement>(null)

    const isRename = mode === 'rename'

    useEffect(() => {
        if (open) {
            setName(initialValue)
            setTimeout(() => {
                inputRef.current?.focus()
                inputRef.current?.select()
            }, 0)
        }
    }, [open, initialValue])

    const handleConfirm = () => {
        // If empty, use "Vault" as default
        const finalName = name.trim() || 'Vault'
        onConfirm(finalName)
        onOpenChange(false)
    }

    const handleCancel = () => {
        onCancel()
        onOpenChange(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleConfirm()
        } else if (e.key === 'Escape') {
            handleCancel()
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isRename ? 'Rename Vault' : 'Name Your Vault'}</DialogTitle>
                    <DialogDescription>
                        {isRename
                            ? 'Enter a new name for this vault. If left empty, "Vault" will be used.'
                            : 'Enter a name for this vault. If left empty, "Vault" will be used.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="vault-name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="vault-name"
                            ref={inputRef}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Vault"
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm}>{isRename ? 'Save' : 'Open Vault'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
