# ScriptFlow Electron - Refactoring Plan

This plan is organized into sequential phases. Each phase is self-contained and delivers measurable improvements. Later phases build on earlier ones, but each phase produces a working, shippable codebase.

---

## Phase 1: Foundation & Type Safety

**Goal**: Eliminate type duplication, fix misplaced files, and establish a single source of truth for all shared types.

**Risk**: Low | **Impact**: High | **Estimated Scope**: ~15 files changed

### 1.1 Create shared type modules

- Create `src/shared/types/` directory
- Move all domain types into dedicated files:
  - `src/shared/types/script-entry.ts` - `ScriptEntry`, `ConditionConfig`, `ConditionType`, `OutputPassConfig`, `StaticEnvValue`, `MultiValueEnvVariable`, `EnvValue`
  - `src/shared/types/section.ts` - `Section`, `SubSection`, `ProjectConfig`
  - `src/shared/types/vault.ts` - `VaultMetadata`, `VaultsConfig`
  - `src/shared/types/execution.ts` - `ExecutionStatus`, `ExecutionStatusValue`, `ExecutionStatusEvent`, `ScriptExecutionStatusEvent`, `WorkflowExecutionStatusEvent`, `ConnectorExecutionStatusEvent`, `ScriptExecutionResult`, `WorkflowExecutionResult`
  - `src/shared/types/secrets.ts` - `SecretsData`, `SecretEntry`
  - `src/shared/types/logs.ts` - `LogLevel`, `LogEntry`
  - `src/shared/types/api.ts` - `IElectronAPI`, `VaultApi`, `DialogApi`, `ScriptApi`, `SecretsApi`, `LogsApi`, `FileApi`, `AppApi`, `ExternalApi`
  - `src/shared/types/index.ts` - barrel export

### 1.2 Update all imports

- Update `src/main/vault-handler.ts` to import from `src/shared/types/` (remove inline type definitions)
- Update `src/renderer.d.ts` to only contain the `Window.api` augmentation (re-export types from shared)
- Update all renderer services and components to import from `src/shared/types/`
- Update all test files to import from `src/shared/types/`

### 1.3 Relocate `ExecuteScriptService`

- Move `src/renderer/features/script-execution/services/execute-script-service.ts` to `src/main/services/execute-script-service.ts`
- Move `src/renderer/features/script-execution/services/execute-script-service.test.ts` to `src/main/services/execute-script-service.test.ts`
- Update import in `src/main/main.ts`

### 1.4 Replace `any` types in IPC layer

- Update `src/main/main.ts` IPC handlers to use proper types from `src/shared/types/`
- Update `src/preload/preload.ts` to use proper types from `src/shared/types/`

### 1.5 Verification

- [ ] All tests pass (`npm test`)
- [ ] TypeScript compiles without errors (`tsc -b`)
- [ ] App launches and basic workflows work (`npm run dev`)

---

## Phase 2: Decompose VaultHandler

**Goal**: Break the 928-line `VaultHandler` into focused, single-responsibility classes.

**Risk**: Medium | **Impact**: High | **Estimated Scope**: ~10 new files, ~5 files modified

### 2.1 Extract `VaultConfigService`

Extract from `VaultHandler`:
- `checkVaultConfig()`
- `getProjectConfigPath()`
- `readProjectConfig()`
- `writeProjectConfig()`
- `migrateOutputPassConfig()`
- `initializeVault()`
- `getConfigDirectory()`

New file: `src/main/services/vault-config-service.ts`

### 2.2 Extract `SectionRepository`

Extract from `VaultHandler`:
- `getSections()`
- `addSection()`
- `updateSection()`
- `deleteSection()`
- `duplicateSection()`

New file: `src/main/services/section-repository.ts`

### 2.3 Extract `SubSectionRepository`

Extract from `VaultHandler`:
- `addSubSection()`
- `updateSubSection()`
- `deleteSubSection()`
- `duplicateSubSection()`

New file: `src/main/services/sub-section-repository.ts`

### 2.4 Extract `ScriptRepository`

Extract from `VaultHandler`:
- `addScriptToSubSection()`
- `removeScriptFromSubSection()`
- `updateScriptInSubSection()`
- `duplicateScriptInSubSection()`

New file: `src/main/services/script-repository.ts`

### 2.5 Extract `ReorderService`

Extract from `VaultHandler`:
- `reorderSections()`
- `reorderWorkflows()`
- `moveWorkflow()`
- `reorderScripts()`
- `getSortedSubSections()`
- `getSortedScripts()`

New file: `src/main/services/reorder-service.ts`

### 2.6 Extract `ScriptFileService`

Extract from `VaultHandler`:
- `readScriptFile()`
- `writeScriptFile()`
- `resolveScriptPath()`
- `makeRelativePath()`

New file: `src/main/services/script-file-service.ts`

### 2.7 Refactor `VaultHandler` as Facade

- `VaultHandler` becomes a thin facade that delegates to the extracted services
- All existing IPC handlers and tests continue to work through the facade
- Existing tests remain green; new tests can target individual services

### 2.8 Verification

- [ ] All existing `vault-handler.test.ts` tests pass unchanged
- [ ] All existing `multi-vault-service.test.ts` tests pass unchanged
- [ ] App launches and all vault operations work

---

## Phase 3: Extract IPC Registration

**Goal**: Move all IPC handler registrations out of `main.ts` into dedicated IPC service classes, following the existing `ExternalLinkIpcService` pattern.

**Risk**: Low | **Impact**: Medium | **Estimated Scope**: ~6 new files, 1 file significantly reduced

### 3.1 Create IPC service classes

Following the existing `ExternalLinkIpcService` pattern:

- `src/main/ipc/vault-ipc-service.ts` - vault CRUD handlers (~20 handlers)
- `src/main/ipc/secrets-ipc-service.ts` - secrets get/save handlers
- `src/main/ipc/dialog-ipc-service.ts` - file dialog handlers
- `src/main/ipc/script-ipc-service.ts` - script execution handlers
- `src/main/ipc/logs-ipc-service.ts` - logging handlers
- `src/main/ipc/file-ipc-service.ts` - file read/write handlers

Each class has a static `register(ipcMain, ...dependencies)` method.

### 3.2 Simplify `main.ts`

- `main.ts` becomes a composition root: create services, call `XxxIpcService.register()`
- Target: reduce `main.ts` from ~304 lines to ~50 lines

### 3.3 Add tests for IPC service classes

- Each IPC service gets a test file verifying handler registration
- Follow the existing `external-link-ipc-service.test.ts` pattern

### 3.4 Verification

- [ ] All existing tests pass
- [ ] `main.ts` is under 60 lines
- [ ] Each IPC service has a corresponding test file

---

## Phase 4: Decompose God Components

**Goal**: Break `Sidebar.tsx` (993 lines), `ScriptEntry.tsx` (1083 lines), and `WorkflowPage.tsx` (522 lines) into focused sub-components and custom hooks.

**Risk**: Medium | **Impact**: High | **Estimated Scope**: ~20 new files

### 4.1 Decompose `Sidebar.tsx`

**Extract custom hooks:**
- `useSections()` - section loading, CRUD, state
- `useVaultManager()` - vault loading, switching, adding, removing
- `useSidebarDragAndDrop()` - DnD sensors, handlers, state

**Extract sub-components:**
- `SectionItem.tsx` - single section with expand/collapse, rename, context menu
- `WorkflowItem.tsx` - single workflow item with rename, context menu
- `SectionList.tsx` - renders section items with DnD context
- `SidebarActions.tsx` - secrets, logs, settings buttons at bottom
- `AddSectionForm.tsx` - inline section creation form
- `AddWorkflowForm.tsx` - inline workflow creation form

**Result:** `Sidebar.tsx` becomes a ~100-line layout component that composes the sub-components.

### 4.2 Decompose `ScriptEntry.tsx`

**Extract custom hook:**
- `useScriptEntry(script, onUpdate)` - consolidates all the `useState` calls and handlers

**Extract sub-components:**
- `ScriptNameEditor.tsx` - inline name editing with save/cancel
- `ScriptConfigMenu.tsx` - the popover command menu (Add Variable, Add Secret, Delete, etc.)
- `ScriptEnvSection.tsx` - env variable display, inline editing, multi-value dropdowns/radios
- `ScriptSecretsSection.tsx` - secret tags display and management
- `ScriptPathSection.tsx` - file path display, type selector, file picker
- `ScriptOutputPanel.tsx` - expandable output display
- `ScriptActions.tsx` - run/stop/duplicate buttons

**Result:** `ScriptEntryComponent` becomes a ~150-line layout component.

### 4.3 Decompose `WorkflowPage.tsx`

**Extract custom hooks:**
- `useWorkflowExecution(scripts)` - execution state, status events, run/stop handlers
- `useWorkflowScripts(sectionId, subSectionKey)` - script loading, CRUD, DnD
- `useFileDrop(sectionId, subSectionKey)` - file drag-and-drop handlers

**Extract sub-components:**
- `WorkflowHeader.tsx` - title, feedback trigger, add script button
- `WorkflowScriptList.tsx` - DnD context + sorted script list
- `WorkflowStatusBar.tsx` - the colored status bar at the top
- `WorkflowRunControls.tsx` - run all / stop buttons
- `WorkflowDropZone.tsx` - file drag-and-drop overlay

**Result:** `WorkflowPage` becomes a ~100-line composition component.

### 4.4 Verification

- [ ] All existing component tests pass
- [ ] App launches and all interactions work
- [ ] No visual regressions in the UI

---

## Phase 5: Test Coverage Expansion

**Goal**: Cover the testing gaps identified in the review, especially for the largest components and untested critical paths.

**Risk**: Low | **Impact**: Medium | **Estimated Scope**: ~10 new test files

### 5.1 Add missing `VaultHandler` operation tests

- Test `reorderSections()` - move first to last, last to first, out-of-bounds
- Test `reorderWorkflows()` - within section, boundary cases
- Test `moveWorkflow()` - between sections, same section, invalid IDs
- Test `reorderScripts()` - within workflow, boundary cases
- Test `readScriptFile()` - success, file not found, permission denied
- Test `writeScriptFile()` - success, permission denied
- Test `migrateOutputPassConfig()` - legacy data, already migrated data, mixed data

### 5.2 Add component tests for decomposed components

After Phase 4, test the newly extracted components:
- `SectionItem.test.tsx` - rename, delete, expand/collapse
- `WorkflowItem.test.tsx` - select, rename, delete
- `ScriptNameEditor.test.tsx` - edit, save, cancel, keyboard shortcuts
- `WorkflowHeader.test.tsx` - add script button, feedback trigger
- `WorkflowScriptList.test.tsx` - render scripts, DnD interactions

### 5.3 Add `LogService` tests

- Test console override behavior
- Test log rotation (maxLogs limit)
- Test `addRendererLog()`
- Test `formatLogEntry()` and `getAllLogsAsString()`
- Test `clearLogs()`

### 5.4 Configure test coverage reporting

- Add coverage configuration to `jest.config.js`
- Set minimum coverage thresholds (e.g., 70% statements, 60% branches)
- Add `npm run test:coverage` script to `package.json`

### 5.5 Verification

- [ ] All tests pass
- [ ] Coverage report generates successfully
- [ ] Coverage meets defined thresholds

---

## Phase 6: Polish & Developer Experience

**Goal**: Address remaining minor issues, improve developer experience, and clean up project hygiene.

**Risk**: Low | **Impact**: Low-Medium | **Estimated Scope**: ~10 files changed

### 6.1 Clean up project files

- Add `._*` (macOS resource forks) to `.gitignore`
- Ensure `dist/` and `dist-electron/` are in `.gitignore`
- Remove `next-themes` dependency (unused)

### 6.2 Standardize error handling

- Define a `Result<T>` type in `src/shared/types/result.ts`:
  ```typescript
  type Result<T> = { success: true; data: T } | { success: false; error: string }
  ```
- Apply to new repository/service methods going forward
- Gradually migrate existing return types (non-breaking, additive)

### 6.3 Replace `window.location.reload()` anti-pattern

- Replace vault-switching reload in `Sidebar.tsx` with proper state reset
- Use a callback or context-based invalidation to re-fetch sections and vault config
- Preserves sidebar scroll position and expansion state

### 6.4 Use theme tokens in `ToasterService`

- Replace hardcoded hex colors with Tailwind CSS theme classes
- Ensures toast styling is consistent with the rest of the app

### 6.5 Create `AGENTS.md`

- Document build commands: `npm run dev`, `npm run build`, `npm test`
- Document project conventions: feature-based structure, service extraction pattern
- Document testing conventions: real filesystem for persistence tests, mocks for Electron APIs

### 6.6 Verification

- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run build` succeeds
- [ ] App launches and works correctly

---

## Phase Summary

| Phase | Goal | Risk | Impact | Dependencies |
|---|---|---|---|---|
| **1** | Type safety & file organization | Low | High | None |
| **2** | Decompose VaultHandler | Medium | High | Phase 1 |
| **3** | Extract IPC registration | Low | Medium | Phase 2 |
| **4** | Decompose God components | Medium | High | Phase 1 |
| **5** | Test coverage expansion | Low | Medium | Phases 2, 4 |
| **6** | Polish & DX | Low | Low-Medium | Any phase |

**Recommended execution order**: Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6

Phases 2 and 4 can technically run in parallel (backend vs frontend decomposition), but running them sequentially reduces merge conflict risk. Phase 6 can be interleaved at any point.
