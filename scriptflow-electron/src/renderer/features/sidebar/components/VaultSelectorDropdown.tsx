import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Terminal, FolderOpen, Check, Trash2, Settings, Pencil, Lock } from 'lucide-react'
import { useState } from 'react'
import { VaultNameDialog } from './VaultNameDialog'
import { SidebarService } from '../services/sidebar-service'
import type { VaultMetadata, VaultsConfig } from '../../../../renderer.d'

interface VaultSelectorDropdownProps {
    vaultsConfig: VaultsConfig
    onSwitchVault: (vaultId: string) => void
    onOpenNewVault: () => void
    onRemoveVault: (vaultId: string, vaultName: string) => void
    onOpenSecrets: () => void
    onOpenSettings: () => void
    onOpenLogs: () => void
}

export function VaultSelectorDropdown({
    vaultsConfig,
    onSwitchVault,
    onOpenNewVault,
    onRemoveVault,
    onOpenSecrets,
    onOpenSettings,
    onOpenLogs,
}: VaultSelectorDropdownProps) {
    const activeVault = vaultsConfig.vaults.find((v) => v.id === vaultsConfig.activeVaultId)
    const displayName = activeVault?.name || 'No Vault'

    const [renameDialogOpen, setRenameDialogOpen] = useState(false)
    const [renameVaultId, setRenameVaultId] = useState<string | null>(null)

    const handleRemoveClick = (e: React.MouseEvent, vaultId: string, vaultName: string) => {
        e.stopPropagation()
        onRemoveVault(vaultId, vaultName)
    }

    const handleStartRename = (vault: VaultMetadata, e: React.MouseEvent) => {
        e.stopPropagation()
        setRenameVaultId(vault.id)
        setRenameDialogOpen(true)
    }

    const handleConfirmRename = async (name: string) => {
        if (renameVaultId) {
            const success = await SidebarService.updateVaultName(renameVaultId, name)
            if (success) {
                setRenameDialogOpen(false)
                setRenameVaultId(null)
                window.location.reload()
            }
        }
    }

    const handleCancelRename = () => {
        setRenameDialogOpen(false)
        setRenameVaultId(null)
    }

    const getRenameVaultName = () => {
        if (renameVaultId) {
            const vault = vaultsConfig.vaults.find((v) => v.id === renameVaultId)
            return vault?.name || ''
        }
        return ''
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between font-normal h-auto py-2">
                        <span className="truncate">{displayName}</span>
                        <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    {/* Vault list */}
                    {vaultsConfig.vaults.length > 0 && (
                        <>
                            <DropdownMenuLabel>Vaults</DropdownMenuLabel>
                            {vaultsConfig.vaults.map((vault) => (
                                <DropdownMenuItem
                                    key={vault.id}
                                    onClick={() => onSwitchVault(vault.id)}
                                    className="flex items-center justify-between group"
                                    disabled={!vault.exists}
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {vault.id === vaultsConfig.activeVaultId ? (
                                            <Check className="h-4 w-4 shrink-0" />
                                        ) : (
                                            <span className="w-4 shrink-0" />
                                        )}
                                        <span className={`truncate ${!vault.exists ? 'text-muted-foreground' : ''}`}>
                                            {vault.name}
                                            {!vault.exists && ' (missing)'}
                                        </span>
                                    </div>
                                    {vault.exists && (
                                        <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={(e) => handleStartRename(vault, e)}
                                            >
                                                <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={(e) => handleRemoveClick(e, vault.id, vault.name)}
                                            >
                                                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                            </Button>
                                        </div>
                                    )}
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                        </>
                    )}

                    {/* Open Vault option */}
                    <DropdownMenuItem onClick={onOpenNewVault}>
                        <FolderOpen className="mr-2 h-4 w-4" />
                        Open Vault...
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Other options */}
                    <DropdownMenuItem onClick={onOpenSecrets}>
                        <Lock className="mr-2 h-4 w-4" />
                        Manage Secrets
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={onOpenSettings}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={onOpenLogs}>
                        <Terminal className="mr-2 h-4 w-4" />
                        Logs
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <VaultNameDialog
                open={renameDialogOpen}
                onOpenChange={setRenameDialogOpen}
                onConfirm={handleConfirmRename}
                onCancel={handleCancelRename}
                initialValue={getRenameVaultName()}
                mode="rename"
            />
        </>
    )
}
