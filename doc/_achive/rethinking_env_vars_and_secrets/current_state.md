# Current State: Secrets and Environment Variables Implementation

## Overview

This document analyzes how secrets and environment variables are currently implemented for ScriptEntries in Scriptflow. This analysis serves as the foundation for refactoring these features.

---

## 1. Data Structures

### 1.1 ScriptEntry Interface

**File:** `scriptflow-electron/src/renderer.d.ts` (lines 12-22)

```typescript
export interface ScriptEntry {
    id: string
    name?: string
    type: 'bash' | 'csharp' | 'python' | 'powershell' | 'custom'
    path: string
    customCommand?: string
    env?: Record<string, string>      // Environment variables (key-value pairs)
    secrets?: string[]                 // Array of secret names (references to vault secrets)
    successCondition?: ConditionConfig
    placement: number
}
```

**Key Properties:**
- `env?: Record<string, string>` - Stores environment variables directly on the ScriptEntry
- `secrets?: string[]` - Stores references (names) to secrets defined in the vault's secrets store

### 1.2 Secrets Data Structure

**File:** `scriptflow-electron/src/main/secrets-handler.ts`

Secrets are stored in a separate JSON file per vault:
- **File naming pattern:** `{vaultId}.secrets.json`
- **Location:** User data config directory (`app.getPath('userData')/config/`)
- **Data structure:**

```typescript
export interface SecretsData {
    version: string
    secrets: Record<string, {
        value: string
        encrypted: boolean  // Currently unused - always false
    }>
}
```

**Example secrets file:**
```json
{
    "version": "1.0.0",
    "secrets": {
        "API_KEY": { "value": "secret-123", "encrypted": false },
        "DB_PASS": { "value": "password", "encrypted": false }
    }
}
```

---

## 2. Storage Architecture

### 2.1 Environment Variables

| Aspect | Details |
|--------|---------|
| **Storage location** | `.scriptflow.json` (project config within each vault) |
| **Scope** | Per-script (each ScriptEntry has its own env vars) |
| **Data format** | Key-value pairs (`Record<string, string>`) |
| **Persistence** | Stored directly on ScriptEntry, saved with project config |

### 2.2 Secrets

| Aspect | Details |
|--------|---------|
| **Storage location** | `{vaultId}.secrets.json` (separate file per vault) |
| **Scope** | Per-vault (shared across all scripts in a vault) |
| **Data format** | Object with name as key, value + encrypted flag as value |
| **Persistence** | Separate file, referenced by name in ScriptEntry |
| **Encryption** | **NOT IMPLEMENTED** - encrypted flag exists but is always false |

### 2.3 Comparison Table

| Feature | Environment Variables | Secrets |
|---------|----------------------|---------|
| Storage | Project config (`.scriptflow.json`) | Separate file (`{vaultId}.secrets.json`) |
| Scope | Script-specific | Vault-wide (shared) |
| Data | Key-value pairs | Key-value + metadata |
| Copy behavior | Value copied (independent) | Reference copied (shared) |
| Security | Plaintext | Plaintext (encryption stub) |
| Access | Direct on ScriptEntry | Referenced by name array |

---

## 3. Service Layer

### 3.1 Main Process (Node.js/Electron)

#### SecretsHandler
**File:** `scriptflow-electron/src/main/secrets-handler.ts`

```typescript
export class SecretsHandler {
    async getSecrets(vaultId: string): Promise<SecretsData>
    async saveSecrets(vaultId: string, data: SecretsData): Promise<void>
    async deleteSecrets(vaultId: string): Promise<boolean>
    async secretsFileExists(vaultId: string): Promise<boolean>
}
```

**Responsibilities:**
- Read/write secrets files per vault
- Handle file system operations
- No encryption/decryption logic (stub)

### 3.2 Renderer Process (React)

#### SecretsService
**File:** `scriptflow-electron/src/renderer/features/secrets/services/secrets-service.ts`

```typescript
export class SecretsService {
    static async getSecrets(): Promise<SecretsData>
    static async saveSecrets(secrets: SecretsData): Promise<void>
}
```

**Responsibilities:**
- IPC wrapper for main process secrets operations
- Gets active vault from MultiVaultService automatically

#### EnvSecretEditorService
**File:** `scriptflow-electron/src/renderer/features/script-execution/services/env-secret-editor-service.ts`

State management for env var editing:
```typescript
export interface EnvEditState {
    editingEnvKey: string | null   // null when adding new, set when editing existing
    newEnvKey: string
    newEnvValue: string
}
```

**Key Methods:**
- `saveEnv()` - Add new env var to script
- `updateEnv()` - Update existing env var value
- `removeEnv()` - Remove env var from script
- `addSecret()` - Add secret reference to script
- `removeSecret()` - Remove secret reference from script

#### ExecuteScriptService
**File:** `scriptflow-electron/src/renderer/features/script-execution/services/execute-script-service.ts`

The `resolveEnvironment()` method (lines 325-350) builds the environment for script execution:

```typescript
private async resolveEnvironment(script: ScriptEntry): Promise<NodeJS.ProcessEnv> {
    const env: NodeJS.ProcessEnv = {
        ...process.env,           // 1. System environment variables
        ...script.env,            // 2. Script-specific env vars (from ScriptEntry)
        ...this.dynamicEnvVars    // 3. Dynamic env vars from condition results
    }

    if (script.secrets && script.secrets.length > 0) {
        // 4. Resolve secrets from vault secrets store
        const config = await this.multiVaultService.getVaultsConfig()
        if (config.activeVaultId) {
            const vaultSecrets = await this.secretsHandler.getSecrets(config.activeVaultId)
            for (const secretKey of script.secrets) {
                const secret = vaultSecrets.secrets[secretKey]
                if (secret) {
                    env[secretKey] = secret.value  // Inject as env var
                }
            }
        }
    }

    return env
}
```

**Environment Resolution Priority (later overrides earlier):**
1. System `process.env`
2. Script-specific `script.env`
3. Dynamic env vars from workflow conditions
4. Secrets (injected as env vars with secret name as key)

#### CopyScriptService
**File:** `scriptflow-electron/src/renderer/features/script-execution/services/copy-script-service.ts`

Handles copying env vars and secrets between scripts in the same workflow:
- Environment variables: Value is copied (creates independent copy)
- Secrets: Reference is copied (shares the same secret)
- Conflict detection: Shows overwrite dialog if target already has the env var/secret

---

## 4. UI Components

### 4.1 SecretsDialog
**File:** `scriptflow-electron/src/renderer/features/secrets/components/SecretsDialog.tsx`

**Purpose:** Dialog for managing vault-wide secrets

**Features:**
- Add new secrets (name + value)
- Edit existing secrets
- Delete secrets
- Show/hide secret values with eye icon toggle
- List all secrets in a table format

**Limitations:**
- No encryption in UI (reflects storage state)
- No secret categories or organization
- No usage tracking (can't see which scripts use which secrets)

### 4.2 ScriptEntry Component
**File:** `scriptflow-electron/src/renderer/features/script-execution/components/ScriptEntry.tsx`

**Environment Variables UI (lines 465-520):**
- Display as badge chips with key=value pairs
- Edit button (pencil icon) to modify existing env vars
- Delete button (X icon) to remove env vars
- Copy button to copy env vars to other scripts in the same workflow
- "Add Environment Variable" menu option in the MoreVertical dropdown

**Secrets UI:**
- Display as badge chips with secret names
- Visual distinction from env vars (different styling)
- Remove button to detach secret from script
- "Add Secret" menu option to attach existing vault secrets

**Editing Flow:**
1. Click "Add Environment Variable" or edit icon
2. Dialog opens with key/value inputs
3. Save updates ScriptEntry.env
4. Changes persist to .scriptflow.json

---

## 5. IPC Communication

### 5.1 Preload Script
**File:** `scriptflow-electron/src/preload/preload.ts`

```typescript
secrets: {
    get: () => ipcRenderer.invoke('secrets:get'),
    save: (data: any) => ipcRenderer.invoke('secrets:save', data)
}
```

### 5.2 Main Process Handlers
**File:** `scriptflow-electron/src/main/main.ts` (lines 188-202)

```typescript
ipcMain.handle('secrets:get', async () => {
    const config = await multiVaultService.getVaultsConfig()
    if (!config.activeVaultId) {
        return { version: '1.0.0', secrets: {} }
    }
    return await secretsHandler.getSecrets(config.activeVaultId)
})

ipcMain.handle('secrets:save', async (_, data: any) => {
    const config = await multiVaultService.getVaultsConfig()
    if (!config.activeVaultId) {
        throw new Error('No vault configured')
    }
    return await secretsHandler.saveSecrets(config.activeVaultId, data)
})
```

---

## 6. Schemas

### 6.1 Secrets Schema
**File:** `schemas/secrets.schema.json`

Defines:
- `version`: Schema version string
- `secrets`: Object with secret names as keys
- Each secret has `value` (string) and `encrypted` (boolean)

### 6.2 ScriptFlow Schema
**File:** `schemas/scriptflow.schema.json`

Defines ScriptEntry structure including:
- `env`: Object with string keys and string values
- `secrets`: Array of strings (secret names)

---

## 7. Execution Flow

### 7.1 Script Execution with Env Vars and Secrets

1. **User triggers script execution**
2. **ExecuteScriptService.resolveEnvironment()** is called
3. **Build environment object:**
   - Start with system process.env
   - Overlay script.env (ScriptEntry-specific vars)
   - Overlay dynamicEnvVars (from previous condition results)
   - Fetch vault secrets and overlay referenced secrets as env vars
4. **Execute script** with merged environment using Node.js spawn
5. **Output** is displayed in UI

### 7.2 Dynamic Environment Variables

**Source:** `ConditionConfig` interface supports `setEnvVar` and `envVarName`:

```typescript
export interface ConditionConfig {
    type: 'exitCode' | 'outputRegex'
    expectedValue?: string | number
    pattern?: string
    setEnvVar?: boolean
    envVarName?: string
}
```

**Behavior:**
- When a condition is met (e.g., regex matches output), the matched value is stored
- If `setEnvVar` is true, the value is set as an environment variable
- Variable name is determined by `envVarName`
- These dynamic vars are passed to the NEXT script in the workflow only
- Stored in `ExecuteScriptService.dynamicEnvVars`

---

## 8. Current Limitations and Issues

### 8.1 Critical Issues

#### A. Encryption is NOT Implemented
- The `encrypted` boolean field exists in the schema and data structure
- Secrets are always stored in **plaintext**
- No encryption/decryption logic exists anywhere in the codebase
- Security risk: secrets visible in file system

#### B. VariablesUiService is a Stub
**File:** `scriptflow-electron/src/renderer/features/script-execution/services/variables-ui-service.ts`

```typescript
export class VariablesUiService {
    static async addEnvironmentalUi(): Promise<void> {
        console.log('addEnvironmentalUi triggered')
        // Implementation would go here
    }

    static async addSecretUi(): Promise<void> {
        console.log('addSecretUi triggered')
        // Implementation would go here
    }
}
```

- Service exists but is never used
- UI logic is directly embedded in ScriptEntry component
- Violates separation of concerns

### 8.2 Architectural Limitations

#### C. No Secret Inheritance or Scoping
- Secrets are vault-scoped only
- No project-level or workflow-level secrets
- No private secrets per script
- All scripts in vault can access any secret by name

#### D. No Environment Variable Inheritance
- Each ScriptEntry has completely independent env vars
- No workflow-level env vars
- No vault-level env vars
- Must copy explicitly between scripts

#### E. Limited Secret Metadata
- Only name, value, and encrypted flag
- No description field
- No categorization/grouping
- No creation/update timestamps
- No usage tracking

#### F. No Secret Validation
- No validation for secret name format
- No check for duplicate names (overwrites silently)
- No validation that referenced secrets exist

### 8.3 UX Limitations

#### G. No Secret Usage Visibility
- Can't see which scripts use which secrets
- No "unused secrets" detection
- Deleting a secret breaks scripts with no warning

#### H. Bulk Operations Missing
- Can't bulk edit env vars
- Can't bulk add secrets to scripts
- No import/export functionality

#### I. Limited Copy Functionality
- Can only copy within same workflow
- No cross-workflow copying
- No copy across vaults

### 8.4 Data Integrity Issues

#### J. Orphaned Secret References
- If a secret is deleted, scripts still reference it
- No warning or cleanup mechanism
- Scripts fail at runtime with undefined values

#### K. No Versioning
- No history of env var changes
- No secret versioning
- Can't rollback changes

---

## 9. Test Coverage

### 9.1 Existing Tests

Comprehensive test coverage exists:

1. **Secrets Handler:** `scriptflow-electron/src/main/secrets-handler.test.ts`
   - 14 test cases covering get, save, delete, file existence, vault isolation

2. **Env-Secret Editor Service:** `scriptflow-electron/src/renderer/features/script-execution/services/env-secret-editor-service.test.ts`
   - 37 test cases covering all CRUD operations for env vars and secrets

3. **Script Entry Component:** `scriptflow-electron/src/renderer/features/script-execution/components/ScriptEntry.test.tsx`
   - 20+ test cases covering copy functionality, keyboard handling, empty value rendering

4. **Execute Script Service:** `scriptflow-electron/src/renderer/features/script-execution/services/execute-script-service.test.ts`
   - Tests for env var passing, secret injection, condition checking

5. **Variables UI Service:** `scriptflow-electron/src/renderer/features/script-execution/services/variables-ui-service.test.ts`
   - Minimal tests for stub implementation

### 9.2 Test Gaps

- No tests for encryption (since it's not implemented)
- No integration tests for secret deletion affecting scripts
- No tests for cross-workflow scenarios
- No tests for dynamic env vars from conditions

---

## 10. File Inventory

### 10.1 Core Implementation Files

| File | Purpose | Lines |
|------|---------|-------|
| `schemas/secrets.schema.json` | JSON schema for secrets file | ~30 |
| `schemas/scriptflow.schema.json` | JSON schema for project config | ~150 |
| `scriptflow-electron/src/renderer.d.ts` | TypeScript type definitions | ~80 |
| `scriptflow-electron/src/main/secrets-handler.ts` | Main process: Read/write secrets files | ~120 |
| `scriptflow-electron/src/renderer/features/secrets/services/secrets-service.ts` | Renderer: IPC wrapper for secrets | ~30 |
| `scriptflow-electron/src/renderer/features/secrets/components/SecretsDialog.tsx` | UI: Manage vault secrets | ~280 |
| `scriptflow-electron/src/renderer/features/script-execution/services/env-secret-editor-service.ts` | Business logic: Edit env vars/secrets | ~200 |
| `scriptflow-electron/src/renderer/features/script-execution/services/execute-script-service.ts` | Execution: Resolve and inject env vars/secrets | ~400 |
| `scriptflow-electron/src/renderer/features/script-execution/components/ScriptEntry.tsx` | UI: Display and edit env vars/secrets per script | ~800 |
| `scriptflow-electron/src/renderer/features/script-execution/services/copy-script-service.ts` | Business logic: Copy env vars/secrets | ~150 |
| `scriptflow-electron/src/preload/preload.ts` | Preload: IPC bridge | ~50 |
| `scriptflow-electron/src/main/main.ts` | Main: IPC handlers | ~300 |

### 10.2 Test Files

| File | Purpose | Test Cases |
|------|---------|------------|
| `scriptflow-electron/src/main/secrets-handler.test.ts` | Secrets handler unit tests | 14 |
| `scriptflow-electron/src/renderer/features/script-execution/services/env-secret-editor-service.test.ts` | Env/secret editor unit tests | 37 |
| `scriptflow-electron/src/renderer/features/script-execution/components/ScriptEntry.test.tsx` | Script entry component tests | 20+ |
| `scriptflow-electron/src/renderer/features/script-execution/services/execute-script-service.test.ts` | Execute service tests | ~15 |
| `scriptflow-electron/src/renderer/features/script-execution/services/variables-ui-service.test.ts` | Variables UI service tests | 3 |

---

## 11. Recommendations for Refactoring

### 11.1 High Priority

1. **Implement Encryption**
   - Add encryption at rest for secrets
   - Use Electron's safeStorage API or similar
   - Maintain backward compatibility for migration

2. **Unify Env Vars and Secrets**
   - Consider treating secrets as a special type of env var
   - Single interface for adding/removing variables
   - Visual distinction in UI but unified logic

3. **Fix VariablesUiService**
   - Either implement or remove the stub service
   - Extract UI logic from ScriptEntry component
   - Improve separation of concerns

### 11.2 Medium Priority

4. **Add Secret Metadata**
   - Description field
   - Creation/update timestamps
   - Usage tracking (which scripts reference each secret)

5. **Add Scoping Levels**
   - Vault-level env vars (applies to all scripts in vault)
   - Workflow-level env vars (applies to all scripts in workflow)
   - Script-level env vars (current behavior)

6. **Validation and Safety**
   - Validate secret names
   - Warn when deleting secrets that are in use
   - Validate referenced secrets exist before execution

### 11.3 Low Priority

7. **Enhanced Copy/Move**
   - Cross-workflow copying
   - Bulk operations
   - Import/export functionality

8. **Versioning**
   - History of changes
   - Rollback capability

---

## 12. Summary

The current implementation separates environment variables and secrets into two distinct systems:

- **Environment Variables:** Stored directly on ScriptEntry in project config, plaintext, script-scoped
- **Secrets:** Stored in separate file per vault, plaintext (encryption stub), vault-scoped, referenced by name

**Key architectural decision to make:** Should secrets and env vars remain separate systems, or should they be unified with secrets being a "special type" of environment variable with additional security properties?

**Current pain points:**
1. No encryption (security risk)
2. No inheritance (duplication required)
3. No usage tracking (orphaned references possible)
4. UI logic mixed with business logic
5. Limited metadata and organization

This analysis provides the foundation for designing a refactored system that addresses these limitations while maintaining backward compatibility.
