# User Story: Vault Rename and Auto-Activation

## Overview
Enable users to rename vaults inline in the vault dropdown and ensure newly opened vaults automatically become the active vault.

## Requirements

### Functional Requirements
1. **Rename Vault**: Users can rename any vault from the dropdown menu
2. **Inline Actions**: Rename and delete buttons appear on hover next to vault names in the dropdown
3. **Reused Dialog**: Use the same `VaultNameDialog` component for both creating and renaming vaults
4. **Contextual UI**: Dialog shows appropriate title/button based on mode (create vs rename)
5. **Auto-Activation**: Newly opened vaults automatically become the active vault
6. **No Uniqueness**: Vault names don't need to be unique
7. **Persistence**: All changes persist to `vault-config.json`

### UI/UX Requirements
- Icons appear inline after the vault name on hover: `Vault Name [✏️] [🗑️]`
- Use Pencil icon (from lucide-react) consistent with section/workflow rename pattern
- Current name prefilled in rename dialog
- No validation for duplicate names
- Page reloads after successful rename to refresh UI state

## Implementation Plan

### Phase 1: UI - Vault Dropdown Actions
**Files:** `src/renderer/features/sidebar/components/VaultSelectorDropdown.tsx`

**Changes:**
1. Add hover-triggered action buttons (rename + delete) to each vault item in dropdown
2. Remove any inline buttons from trigger button (main vault selector)
3. Implement `handleStartRename` to open dialog with vault context
4. Pass `mode="rename"` to `VaultNameDialog`

**Key Pattern:**
```tsx
<div className="flex items-center gap-0 opacity-0 group-hover:opacity-100">
  <Button onClick={(e) => handleStartRename(vault, e)}>
    <Pencil className="h-3 w-3" />
  </Button>
  <Button onClick={(e) => handleRemoveClick(e, vault.id, vault.name)}>
    <Trash2 className="h-3 w-3" />
  </Button>
</div>
```

### Phase 2: UI - Contextual Dialog
**Files:** `src/renderer/features/sidebar/components/VaultNameDialog.tsx`

**Changes:**
1. Add optional `mode?: 'create' | 'rename'` prop (default: 'create')
2. Compute `isRename = mode === 'rename'`
3. Dynamic title: `"Rename Vault"` vs `"Name Your Vault"`
4. Dynamic button: `"Save"` vs `"Open Vault"`
5. Same description and behavior for both modes

### Phase 3: Backend - Auto-Activation
**Files:** `src/main/multi-vault-service.ts`

**Changes:**
In `addVault()` method, replace conditional logic:
```typescript
// OLD (bug): Only set active if no vault exists
if (!config.activeVaultId) {
    config.activeVaultId = newVault.id
}

// NEW: Always set newly added vault as active
config.activeVaultId = newVault.id
```

**Rationale:** When user opens a new vault, they expect it to become active immediately.

### Phase 4: Tests
**Files:** `src/main/multi-vault-service.test.ts`

**Changes:**
Update test: `"should not change active vault when adding second vault"` → `"should set new vault as active when adding second vault"`

Verify new vault becomes active, not the first one.

## Files Modified

| File | Purpose | Lines Changed |
|------|---------|---------------|
| `VaultSelectorDropdown.tsx` | Add inline rename/delete buttons in dropdown | ~40 lines |
| `VaultNameDialog.tsx` | Add mode prop for contextual UI | ~10 lines |
| `multi-vault-service.ts` | Always set new vault as active | 4 lines |
| `multi-vault-service.test.ts` | Update test expectations | ~5 lines |

## Architecture Notes

### Data Flow
```
User clicks rename icon
  ↓
VaultSelectorDropdown.handleStartRename()
  ↓
VaultNameDialog opens (mode="rename", initialValue=prefilled)
  ↓
User enters name, clicks Save
  ↓
SidebarService.updateVaultName(vaultId, name)
  ↓
window.api.vault.updateVaultName (IPC)
  ↓
main.ts handler → vaultHandler.updateVaultName()
  ↓
multiVaultService.updateVaultName(vaultId, newName)
  ↓
Update vault-config.json
  ↓
window.location.reload() (UI refresh)
```

### Storage Format
**File:** `vault-config.json` (in app config directory)

```json
{
  "activeVaultId": "uuid-of-active-vault",
  "vaults": [
    {
      "id": "uuid",
      "name": "My Vault",
      "path": "/absolute/path/to/vault",
      "exists": true
    }
  ]
}
```

## Testing Strategy

### Unit Tests
- `MultiVaultService.updateVaultName()` - Update name, default fallback, non-existent vault
- `MultiVaultService.addVault()` - First vault active, second vault becomes active

### Integration Tests
- Full rename flow from UI through IPC to persistence
- Verify page reload after rename

### Manual Testing
1. Open vault dropdown
2. Hover over vault name → see [✏️] [🗑️] icons
3. Click ✏️ → dialog opens with current name prefilled
4. Change name, click Save → page reloads with new name
5. Open new vault → automatically becomes active

## Success Criteria
- ✅ Rename icon visible on hover for all vaults in dropdown
- ✅ Dialog opens with current name prefilled
- ✅ Save persists new name to config
- ✅ Page reloads after successful rename
- ✅ New vault automatically becomes active when opened
- ✅ Rename doesn't change which vault is active
- ✅ All tests pass

## Related Documentation
- See `/doc/vault.md` for complete vault architecture documentation
