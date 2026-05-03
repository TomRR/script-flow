import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
    // Add API methods here
    ping: () => ipcRenderer.invoke('ping'),
    app: {
        getInfo: () => ipcRenderer.invoke('app:getInfo'),
        updates: {
            getState: () => ipcRenderer.invoke('app:update:getState'),
            checkForUpdates: () => ipcRenderer.invoke('app:update:check'),
            downloadUpdate: () => ipcRenderer.invoke('app:update:download'),
            installUpdate: () => ipcRenderer.invoke('app:update:install'),
            onStateChange: (callback: (state: any) => void) => {
                const listener = (_: any, state: any) => callback(state)
                ipcRenderer.on('app:update:state', listener)
                return () => ipcRenderer.removeListener('app:update:state', listener)
            },
        },
    },
    external: {
        open: (url: string) => ipcRenderer.invoke('external:open', url),
    },
    vault: {
        checkConfig: () => ipcRenderer.invoke('vault:check'),
        select: () => ipcRenderer.invoke('vault:select'),
        init: (vaultPath: string, name?: string) => ipcRenderer.invoke('vault:init', vaultPath, name),
        openConfigDirectory: () => ipcRenderer.invoke('vault:openConfigDirectory'),
        getVaults: () => ipcRenderer.invoke('vault:getVaults'),
        setActiveVault: (vaultId: string) => ipcRenderer.invoke('vault:setActiveVault', vaultId),
        addVault: (name: string, vaultPath: string) => ipcRenderer.invoke('vault:addVault', name, vaultPath),
        removeVault: (vaultId: string) => ipcRenderer.invoke('vault:removeVault', vaultId),
        updateVaultName: (vaultId: string, newName: string) =>
            ipcRenderer.invoke('vault:updateVaultName', vaultId, newName),
        getSections: () => ipcRenderer.invoke('vault:getSections'),
        addSection: (title: string) => ipcRenderer.invoke('vault:addSection', title),
        updateSection: (id: string, title: string) => ipcRenderer.invoke('vault:updateSection', id, title),
        duplicateSection: (id: string) => ipcRenderer.invoke('vault:duplicateSection', id),
        addSubSection: (sectionId: string, title: string) =>
            ipcRenderer.invoke('vault:addSubSection', sectionId, title),

        deleteSection: (id: string) => ipcRenderer.invoke('vault:deleteSection', id),
        deleteSubSection: (sectionId: string, subSectionKey: string) =>
            ipcRenderer.invoke('vault:deleteSubSection', sectionId, subSectionKey),
        updateSubSection: (sectionId: string, subSectionKey: string, title: string) =>
            ipcRenderer.invoke('vault:updateSubSection', sectionId, subSectionKey, title),
        duplicateSubSection: (sectionId: string, subSectionKey: string) =>
            ipcRenderer.invoke('vault:duplicateSubSection', sectionId, subSectionKey),
        addScriptToSubSection: (sectionId: string, subSectionKey: string, script: any) =>
            ipcRenderer.invoke('vault:addScriptToSubSection', sectionId, subSectionKey, script),

        removeScriptFromSubSection: (sectionId: string, subSectionKey: string, scriptId: string) =>
            ipcRenderer.invoke('vault:removeScriptFromSubSection', sectionId, subSectionKey, scriptId),
        duplicateScriptInSubSection: (sectionId: string, subSectionKey: string, scriptId: string) =>
            ipcRenderer.invoke('vault:duplicateScriptInSubSection', sectionId, subSectionKey, scriptId),
        updateScriptInSubSection: (sectionId: string, subSectionKey: string, script: any) =>
            ipcRenderer.invoke('vault:updateScriptInSubSection', sectionId, subSectionKey, script),

        // Drag and drop methods
        reorderSections: (fromIndex: number, toIndex: number) =>
            ipcRenderer.invoke('vault:reorderSections', fromIndex, toIndex),
        reorderWorkflows: (sectionId: string, fromIndex: number, toIndex: number) =>
            ipcRenderer.invoke('vault:reorderWorkflows', sectionId, fromIndex, toIndex),
        moveWorkflow: (workflowKey: string, fromSectionId: string, toSectionId: string, toIndex: number) =>
            ipcRenderer.invoke('vault:moveWorkflow', workflowKey, fromSectionId, toSectionId, toIndex),
        reorderScripts: (sectionId: string, subSectionKey: string, fromIndex: number, toIndex: number) =>
            ipcRenderer.invoke('vault:reorderScripts', sectionId, subSectionKey, fromIndex, toIndex),
    },
    secrets: {
        get: () => ipcRenderer.invoke('secrets:get'),
        save: (data: any) => ipcRenderer.invoke('secrets:save', data),
    },
    dialog: {
        openScript: () => ipcRenderer.invoke('dialog:openScript'),
        openScripts: () => ipcRenderer.invoke('dialog:openScripts'),
    },
    script: {
        runSingleScript: (script: any) => ipcRenderer.invoke('script:runSingle', script),
        runAllScripts: (scripts: any[]) => ipcRenderer.invoke('script:runAll', scripts),
        stopScript: (scriptId: string) => ipcRenderer.invoke('script:stop', scriptId),
        stopWorkflow: () => ipcRenderer.invoke('workflow:stop'),
        onOutput: (callback: (data: { scriptId: string; data: string }) => void) => {
            const listener = (_: any, data: any) => callback(data)
            ipcRenderer.on('script:output', listener)
            return () => ipcRenderer.removeListener('script:output', listener)
        },
        onStatus: (callback: (data: any) => void) => {
            const listener = (_: any, data: any) => callback(data)
            ipcRenderer.on('script:status', listener)
            return () => ipcRenderer.removeListener('script:status', listener)
        },
    },
    logs: {
        getAll: () => ipcRenderer.invoke('logs:get'),
        clear: () => ipcRenderer.invoke('logs:clear'),
        addFromRenderer: (level: string, message: string) => ipcRenderer.invoke('logs:addFromRenderer', level, message),
    },
    file: {
        read: (relativePath: string) => ipcRenderer.invoke('file:read', relativePath),
        write: (relativePath: string, content: string) => ipcRenderer.invoke('file:write', relativePath, content),
    },
})
