import type { IpcMain } from 'electron'
import { ExternalLinkService } from './external-link-service'

export class ExternalLinkIpcService {
    public static register(ipcMain: IpcMain, externalLinkService: ExternalLinkService): void {
        ipcMain.handle('external:open', async (_, url: string) => {
            await externalLinkService.open(url)
        })
    }
}
