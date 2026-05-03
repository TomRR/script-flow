# Multi-File Script Support - Future Enhancements

## Overview

This document outlines potential enhancements to the multi-file script addition feature implemented in Phase 1. These are unrefined ideas that may be considered for future development but are not currently planned or prioritized.

## Shebang Detection for Script Type

### Description
Improve script type detection by reading shebang lines (`#!/bin/bash`, `#!/usr/bin/env python3`, etc.) from script files instead of relying solely on file extensions.

### Implementation Considerations
- Requires file I/O to read shebang lines before adding scripts
- Should use shebang as primary detection, extension as fallback
- Must handle binary vs text files appropriately
- Consider performance impact on bulk additions

### Edge Cases
- Windows batch files with `@echo off` instead of shebang
- Files with no shebang or extension (default to 'custom')
- Multi-line shebangs or unusual formats

## Confirmation Dialog for File Selection

### Description
Add a confirmation dialog showing all selected files before adding them to the workflow. This allows users to:
- Review file names before adding
- Remove individual files from the selection
- See estimated script types based on detection

### UI Mockup Ideas
- Modal dialog with file list
- Editable script names inline
- Visual indicators for detected types
- Checkboxes to include/exclude each file
- "Add All" vs "Add Selected" buttons

## Enhanced Drag-and-Drop UX

### Visual Improvements
- Animated drop zone with file icons
- Color-coded indicators for file types
- Real-time validation feedback during drag
- Progress indicator for bulk additions

### Functional Enhancements
- Drop directly onto specific position in script list
- Interleave dropped files with existing scripts
- Support for reordering via drag-and-drop after addition
- Preview of script configuration before drop

## Script Name Generation Options

### Description
Provide more control over how script names are generated from file paths.

### Potential Features
- Custom name patterns (filename only, full path, etc.)
- Regular expression-based name transformations
- Bulk edit dialog after addition
- Presets for common naming conventions

## Template System for Scripts

### Description
Create templates for different script types with pre-configured settings.

### Template Ideas
- **Bash Template**: Default environment, common shebangs
- **Python Template**: Virtualenv support, requirements files
- **PowerShell Template**: Execution policy settings
- **Custom Template**: User-defined defaults

### Implementation
- Template library with editable defaults
- Apply templates during script addition
- Template versioning and import/export

## Bulk Operations on Multiple Scripts

### Description
Allow batch modifications to multiple scripts at once.

### Potential Features
- Bulk edit environment variables
- Bulk edit secrets assignments
- Bulk type changes
- Bulk reorder operations
- Bulk delete with multi-select

## Script Health Checks

### Validation Features
- Verify script paths exist on disk
- Check file permissions (executable bit)
- Detect duplicate script paths in workflow
- Validate referenced secrets exist

### Feedback UI
- Warning indicators on problematic scripts
- Health score for workflow
- Quick-fix actions for common issues

## External Import Sources

### Description
Import scripts from sources other than local file system.

### Potential Sources
- Git repositories (clone and add scripts)
- URLs (download and cache locally)
- Other vaults (copy script configurations)
- Package managers (npm scripts, composer scripts)

## Undo/Redo Support

### Description
Track script additions for undo functionality.

### Implementation Ideas
- Single-level undo for script additions
- Bulk undo for batch additions
- History panel showing recent changes
- Keyboard shortcuts (Ctrl+Z / Cmd+Z)

## Performance Considerations

### For Bulk Operations
- Lazy loading of script details
- Background processing for type detection
- Debounced UI updates during additions
- Progress indicators for large batches

## Questions to Consider

1. **Shebang Detection Priority**: Should we prioritize shebang detection over extension? What are the performance implications?

2. **Confirmation UX**: Should the confirmation dialog be modal or non-modal? Should it be optional (opt-out)?

3. **Template Scope**: Should templates be per-vault or global? Should they be shareable between users?

4. **External Import Security**: How should we handle importing scripts from external URLs? Sandboxing requirements?

5. **Undo Scope**: Should undo track only script additions or all modifications? How much history should we keep?

## Related Files

- Phase 1 Implementation: `src/renderer/features/script-execution/services/script-type-detector-service.ts`
- Phase 1 Implementation: `src/renderer/features/script-execution/services/add-script-service.ts`
- UI Integration: `src/renderer/features/workflow/components/WorkflowPage.tsx`

## Dependencies

- Shebang detection: Requires Node.js `fs` module for file reading
- Template system: Requires persistence layer for template storage
- External import: Requires network stack and potentially git integration
