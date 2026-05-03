# Scriptflow Agent Guidelines

## Project Overview

Scriptflow is an Electron application with React and TypeScript for managing and executing scripts organized in a vault-based workflow system.

**Tech Stack:** Electron + Vite + React + TypeScript + Tailwind CSS + shadcn/ui + Jest

## Build Commands

All commands must be run from `./scriptflow-electron/`:

```bash
# Development
bun run dev              # Start dev server with hot reload

# Build
bun run build           # Full build: TypeScript + Vite + Electron Builder
bun run preview         # Preview production build

# Testing
bun run test            # Run all Jest tests (recommended - validates full test suite)
bun test <pattern>      # Run specific test file with Bun's test runner
bun run test --testNamePattern="should add a script"  # Run specific test

# Linting & Type Checking
bun run lint           # Run ESLint
bun run tsc -b         # Run TypeScript compiler to check for type errors

## Important
### you never need to look into the directoies:
./.git
./.vscode
./.idea
./node_modules
./dist
./build
./.DS_Store

### Must DO:
Always decouple the functionallity and move it into a separat service.
Always add meaningful tests for new code.

## Definition of Done

Before marking any task as complete, you MUST:

1. **Run type check** - Execute `bun run tsc -b` and confirm no TypeScript errors
2. **Run all tests** - Execute `bun run test` and confirm all tests pass
3. **Verify no regressions** - Ensure your changes don't break existing functionality
4. **Clean code** - Remove any temporary code, comments, or debugging statements

**Failure to run `bun run tsc -b` and `bun run test` and confirm passing results means the task is NOT complete.**

# Data Persistence

The application uses three different configuration files, each with its own JSON schema:

1. **Vault Configuration** (`vault-config.json`)
   - Stores multi-vault settings: active vault ID and list of vaults
   - Schema: `./schemas/vault-config.schema.json`
   - Updated when: adding/removing vaults, changing vault metadata structure

2. **Project Configuration** (`.scriptflow.json` in each vault)
   - Stores sections, workflows, and scripts
   - Schema: `./schemas/scriptflow.schema.json`
   - Updated when: changing section/workflow/script structure

3. **Secrets** (`{vaultId}.secrets.json`)
   - Stores vault-specific secrets
   - Schema: `./schemas/secrets.schema.json`
   - Updated when: changing secrets data structure

**Important:** When modifying any persisted data structure, you MUST update the corresponding JSON schema.


## Project Structure
scriptflow-electron/
├── src/
│   ├── main/                    # Electron main process (Node.js)
│   │   ├── main.ts             # Entry point, IPC handlers
│   │   └── vault-handler.ts    # Vault file operations
│   ├── preload/                 # Preload scripts (bridge)
│   │   └── preload.ts
│   ├── renderer/                # React frontend
│   │   ├── main.tsx            # React entry
│   │   ├── App.tsx             # Root component
│   │   ├── components/         # UI components (shadcn/ui)
│   │   ├── features/           # Feature modules
│   │   │   ├── sidebar/        # Navigation sidebar
│   │   │   ├── script-execution/  # Script runner
│   │   │   ├── workflow/       # Workflow management
│   │   │   └── secrets/        # Secrets management
│   │   └── lib/utils.ts        # Utility functions (cn helper)
│   └── renderer.d.ts           # TypeScript definitions for IPC
├── package.json
├── tsconfig.json               # TypeScript project references
├── tsconfig.app.json           # Renderer process config
├── tsconfig.node.json          # Main/preload config
├── vite.config.ts              # Vite + Electron plugin config
├── jest.config.js              # Jest test configuration
├── tailwind.config.js          # Tailwind CSS configuration
└── electron-builder.yml        # Electron packaging config
```

## Code Style Guidelines

### Imports

- Group imports: React, external libs, internal modules, types
- Use `@/` alias for renderer imports: `import { cn } from "@/lib/utils"`
- Use relative paths within same feature: `import { SidebarService } from '../services/sidebar-service'`
- Use `type` imports for types: `import type { Section } from './types'`

### Formatting

- Use 4 spaces for indentation
- Single quotes for strings
- Semicolons required
- No trailing commas in multi-line objects
- Maximum line length: follow existing patterns (typically 100-120 chars)

### Naming Conventions

- Components: PascalCase (e.g., `Sidebar`, `ScriptEntry`)
- Hooks: camelCase starting with `use` (e.g., `useState`)
- Services: PascalCase with `Service` suffix (e.g., `SidebarService`)
- Functions/variables: camelCase (e.g., `getSections`, `isLoading`)
- Types/Interfaces: PascalCase (e.g., `ScriptEntry`, `Section`)
- File names: kebab-case for non-components (e.g., `sidebar-service.ts`)
- Test files: `<name>.test.ts` alongside source files

### TypeScript

- Strict mode enabled
- Explicit return types on public methods
- Use `interface` for object shapes, `type` for unions/aliases
- Prefer `const` assertions for literal types
- Avoid `any` - use `unknown` with type guards

### React Components

- Use functional components with hooks
- Props interfaces named `<ComponentName>Props`
- Forward refs properly with `React.forwardRef`
- Use `displayName` for debugging

Example:
```tsx
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, asChild = false, ...props }, ref) => {
        // implementation
    }
)
Button.displayName = "Button"
```

### Tailwind CSS

- Use `cn()` utility for conditional classes
- Follow shadcn/ui patterns for UI components
- Use theme variables: `bg-background`, `text-foreground`
- Prefer semantic class names over arbitrary values

### Error Handling

- Use try/catch for async operations
- Log errors to console with context: `console.error("Failed to check config:", error)`
- Return null/undefined for failures in service methods
- Use type guards for error checking

### Testing

- Co-locate tests next to source files (e.g., `sidebar-service.test.ts`)
- Use Jest with ts-jest preset and @happy-dom/jest-environment
- Mock Electron APIs and window objects
- Follow arrange-act-assert pattern

Example test structure:
```ts
import { SidebarService } from './sidebar-service'

describe('SidebarService', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    test('getSections calls vault.getSections', async () => {
        // Arrange
        const mockSections = [{ id: '1', title: 'Test' }]
        mockVault.getSections.mockResolvedValue(mockSections)

        // Act
        const result = await SidebarService.getSections()

        // Assert
        expect(mockVault.getSections).toHaveBeenCalled()
        expect(result).toEqual(mockSections)
    })
})
```

### IPC Communication

- Define API interfaces in `renderer.d.ts`
- Use channel naming: `vault:action`, `script:action`
- Always type IPC handlers with proper argument types
- Access via `window.api.<namespace>.<method>()`

### State Management

- Use React hooks (useState, useEffect) for local state
- Services are static classes that wrap IPC calls
- No external state management library (Redux/Zustand)

### File Organization

- Features follow folder-by-feature pattern
- Each feature has: `components/`, `services/`, `*.test.ts`
- Shared UI components in `components/ui/` (shadcn/ui)
- Utility functions in `lib/utils.ts`

## Documentation

- **Vault System Architecture**: `./doc/vault.md` - Complete documentation of vault operations, data structures, and IPC communication
- **Task Records**: `./tasks/` - User stories and implementation plans for completed features
