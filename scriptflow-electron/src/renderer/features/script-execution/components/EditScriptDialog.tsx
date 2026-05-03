import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScriptFileEditorService } from '../services/script-file-editor-service'
import { ToasterService } from '@/lib/services/toaster-service'
import { useEffect, useRef, useCallback, useState } from 'react'
import { Save, AlertCircle } from 'lucide-react'

interface EditScriptDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    filePath: string
    fileContent: string
    originalContent: string
    error: string | null
    saveSuccess: boolean
    isLoading: boolean
    onContentChange: (content: string) => void
    onSave: () => void
    onCancel: () => void
}

export function EditScriptDialog({
    open,
    onOpenChange,
    filePath,
    fileContent,
    originalContent,
    error,
    saveSuccess,
    isLoading,
    onContentChange,
    onSave,
    onCancel,
}: EditScriptDialogProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
    const hasChanges = ScriptFileEditorService.hasChanges({
        isOpen: open,
        filePath,
        fileContent,
        originalContent,
        isLoading,
        error,
        saveSuccess,
    })

    const filename = ScriptFileEditorService.getFilename(filePath)

    // Show toast on save success
    useEffect(() => {
        if (saveSuccess && open) {
            ToasterService.showSuccess('File saved')
        }
    }, [saveSuccess, open])

    // Handle keyboard shortcuts
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                if (hasChanges && !isLoading) {
                    onSave()
                    // Stay open after Ctrl+S
                }
            }
            // ESC closes immediately (default behavior), no confirmation
            if (e.key === 'Escape' && !isLoading && showDiscardConfirm) {
                e.preventDefault()
                setShowDiscardConfirm(false)
            }
        },
        [hasChanges, isLoading, onSave, showDiscardConfirm],
    )

    useEffect(() => {
        if (open) {
            // Focus the textarea when dialog opens
            setTimeout(() => {
                textareaRef.current?.focus()
            }, 100)

            document.addEventListener('keydown', handleKeyDown)
            return () => {
                document.removeEventListener('keydown', handleKeyDown)
            }
        }
    }, [open, handleKeyDown])

    const handleSave = () => {
        onSave()
        // Close modal after save button click
        onCancel()
    }

    const handleCancel = () => {
        if (hasChanges) {
            setShowDiscardConfirm(true)
        } else {
            onCancel()
        }
    }

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            // ESC or click outside: close immediately without confirmation
            onCancel()
        }
        onOpenChange(isOpen)
    }

    const handleDiscardChanges = () => {
        setShowDiscardConfirm(false)
        onCancel()
    }

    const handleKeepEditing = () => {
        setShowDiscardConfirm(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[600px] w-[90vw] max-w-[800px] h-[80vh] flex flex-col">
                <DialogHeader className="shrink-0">
                    <DialogTitle>Edit: {filename}</DialogTitle>
                    <DialogDescription>
                        Edit the script file content directly. Use Ctrl+S (Cmd+S on Mac) to save.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 flex flex-col min-h-0 py-4">
                    {error && (
                        <div className="mb-4 p-3 rounded-md border bg-destructive/10 text-destructive flex items-start gap-2 shrink-0">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    <textarea
                        ref={textareaRef}
                        value={fileContent}
                        onChange={(e) => onContentChange(e.target.value)}
                        disabled={isLoading || showDiscardConfirm}
                        className="flex-1 w-full min-h-[300px] p-4 font-mono text-sm bg-muted/30 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder={isLoading ? 'Loading file...' : 'File content will appear here'}
                        spellCheck={false}
                    />
                </div>

                <DialogFooter className="shrink-0 border-t pt-4">
                    <div className="flex justify-between items-center w-full">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            {hasChanges ? (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    Unsaved changes
                                </>
                            ) : (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    All changes saved
                                </>
                            )}
                        </span>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={!hasChanges || isLoading} className="gap-2">
                                <Save className="h-4 w-4" />
                                Save
                            </Button>
                        </div>
                    </div>
                </DialogFooter>

                {/* Discard Changes Confirmation Overlay */}
                {showDiscardConfirm && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
                        <div className="bg-card border rounded-lg p-6 shadow-lg max-w-sm mx-4">
                            <h3 className="font-semibold text-lg mb-2">Discard changes?</h3>
                            <p className="text-sm text-muted-foreground mb-6">
                                You have unsaved changes. Are you sure you want to discard them?
                            </p>
                            <div className="flex gap-2 justify-end">
                                <Button variant="ghost" onClick={handleKeepEditing}>
                                    Keep Editing
                                </Button>
                                <Button variant="destructive" onClick={handleDiscardChanges}>
                                    Discard Changes
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
