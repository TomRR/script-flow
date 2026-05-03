export class FeedbackLinkService {
    public static async open(url: string): Promise<void> {
        const electronWindow = window as unknown as Window & {
            api: {
                external: {
                    open: (targetUrl: string) => Promise<void>
                }
            }
        }

        await electronWindow.api.external.open(url)
    }
}
