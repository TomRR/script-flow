# ScriptFlow Electron - Codebase Review Findings

## Status Quo

**Overall Health: Good (7/10)**

ScriptFlow is a well-structured Electron + React + TypeScript application for workflow automation via script execution. The project demonstrates solid foundational architecture with a clear feature-based folder structure, comprehensive type safety through TypeScript strict mode, and an above-average testing culture. The codebase is early-stage (v0.0.0) but already exhibits deliberate engineering decisions: proper separation of main/preload/renderer processes, consistent service-oriented patterns, and meaningful test coverage across all layers.

The primary areas needing attention are the oversized monolithic components, duplicated type definitions, the tightly coupled IPC layer, and the absence of a state management solution as complexity grows.

---

## Architectural & Feedback

### Strengths

1. **Feature-Based Module Structure**: The `src/renderer/features/` organization (`feedback`, `logging`, `script-execution`, `secrets`, `sidebar`, `workflow`) is excellent. Each feature has its own `components/`, `services/`, and `hooks/` subdirectories. This is a scalable pattern that will serve the project well as it grows.

2. **Service Layer Extraction**: Business logic is consistently extracted into stateless service classes (e.g., `ConnectorService`, `AddScriptService`, `ScriptTypeDetectorService`, `CopyScriptService`, `EnvSecretEditorService`). These are pure-logic, highly testable units that don't depend on React or Electron. This is a strong pattern.

3. **Electron Security Posture**: The project correctly uses `contextIsolation: true` and `nodeIntegration: false` in the BrowserWindow config. The preload script uses `contextBridge.exposeInMainWorld` properly, which is the Electron security best practice.

4. **Constructor Injection in Main Process**: Services like `ExecuteScriptService`, `MultiVaultService`, and `VaultHandler` receive their dependencies through constructors, making them testable and composable.

5. **Data Migration Support**: The `VaultHandler.migrateOutputPassConfig()` and `MultiVaultService.migrateFromLegacy()` methods show forward-thinking about data evolution - important for a tool that persists user data.

### Issues & Observations

1. **Duplicated Type Definitions (Critical)**: Types like `ScriptEntry`, `ConditionConfig`, `SubSection`, `Section`, `ExecutionStatus`, etc. are defined **twice** - once in `src/main/vault-handler.ts` and again in `src/renderer.d.ts`. This is a synchronization hazard. When one changes, the other may not. The `src/shared/` directory already exists (with `app-runtime-info.ts`) but is underutilized.

2. **Monolithic `main.ts` IPC Registration (~240 lines of `ipcMain.handle`)**: The main process entry point registers ~35 IPC handlers inline. This is a maintenance burden and violates single-responsibility. Only `ExternalLinkIpcService` demonstrates the extracted pattern - the rest should follow this model.

3. **`VaultHandler` God Class (928 lines)**: This single class handles vault initialization, section CRUD, subsection CRUD, script CRUD, drag-and-drop reordering, path resolution, file read/write, config migration, and duplication. It needs decomposition.

4. **`Sidebar.tsx` God Component (~993 lines)**: This component manages sections, workflows, vault selection, vault CRUD, drag-and-drop, inline renaming, dialog state, and keyboard handling all in one file. It has ~20 `useState` calls.

5. **`ScriptEntry.tsx` God Component (~1083 lines)**: Similar issue - manages name editing, env vars, secrets, multi-value variables, file editing, copy operations, delete confirmations, output streaming, and overwrite dialogs. Over 15 `useState` calls.

6. **`WorkflowPage.tsx` (~522 lines)**: Also oversized with execution state management, drag-and-drop, file drag-and-drop, toast notification logic, and keyboard shortcuts all combined.

7. **Pervasive `any` Types in IPC Layer**: In `main.ts`, `preload.ts`, and the IPC handlers, `any` is used extensively (e.g., `script: any`, `data: any`, `scripts: any[]`). This undermines the type safety that TypeScript provides, especially at the boundary where type correctness matters most.

8. **`ExecuteScriptService` Location**: This service is located at `src/renderer/features/script-execution/services/` but it's imported and instantiated in the **main process** (`main.ts` line 13). It uses `execa` (a Node.js process spawner) which cannot run in the renderer. This is a confusing placement.

9. **`window.location.reload()` for State Changes**: When switching vaults (`handleSwitchVault`, `handleConfirmVaultName`), the app does a full page reload. This is a crude mechanism that loses all in-memory state.

10. **No Router**: Navigation between views is managed via `selectedPage` state prop-drilled from `App.tsx`. This works for the current scale but will become limiting.

---

## Testing Assessment

### Strengths

1. **Extensive Coverage**: The project has ~40+ test files covering all layers:
   - **Main process**: `vault-handler.test.ts`, `multi-vault-service.test.ts`, `secrets-handler.test.ts`, `app-icon-service.test.ts`, `app-info-service.test.ts`, `dev-app-launcher-service.test.ts`, `external-link-ipc-service.test.ts`
   - **Preload**: `preload.test.ts`
   - **Renderer services**: `connector-service.test.ts`, `execute-script-service.test.ts`, `add-script-service.test.ts`, `drag-and-drop-script-service.test.ts`, etc.
   - **Renderer components**: `ScriptEntry.test.tsx`, `ScriptConnector.test.tsx`, `FeedbackDropdown.test.tsx`
   - **Integration tests**: `script-entry-status-service.integration.test.ts`

2. **Real Filesystem Tests**: `VaultHandler` and `MultiVaultService` tests use real temporary directories (`fs.mkdtemp`) with proper cleanup (`afterEach`). This is more reliable than mocking `fs` for data-persistence logic.

3. **Edge Case Coverage**: The `ConnectorService` tests cover case sensitivity, empty strings, whitespace, special characters, multiline output, and real-world scenarios (JSON output, exit codes). This is exemplary test design.

4. **Behavioral Contract Tests**: The integration test for `ScriptEntryStatusService` validates CSS class contracts and color scheme consistency, which prevents visual regressions.

5. **Proper Mock Strategy**: `ExecuteScriptService` tests mock `execa` and service dependencies at the right granularity. `preload.test.ts` mocks Electron's `contextBridge` and `ipcRenderer` correctly.

### Gaps

1. **No Tests for the Largest Components**: `Sidebar.tsx` (993 lines), `WorkflowPage.tsx` (522 lines), and `App.tsx` have zero component tests. The most complex UI logic is untested.

2. **Missing `VaultHandler` Tests**: No tests for `reorderSections`, `reorderWorkflows`, `moveWorkflow`, `reorderScripts`, `readScriptFile`, `writeScriptFile`, or the `migrateOutputPassConfig` method. These are critical mutation operations.

3. **No E2E or Smoke Tests**: There are no Playwright, Spectron, or Electron-specific E2E tests. For a desktop app, at minimum a smoke test that opens the window would catch packaging regressions.

4. **Missing Test Infrastructure**: No coverage reporting configured, no CI configuration visible, no pre-commit hooks for test execution.

5. **`LogService` Untested**: The console-override mechanism in `LogService` has no tests, and its global mutation pattern (overriding `console.*`) is particularly risky to leave uncovered.

---

## Summary of Key Metrics

| Metric | Value |
|---|---|
| Source files (non-test, non-UI lib) | ~60 |
| Test files | ~40 |
| Largest file | `ScriptEntry.tsx` (1083 lines) |
| Second largest | `Sidebar.tsx` (993 lines) |
| Third largest | `VaultHandler.ts` (928 lines) |
| IPC channels registered | ~35 |
| `useState` calls in `Sidebar.tsx` | ~20 |
| `useState` calls in `ScriptEntry.tsx` | ~15 |
| Duplicated type definitions | ~12 types across 2 locations |
| `any` usages in IPC layer | ~15+ |
| Untested critical components | 3 (Sidebar, WorkflowPage, App) |
