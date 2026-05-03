import { shell } from 'electron'

export class ExternalLinkService {
    public async open(url: string): Promise<void> {
        await shell.openExternal(url)
    }
}
