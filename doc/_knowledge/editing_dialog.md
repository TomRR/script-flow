# Edit Script Dialog

The Edit Script Dialog provides an in-app text editor for viewing and editing script files directly within ScriptFlow, eliminating the need to open external IDEs for quick modifications.

## Overview

The edit dialog allows users to:
- View script file contents in a monospace text editor
- Make quick edits and fixes without leaving the application
- Save changes directly to the file system
- Discard changes if needed

## Accessing the Editor

### Entry Point
The edit functionality is accessible from the script entry row in the main interface:

```
[Play/Stop] [File Path Display] [Edit Button] [Select Script Button]
```

**Location**: The edit button (pencil icon) appears between the file path display and the "Select Script" button.

**Visibility**: 
- Enabled when a script file path is configured
- Disabled (grayed out) when no file path is set

### Opening the Editor
Click the edit button (pencil icon) to open the editor dialog. The dialog will:
1. Load the file content from disk
2. Display it in a monospace text area
3. Show the current edit status

## User Interface

### Dialog Layout

```
+----------------------------------------------------------+
|  Edit: filename.sh                                  [×]  |
|----------------------------------------------------------|
|  Edit the script file content directly. Use Ctrl+S       |
|  (Cmd+S on Mac) to save.                                 |
|----------------------------------------------------------|
|                                                          |
|  +----------------------------------------------------+  |
|  | #!/bin/bash                                        |  |
|  |                                                    |  |
|  | echo "Hello World"                                 |  |
|  |                                                    |  |
|  +----------------------------------------------------+  |
|                                                          |
|----------------------------------------------------------|
|  ● All changes saved                          [Cancel]   |
|                                               [  Save  ] |
+----------------------------------------------------------+
```

### Components

#### Header
- **Title**: Shows "Edit: {filename}"
- **Close Button**: X icon in the top-right corner

#### Editor Area
- **Monospace Font**: Fira Code, Roboto Mono, or system monospace
- **Background**: Light gray (#F5F7FA) or white
- **Line Numbers**: Not displayed (plain text editor)
- **Scroll**: Vertical scrollbar enabled
- **Syntax Highlighting**: Not supported (plain text)

#### Status Indicator
Located in the footer, shows current edit state:
- **Green Dot (●)**: "All changes saved" - no pending changes
- **Red Dot (●)**: "Unsaved changes" - modifications pending save

#### Action Buttons
- **Cancel**: Closes the dialog (with confirmation if unsaved changes exist)
- **Save**: Saves changes to disk and closes the dialog (disabled when no changes)

## Keyboard Shortcuts

| Shortcut | Action | Behavior |
|----------|--------|----------|
| `Ctrl+S` / `Cmd+S` | Save | Saves file, shows toast notification, **stays open** |
| `Esc` | Close | Closes dialog immediately (**no confirmation**, discards changes) |

### Notes on Keyboard Shortcuts

**Ctrl+S / Cmd+S**:
- Only works when there are unsaved changes
- Displays a success toast: "File saved"
- Dialog remains open for continued editing
- Useful for frequent saves during editing sessions

**Esc**:
- Closes the dialog immediately
- Does **not** show discard confirmation dialog
- Changes are discarded if not saved
- This is the default dialog behavior for consistency

## Workflow & Behavior

### Standard Edit Workflow

1. **Open Editor**
   - Click edit button on script entry
   - Dialog opens with file content loaded
   - Status shows "All changes saved" (green dot)

2. **Make Changes**
   - Type in the text area
   - Status changes to "Unsaved changes" (red dot)
   - Save button becomes enabled

3. **Save Changes**
   - **Option A**: Click Save button → Saves and closes dialog
   - **Option B**: Press Ctrl+S → Saves, shows toast, stays open

4. **Close Without Saving**
   - **Option A**: Press Esc → Closes immediately (discards changes)
   - **Option B**: Click Cancel with changes → Shows confirmation dialog

### Behavior Matrix

| Action | File State | Result |
|--------|------------|--------|
| Click **Save** button | Clean or Dirty | Saves file → Closes dialog |
| Click **Cancel** button | Clean | Closes dialog immediately |
| Click **Cancel** button | Dirty | Shows discard confirmation |
| Press **Ctrl+S** | Dirty | Saves → Toast → Stays open |
| Press **Esc** | Any | Closes immediately (no confirmation) |
| Click outside dialog | Any | Closes immediately (no confirmation) |

### Discard Changes Confirmation

When clicking Cancel with unsaved changes, a confirmation overlay appears:

```
+----------------------------------+
|  Discard changes?                |
|                                  |
|  You have unsaved changes. Are   |
|  you sure you want to discard    |
|  them?                           |
|                                  |
|  [Keep Editing] [Discard Changes]|
+----------------------------------+
```

**Options**:
- **Keep Editing**: Returns to editor, keeps unsaved changes
- **Discard Changes**: Closes dialog, discards all modifications

## State Management

### Editor States

The editor maintains the following state:

```typescript
interface ScriptFileEditorState {
    isOpen: boolean           // Dialog visibility
    filePath: string          // Path to the file being edited
    fileContent: string       // Current content in editor
    originalContent: string   // Content when dialog opened
    isLoading: boolean        // Loading state during file operations
    error: string | null      // Error message if file operation fails
    saveSuccess: boolean      // Flag for successful save
}
```

### Change Detection

Changes are detected by comparing `fileContent` with `originalContent`:

```typescript
const hasChanges = fileContent !== originalContent
```

This comparison:
- Updates in real-time as user types
- Determines Save button enabled/disabled state
- Controls the status indicator (red/green dot)
- Triggers discard confirmation when Cancel is clicked

## Error Handling

### File Read Errors

If the file cannot be read when opening the editor:

**Error Messages**:
- "File not found" - File doesn't exist at the specified path
- "Permission denied" - Insufficient permissions to read file
- "Failed to read file" - Generic read error

**Behavior**:
- Error message displayed in red alert box
- Text area shows placeholder text
- Editor remains open but empty

### File Write Errors

If the file cannot be saved:

**Error Messages**:
- "Permission denied" - Insufficient permissions to write file
- "Failed to write file" - Generic write error

**Behavior**:
- Error message displayed in red alert box
- Dialog remains open
- Changes are preserved for retry

## Edge Cases

### Empty File Path
- Edit button is disabled when no file path is configured
- Tooltip: "Edit script file"

### Non-existent File
- Opening editor shows "File not found" error
- User cannot edit a file that doesn't exist
- User should use "Select Script" button to choose an existing file

### Permission Issues
- Read permission denied: Shows error, cannot open editor
- Write permission denied: Shows error, save fails but dialog stays open

### Concurrent Editing
- ScriptFlow does not detect external file changes
- If file is modified externally while editor is open:
  - Editor continues with in-memory content
  - Saving will overwrite external changes
  - No merge or conflict detection

### Large Files
- No file size limits enforced
- Very large files may impact performance
- Virtual scrolling not implemented

## Technical Details

### IPC Communication

The editor uses the following IPC channels:

```typescript
// Reading file content
window.api.file.read(relativePath: string): Promise<{
    content: string | null
    error?: string
}>

// Writing file content
window.api.file.write(
    relativePath: string, 
    content: string
): Promise<{
    success: boolean
    error?: string
}>
```

### File Path Resolution

- Relative paths are resolved against the vault directory
- Absolute paths outside vault are stored as-is
- Path display shows relative path from vault root

### Styling

**Text Area**:
- Font: `font-mono` (Tailwind monospace)
- Padding: 16px (`p-4`)
- Background: `bg-muted/30` (muted color at 30% opacity)
- Min-height: 300px
- Max-height: 60vh of viewport
- No resize handle (`resize-none`)

**Status Dots**:
- Green: `bg-green-500` (16x16px rounded circle)
- Red: `bg-red-500` (16x16px rounded circle)

## Best Practices

### For Users

1. **Save Frequently**: Use Ctrl+S to save progress without closing the editor
2. **Check Status**: Watch the red/green dot to know if changes are saved
3. **ESC to Exit**: Use Esc for quick exit when you don't need to save
4. **Cancel for Safety**: Use Cancel button when you want confirmation before discarding

### For Developers

1. **State Updates**: Always use `ScriptFileEditorService` methods for state changes
2. **Error Handling**: Display user-friendly error messages from the service
3. **Keyboard Shortcuts**: Maintain consistency with documented shortcuts
4. **Change Detection**: Always compare against `originalContent`, not initial state

## Related Components

- **ScriptEntry.tsx**: Main component containing the edit button
- **ScriptFileEditorService.ts**: State management and IPC calls
- **ToasterService.ts**: Toast notifications for save success

## Future Enhancements

Potential improvements for the editor:

- Syntax highlighting for common script languages (bash, python, etc.)
- Line numbers in the editor
- Find and replace functionality
- Word wrap toggle
- Font size adjustment
- Auto-save option
- External change detection and reload prompt
- Split view for comparing changes
