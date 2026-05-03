---
RESTRICTED FILE: Agents should not access, read, or parse except the user explicitly says to
---

# Scriptflow — Project Description

Scriptflow is a desktop workflow automation application that helps developers and DevOps engineers organize, configure, and execute scripts in structured workflows.

What it does
- Vault-based workspace where you can organize scripts into sections and workflows
- Execute scripts individually or run entire workflows sequentially
- Configure environment variables and manage secrets securely
- Set success conditions between scripts to drive workflow flow
- Real-time execution output monitoring

Tech Stack
- Framework: Electron (v39) + React (v19) + TypeScript (v5.x)
- Build: Vite with vite-plugin-electron
- Styling: Tailwind CSS 3.x + shadcn/ui
- UI: Radix primitives, Lucide icons
- Script execution: execa
- Testing: Jest + ts-jest
- Package manager: npm

Architecture
Renderer (React) vs Main (Node)
- Renderer handles UI, navigation, script configuration, and real-time output
- Main handles vault management, script execution, secrets, and IPC
- IPC bridge via preload exposes window.api in renderer

Key Features/Modules
- Vault Management (.scriptflow.json, secrets.json)
- Workflow sequencing with conditional flow
- Multi-language script support: bash, python, csharp, powershell, custom
- Real-time streaming of script output
- Secrets and environment variable management
- Centralized logging

Data Flow (Main <-> Renderer)
- User actions in renderer trigger IPC calls to main (vault, script, secrets)
- Main performs actions (read/write vault files, spawn scripts with execa)
- Script output streams back to renderer via IPC events
- Preload/contextBridge exposes typed API as window.api

Directory Highlights
/src/main — Electron main process (vault handling, IPC)
/src/preload — context bridge API
/src/renderer — React frontend
/src/renderer/features/sidebar — navigation UI
/src/renderer/features/script-execution — script runner and connectors
/src/renderer/features/workflow — workflow editor/list
/src/renderer/features/secrets — secrets manager
/src/renderer/lib — utilities (cn)

Run/Build Instructions
- Development: npm run dev
- Build: npm run build
- Preview: npm run preview
- Tests: npm test

Notes
- This doc reflects the current repository structure and intended purpose based on source files and package.json.
