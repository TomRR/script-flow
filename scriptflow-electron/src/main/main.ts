import { app, BrowserWindow, ipcMain, shell, dialog, nativeImage } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import platform from 'node:process'
import { VaultHandler } from './vault-handler'
import { MultiVaultService } from './multi-vault-service'
import { SecretsHandler } from './secrets-handler'
import { AppInfoService } from './app-info-service'
import { AppIdentityService } from './app-identity-service'
import { AppIconService } from './app-icon-service'
import { ExternalLinkService } from './external-link-service'
import { ExternalLinkIpcService } from './external-link-ipc-service'
import { AppUpdateService } from './app-update-service'
import { AppUpdateIpcService } from './app-update-ipc-service'
import { BashRuntimeService } from './bash-runtime-service'
import { ExecuteScriptService } from '../renderer/features/script-execution/services/execute-script-service'
import { LogService } from './log-service'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

// Set the app name for development
if (!app.isPackaged) {
    app.setName(AppIdentityService.getProductName())
    process.title = AppIdentityService.getProductName()
}

if (platform.platform === 'win32') {
    app.setAppUserModelId(AppIdentityService.getAppId())
}

const iconPath = path.join(process.env.VITE_PUBLIC || '', 'icon.png')

let win: BrowserWindow | null
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: iconPath,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            sandbox: false,
            nodeIntegration: false,
            contextIsolation: true,
        },
    })

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
    } else {
        win.loadFile(path.join(process.env.DIST || '', 'index.html'))
    }
}

app.on('window-all-closed', () => {
    if (platform.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

app.whenReady().then(() => {
    if (platform.platform === 'darwin' && app.dock) {
        const dockIconPath = app.isPackaged ? iconPath : AppIconService.getSourceIconPath(process.cwd())
        const icon = nativeImage.createFromPath(dockIconPath)
        app.dock.setIcon(icon)
    }

    // Initialize logging service first
    LogService.init()

    // Initialize services
    const userDataPath = app.getPath('userData')
    const configDir = path.join(userDataPath, 'config')
    const secretsHandler = new SecretsHandler(configDir)
    const multiVaultService = new MultiVaultService(configDir, secretsHandler)
    const appInfoService = new AppInfoService()
    const externalLinkService = new ExternalLinkService()
    const appUpdateService = new AppUpdateService({
        onStateChange: (state) => {
            AppUpdateIpcService.broadcastState(BrowserWindow.getAllWindows(), state)
        },
    })
    appUpdateService.configure()

    // Add IPC handlers here
    const vaultHandler = new VaultHandler(multiVaultService)
    const bashRuntimeService = new BashRuntimeService()
    // Dynamic import to avoid issues if the file isn't transpiled yet, but standard import is better if setup allows.
    // Assuming standard import works as per existing patterns.
    const executeScriptService = new ExecuteScriptService(
        vaultHandler,
        multiVaultService,
        secretsHandler,
        bashRuntimeService,
    )

    ipcMain.handle('vault:check', () => vaultHandler.checkVaultConfig())
    ipcMain.handle('app:getInfo', () => appInfoService.getInfo())
    ExternalLinkIpcService.register(ipcMain, externalLinkService)
    AppUpdateIpcService.register(ipcMain, appUpdateService)

    // New multi-vault IPC handlers
    ipcMain.handle('vault:getVaults', async () => {
        return await vaultHandler.getVaults()
    })

    ipcMain.handle('vault:setActiveVault', async (_, vaultId: string) => {
        return await vaultHandler.setActiveVault(vaultId)
    })

    ipcMain.handle('vault:addVault', async (_, name: string, vaultPath: string) => {
        return await vaultHandler.addVault(name, vaultPath)
    })

    ipcMain.handle('vault:removeVault', async (_, vaultId: string) => {
        return await vaultHandler.removeVault(vaultId)
    })

    ipcMain.handle('vault:updateVaultName', async (_, vaultId: string, newName: string) => {
        return await vaultHandler.updateVaultName(vaultId, newName)
    })

    ipcMain.handle('vault:select', async () => {
        if (!win) return null
        return await vaultHandler.selectVault(win)
    })

    ipcMain.handle('vault:init', async (_, vaultPath: string, name?: string) => {
        return await vaultHandler.initializeVault(vaultPath, name)
    })

    ipcMain.handle('vault:openConfigDirectory', async () => {
        const configDir = vaultHandler.getConfigDirectory()
        await shell.openPath(configDir)
    })

    ipcMain.handle('vault:getSections', async () => {
        return await vaultHandler.getSections()
    })

    ipcMain.handle('vault:addSection', async (_, title: string) => {
        return await vaultHandler.addSection(title)
    })

    ipcMain.handle('vault:updateSection', async (_, id: string, title: string) => {
        return await vaultHandler.updateSection(id, title)
    })

    ipcMain.handle('vault:duplicateSection', async (_, id: string) => {
        return await vaultHandler.duplicateSection(id)
    })

    ipcMain.handle('vault:addSubSection', async (_, sectionId: string, title: string) => {
        return await vaultHandler.addSubSection(sectionId, title)
    })

    ipcMain.handle('vault:deleteSection', async (_, id: string) => {
        return await vaultHandler.deleteSection(id)
    })

    ipcMain.handle('vault:deleteSubSection', async (_, sectionId: string, subSectionKey: string) => {
        return await vaultHandler.deleteSubSection(sectionId, subSectionKey)
    })

    ipcMain.handle('vault:updateSubSection', async (_, sectionId: string, subSectionKey: string, title: string) => {
        return await vaultHandler.updateSubSection(sectionId, subSectionKey, title)
    })

    ipcMain.handle('vault:duplicateSubSection', async (_, sectionId: string, subSectionKey: string) => {
        return await vaultHandler.duplicateSubSection(sectionId, subSectionKey)
    })

    ipcMain.handle('vault:addScriptToSubSection', async (_, sectionId: string, subSectionKey: string, script: any) => {
        return await vaultHandler.addScriptToSubSection(sectionId, subSectionKey, script)
    })

    ipcMain.handle(
        'vault:removeScriptFromSubSection',
        async (_, sectionId: string, subSectionKey: string, scriptId: string) => {
            return await vaultHandler.removeScriptFromSubSection(sectionId, subSectionKey, scriptId)
        },
    )

    ipcMain.handle(
        'vault:duplicateScriptInSubSection',
        async (_, sectionId: string, subSectionKey: string, scriptId: string) => {
            return await vaultHandler.duplicateScriptInSubSection(sectionId, subSectionKey, scriptId)
        },
    )

    ipcMain.handle(
        'vault:updateScriptInSubSection',
        async (_, sectionId: string, subSectionKey: string, script: any) => {
            return await vaultHandler.updateScriptInSubSection(sectionId, subSectionKey, script)
        },
    )

    // Drag and drop handlers
    ipcMain.handle('vault:reorderSections', async (_, fromIndex: number, toIndex: number) => {
        return await vaultHandler.reorderSections(fromIndex, toIndex)
    })

    ipcMain.handle('vault:reorderWorkflows', async (_, sectionId: string, fromIndex: number, toIndex: number) => {
        return await vaultHandler.reorderWorkflows(sectionId, fromIndex, toIndex)
    })

    ipcMain.handle(
        'vault:moveWorkflow',
        async (_, workflowKey: string, fromSectionId: string, toSectionId: string, toIndex: number) => {
            return await vaultHandler.moveWorkflow(workflowKey, fromSectionId, toSectionId, toIndex)
        },
    )

    ipcMain.handle(
        'vault:reorderScripts',
        async (_, sectionId: string, subSectionKey: string, fromIndex: number, toIndex: number) => {
            return await vaultHandler.reorderScripts(sectionId, subSectionKey, fromIndex, toIndex)
        },
    )

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

    ipcMain.handle('dialog:openScript', async () => {
        if (!win) return null
        const vaultPath = await vaultHandler.checkVaultConfig()
        const result = await dialog.showOpenDialog(win, {
            defaultPath: vaultPath || undefined,
            properties: ['openFile'],
            filters: [
                { name: 'Scripts', extensions: ['sh', 'ps1', 'py', 'cs', 'bat', 'cmd'] },
                { name: 'All Files', extensions: ['*'] },
            ],
        })
        if (result.canceled || result.filePaths.length === 0) {
            return null
        }
        // Convert absolute path to relative path from vault directory
        const absolutePath = result.filePaths[0]
        const relativePath = await vaultHandler.makeRelativePath(absolutePath)
        return relativePath
    })

    ipcMain.handle('dialog:openScripts', async () => {
        if (!win) return null
        const vaultPath = await vaultHandler.checkVaultConfig()
        const result = await dialog.showOpenDialog(win, {
            defaultPath: vaultPath || undefined,
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'Scripts', extensions: ['sh', 'ps1', 'py', 'cs', 'bat', 'cmd'] },
                { name: 'All Files', extensions: ['*'] },
            ],
        })
        if (result.canceled || result.filePaths.length === 0) {
            return null
        }
        // Convert absolute paths to relative paths from vault directory
        const relativePaths = await Promise.all(
            result.filePaths.map((filePath) => vaultHandler.makeRelativePath(filePath)),
        )
        return relativePaths
    })

    ipcMain.handle('script:runSingle', async (event, script: any) => {
        const webContents = event.sender
        return await executeScriptService.runSingleScript(
            script,
            (data) => {
                webContents.send('script:output', { scriptId: script.id, data })
            },
            (status) => {
                webContents.send('script:status', status)
            },
        )
    })

    ipcMain.handle('script:stop', async (_, scriptId: string) => {
        return await executeScriptService.stopScript(scriptId)
    })

    ipcMain.handle('workflow:stop', async (event) => {
        const webContents = event.sender
        return await executeScriptService.stopWorkflow((status) => {
            webContents.send('script:status', status)
        })
    })

    ipcMain.handle('script:runAll', async (event, scripts: any[]) => {
        const webContents = event.sender
        return await executeScriptService.runAllScripts(
            scripts,
            (scriptId, data) => {
                webContents.send('script:output', { scriptId, data })
            },
            (status) => {
                webContents.send('script:status', status)
            },
        )
    })

    ipcMain.handle('logs:get', async () => {
        return LogService.getLogs()
    })

    ipcMain.handle('logs:clear', async () => {
        LogService.clearLogs()
    })

    ipcMain.handle('logs:addFromRenderer', async (_, level: string, message: string) => {
        LogService.addRendererLog(level as any, message)
    })

    ipcMain.handle('file:read', async (_, relativePath: string) => {
        return await vaultHandler.readScriptFile(relativePath)
    })

    ipcMain.handle('file:write', async (_, relativePath: string, content: string) => {
        return await vaultHandler.writeScriptFile(relativePath, content)
    })

    createWindow()
})
