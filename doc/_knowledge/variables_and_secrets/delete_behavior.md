# Variable and Secret Delete Behavior

## Overview

This document describes the confirmation behavior when deleting environment variables or secrets from a ScriptEntry component.

## Delete Confirmation Flow

### Direct Chip Deletion (Main Component)

When users delete a variable or secret directly from the ScriptEntry component (via the X button on the chip), a confirmation dialog is displayed.

#### Trigger
- User clicks the X (remove) button on an environment variable chip
- User clicks the X (remove) button on a secret chip

#### Confirmation Dialog

**For Environment Variables:**
- Title: `Delete variable?`
- Description: `Are you sure you want to delete "KEY_NAME"? This action cannot be undone.`

**For Secrets:**
- Title: `Delete secret?`
- Description: `Are you sure you want to delete "SECRET_NAME"? This action cannot be undone.`

#### Actions
| Action | Behavior |
|--------|----------|
| Cancel | Closes dialog, no deletion occurs |
| Delete | Permanently removes the item from the script configuration |

### Manage Variables Dialog Deletion

When deleting via the "Manage Variables" dialog (accessed from the menu), the same confirmation behavior applies.

#### Trigger
- User clicks the trash icon on a variable or secret row in the Manage Variables table

#### Confirmation Dialog
Same as direct chip deletion.

## User Experience

```typescript
// When user clicks X on a chip:
// 1. Dialog opens immediately
// 2. Focus is on the Cancel button (accessibility)
// 3. User can:
//    - Press Escape to cancel
//    - Click Cancel to close
//    - Click Delete or press Enter to confirm
```

## Implementation Details

### State Management

```typescript
const [showDeleteItemDialog, setShowDeleteItemDialog] = useState(false);
const [itemToDelete, setItemToDelete] = useState<{
  type: "env" | "secret";
  key: string;
} | null>(null);
```

### Handler Functions

| Function | Purpose |
|----------|---------|
| `handleRemoveEnvClick(key)` | Opens dialog for env var deletion |
| `handleRemoveSecretClick(secretName)` | Opens dialog for secret deletion |
| `handleConfirmItemDelete()` | Performs actual deletion after confirmation |
| `handleCancelItemDelete()` | Cancels and closes dialog |

### Dialog Component

Uses the existing `AlertDialog` component from shadcn/ui with:
- Red styled delete action button
- Cancel button as secondary action
- Dynamic content based on item type

## Related Files

- `src/renderer/features/script-execution/components/ScriptEntry.tsx` - Main component
- `src/renderer/features/script-execution/components/ManageVariablesDialog.tsx` - Manage variables dialog
- `src/renderer/features/script-execution/components/ScriptEntry.test.tsx` - Tests

## Accessibility Considerations

- Dialog uses proper ARIA attributes via shadcn/ui AlertDialog
- Keyboard navigation supported (Escape to cancel, Enter to confirm)
- Focus is managed automatically by the AlertDialog component
