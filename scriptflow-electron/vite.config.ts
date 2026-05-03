import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'
import { DevAppLauncherService } from './src/main/dev-app-launcher-service'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        electron({
            main: {
                entry: 'src/main/main.ts',
                async onstart({ startup }) {
                    const customElectronModule = await DevAppLauncherService.prepareCustomElectronModule()

                    if (customElectronModule) {
                        await startup(['.', '--no-sandbox'], undefined, customElectronModule)
                        return
                    }

                    await startup()
                },
            },
            preload: {
                input: 'src/preload/preload.ts',
            },
            renderer: {},
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src/renderer'),
        },
    },
})
