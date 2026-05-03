import type { BrowserWindow, IpcMain } from 'electron'
import type { AppUpdateState } from '../shared/app-update-state'
import { AppUpdateService } from './app-update-service'

export class AppUpdateIpcService {
    static readonly STATE_CHANNEL = 'app:update:state'
    static readonly GET_STATE_CHANNEL = 'app:update:getState'
    static readonly CHECK_CHANNEL = 'app:update:check'
    static readonly DOWNLOAD_CHANNEL = 'app:update:download'
    static readonly INSTALL_CHANNEL = 'app:update:install'

    public static register(ipcMain: IpcMain, appUpdateService: AppUpdateService): void {
        ipcMain.handle(AppUpdateIpcService.GET_STATE_CHANNEL, async () => {
            return appUpdateService.getState()
        })

        ipcMain.handle(AppUpdateIpcService.CHECK_CHANNEL, async () => {
            return await appUpdateService.checkForUpdates()
        })

        ipcMain.handle(AppUpdateIpcService.DOWNLOAD_CHANNEL, async () => {
            return await appUpdateService.downloadUpdate()
        })

        ipcMain.handle(AppUpdateIpcService.INSTALL_CHANNEL, async () => {
            return appUpdateService.installUpdate()
        })
    }

    public static broadcastState(windows: BrowserWindow[], state: AppUpdateState): void {
        for (const browserWindow of windows) {
            browserWindow.webContents.send(AppUpdateIpcService.STATE_CHANNEL, state)
        }
    }
}
