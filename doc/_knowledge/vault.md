# Vault System Documentation

## Overview

The vault system manages multiple script repositories (vaults) with support for opening, renaming, switching, and removing vaults. Each vault is a directory containing scripts organized into sections and workflows.

## Key Behaviors

| Action | Behavior |
|--------|----------|
| **Open new vault** | New vault becomes active automatically |
| **Rename vault** | Current active vault stays active (no change) |
| **Switch vault** | Selected vault becomes active |
| **Remove vault** | If active vault removed, switches to another vault |
| **Vault names** | Not required to be unique |

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Renderer Process                      │
│  ┌──────────────────┐        ┌──────────────────────────┐  │
│  │  VaultSelector   │───────▶│   VaultNameDialog        │  │
│  │  Dropdown        │        │   (create/rename mode)   │  │
│  └────────┬─────────┘        └──────────────────────────┘  │
│           │                                                  │
│           ▼                                                  │
│  ┌──────────────────┐        ┌──────────────────────────┐  │
│  │  SidebarService  │───────▶│   window.api.vault.*     │  │
│  │  (static methods)│        │   (IPC via preload)      │  │
│  └──────────────────┘        └──────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ IPC
┌────────────────────────┼────────────────────────────────────┐
│                        ▼                                     │
│                        Main Process                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  main.ts - IPC Handlers                                │ │
│  │  ├─ vault:init          → vaultHandler.initializeVault │ │
│  │  ├─ vault:updateVaultName → vaultHandler.updateVaultName│ │
│  │  ├─ vault:addVault      → vaultHandler.addVault        │ │
│  │  ├─ vault:removeVault   → vaultHandler.removeVault     │ │
│  │  └─ vault:setActiveVault → vaultHandler.setActiveVault │ │
│  └────────────────────┬───────────────────────────────────┘ │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  VaultHandler                                          │ │
│  │  (business logic coordination)                         │ │
│  └────────────────────┬───────────────────────────────────┘ │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  MultiVaultService                                     │ │
│  │  ├─ addVault()        ← Always sets activeVaultId     │ │
│  │  ├─ updateVaultName() ← Only changes name field       │ │
│  │  ├─ removeVault()     ← May change activeVaultId      │ │
│  │  ├─ setActiveVault()  ← Changes activeVaultId         │ │
│  │  └─ getVaultsConfig() ← Returns full config           │ │
│  └────────────────────┬───────────────────────────────────┘ │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  vault-config.json                                     │ │
│  │  (stored in app config directory)                      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## File Locations

### Frontend (Renderer)
| File | Purpose |
|------|---------|
| `src/renderer/features/sidebar/components/VaultSelectorDropdown.tsx` | Vault dropdown UI with inline actions |
| `src/renderer/features/sidebar/components/VaultNameDialog.tsx` | Dialog for naming/renaming vaults |
| `src/renderer/features/sidebar/services/sidebar-service.ts` | Service layer for vault operations |

### Backend (Main)
| File | Purpose |
|------|---------|
| `src/main/main.ts` | IPC handler registration |
| `src/main/vault-handler.ts` | High-level vault operations |
| `src/main/multi-vault-service.ts` | Config persistence and business logic |

### Bridge
| File | Purpose |
|------|---------|
| `src/preload/preload.ts` | Exposes vault API to renderer |

### Types
| File | Purpose |
|------|---------|
| `src/renderer.d.ts` | TypeScript definitions for IPC |

## Data Structures

### VaultMetadata
```typescript
interface VaultMetadata {
    id: string;        // UUID generated on creation
    name: string;      // User-defined display name
    path: string;      // Absolute filesystem path
    exists: boolean;   // Validated on load
}
```

### VaultsConfig
```typescript
interface VaultsConfig {
    activeVaultId: string | null;  // Currently active vault
    vaults: VaultMetadata[];       // All vaults
}
```

### Storage Location
**File:** `{appConfigDir}/vault-config.json`

Example:
```json
{
  "activeVaultId": "550e8400-e29b-41d4-a716-446655440000",
  "vaults": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Production Scripts",
      "path": "/Users/dev/projects/production-scripts",
      "exists": true
    },
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "name": "Personal Scripts",
      "path": "/Users/dev/scripts",
      "exists": true
    }
  ]
}
```

## Key Methods

### MultiVaultService

#### `addVault(name: string, vaultPath: string): Promise<VaultMetadata | null>`
Creates a new vault entry and **always sets it as active**.

**Behavior:**
- Generates UUID for vault ID
- Validates path exists
- Sets `activeVaultId = newVault.id`
- Saves to config

**Use Case:** Called when opening a new vault folder.

#### `updateVaultName(vaultId: string, newName: string): Promise<boolean>`
Updates only the name field of an existing vault.

**Behavior:**
- Finds vault by ID
- Updates `vault.name` field only
- Does NOT modify `activeVaultId`
- Empty name defaults to "Vault"

**Use Case:** Called when renaming a vault.

#### `setActiveVault(vaultId: string): Promise<boolean>`
Changes which vault is currently active.

**Behavior:**
- Validates vault exists
- Sets `activeVaultId = vaultId`

**Use Case:** Called when user switches vaults via dropdown.

#### `removeVault(vaultId: string): Promise<boolean>`
Removes vault from config and deletes associated secrets.

**Behavior:**
- Removes vault from `vaults` array
- If removed vault was active:
  - Sets `activeVaultId` to another vault if available
  - Sets to `null` if no vaults remain
- Deletes `{vaultId}.secrets.json` file

**Use Case:** Called when user removes a vault.

## UI Patterns

### Inline Action Buttons Pattern
Used consistently across sections, workflows, and vaults:

```tsx
// Parent needs 'group' class for hover effect
<div className="group">
  <span>Item Name</span>
  
  {/* Actions hidden by default, visible on hover */}
  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
    <Button variant="ghost" size="icon" className="h-6 w-6">
      <Pencil className="h-3 w-3" />
    </Button>
    <Button variant="ghost" size="icon" className="h-6 w-6">
      <Trash2 className="h-3 w-3" />
    </Button>
  </div>
</div>
```

### Dialog Reuse Pattern
Same dialog component handles multiple modes:

```typescript
interface DialogProps {
    mode?: 'create' | 'rename';
    initialValue?: string;
    // ... other props
}

// Usage for create
<VaultNameDialog mode="create" />

// Usage for rename  
<VaultNameDialog mode="rename" initialValue={currentName} />
```

## IPC Communication

### Channel Naming Convention
- `vault:action` for vault operations
- Format: `namespace:verb`

### Channels
| Channel | Direction | Payload | Returns |
|---------|-----------|---------|---------|
| `vault:getVaults` | R → M | - | `VaultsConfig` |
| `vault:addVault` | R → M | `name, path` | `VaultMetadata \| null` |
| `vault:updateVaultName` | R → M | `vaultId, newName` | `boolean` |
| `vault:setActiveVault` | R → M | `vaultId` | `boolean` |
| `vault:removeVault` | R → M | `vaultId` | `boolean` |
| `vault:init` | R → M | `path, name?` | `boolean` |

## Testing

### Key Test Scenarios
1. **addVault** - First vault becomes active, second vault becomes active
2. **updateVaultName** - Name changes, active vault unchanged, default name fallback
3. **removeVault** - Vault removed, active switches to remaining, secrets deleted
4. **setActiveVault** - Active ID changes, invalid ID returns false

### Test Files
- `src/main/multi-vault-service.test.ts` - Core service logic
- `src/renderer/features/sidebar/services/sidebar-service.test.ts` - Service layer

## Common Issues & Solutions

### Issue: Vault not becoming active when opened
**Cause:** `addVault()` had conditional logic: `if (!config.activeVaultId)`
**Fix:** Always set `config.activeVaultId = newVault.id`

### Issue: Rename/delete icons not appearing
**Cause:** Missing `group` class on parent element
**Fix:** Add `group` class to trigger hover state

### Issue: Dialog shows wrong button text
**Cause:** No mode distinction in dialog
**Fix:** Add `mode` prop with conditional rendering

## Related Features

- **Secrets Management:** Each vault has its own secrets file `{vaultId}.secrets.json`
- **Vault Validation:** `exists` field checked on config load to detect moved/deleted vaults
- **Legacy Migration:** Single-vault configs auto-migrate to multi-vault format

## References

- Implementation task: `/tasks/vault_rename_and_activate/task_and_plan.md`
- Schema: `/schemas/vault-config.schema.json`
