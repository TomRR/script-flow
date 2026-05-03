import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface WelcomeProps {
    onInitSuccess: () => void
}

export function Welcome({ onInitSuccess }: WelcomeProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleOpenVault = async () => {
        setIsLoading(true)
        setError(null)
        try {
            // 1. User selects a folder
            const selectedPath = await window.api.vault.select()

            if (selectedPath) {
                // 2. Init the vault
                const success = await window.api.vault.init(selectedPath)
                if (success) {
                    onInitSuccess()
                } else {
                    setError('Failed to initialize vault. Please try again.')
                }
            }
        } catch (err) {
            console.error(err)
            setError('An unexpected error occurred.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
            <div className="max-w-md space-y-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">Welcome</h1>
                    <p className="text-lg text-muted-foreground">Please select a vault to get started</p>
                </div>

                {error && <div className="text-sm text-destructive font-medium">{error}</div>}

                <Button size="lg" onClick={handleOpenVault} disabled={isLoading} className="w-full text-lg h-12">
                    {isLoading ? 'Setting up...' : 'Open Vault'}
                </Button>
            </div>
        </div>
    )
}
