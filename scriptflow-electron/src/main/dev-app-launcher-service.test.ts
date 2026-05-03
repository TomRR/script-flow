import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AppIdentityService } from './app-identity-service'
import { DevAppLauncherService } from './dev-app-launcher-service'

describe('DevAppLauncherService', () => {
    test('builds the expected temporary macOS bundle paths', () => {
        const tempRoot = path.join(path.sep, 'tmp', 'scriptflow-tests')
        const appPath = DevAppLauncherService.getTemporaryAppPath(tempRoot)
        const modulePath = DevAppLauncherService.getElectronModulePath(tempRoot)

        expect(appPath).toBe(
            path.join(
                tempRoot,
                DevAppLauncherService.TEMP_DIRECTORY_NAME,
                `${AppIdentityService.getProductName()}.app`,
            ),
        )
        expect(modulePath).toBe(
            path.join(tempRoot, DevAppLauncherService.TEMP_DIRECTORY_NAME, DevAppLauncherService.MODULE_FILENAME),
        )
        expect(DevAppLauncherService.getExecutablePath(appPath)).toBe(
            path.join(
                tempRoot,
                DevAppLauncherService.TEMP_DIRECTORY_NAME,
                `${AppIdentityService.getProductName()}.app`,
                'Contents',
                'MacOS',
                AppIdentityService.getProductName(),
            ),
        )
        expect(DevAppLauncherService.getBundleIconPath(appPath)).toBe(
            path.join(
                tempRoot,
                DevAppLauncherService.TEMP_DIRECTORY_NAME,
                `${AppIdentityService.getProductName()}.app`,
                'Contents',
                'Resources',
                'icon.icns',
            ),
        )
    })

    test('rewrites the relevant plist values to ScriptFlow', () => {
        const plist = [
            '<plist>',
            '<dict>',
            '<key>CFBundleName</key>',
            '<string>Electron</string>',
            '<key>CFBundleDisplayName</key>',
            '<string>Electron</string>',
            '<key>CFBundleExecutable</key>',
            '<string>Electron</string>',
            '</dict>',
            '</plist>',
        ].join('\n')

        expect(DevAppLauncherService.updateInfoPlistContent(plist)).toContain(
            `<key>CFBundleName</key>\n<string>${AppIdentityService.getProductName()}</string>`,
        )
        expect(DevAppLauncherService.updateInfoPlistContent(plist)).toContain(
            `<key>CFBundleDisplayName</key>\n<string>${AppIdentityService.getProductName()}</string>`,
        )
        expect(DevAppLauncherService.updateInfoPlistContent(plist)).toContain(
            `<key>CFBundleExecutable</key>\n<string>${AppIdentityService.getProductName()}</string>`,
        )
    })

    test('creates a temporary Electron module for the renamed macOS app bundle', async () => {
        const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'scriptflow-dev-launcher-test-'))
        const sourceAppPath = path.join(tempRoot, DevAppLauncherService.SOURCE_APP_NAME)
        const sourceExecutablePath = path.join(
            sourceAppPath,
            'Contents',
            'MacOS',
            DevAppLauncherService.SOURCE_EXECUTABLE_NAME,
        )
        const plistPath = path.join(sourceAppPath, 'Contents', 'Info.plist')
        const generatedIconPath = path.join(tempRoot, 'generated-icon.icns')
        const ensureMacIconAssets = jest.fn(async () => generatedIconPath)

        try {
            await fs.mkdir(path.dirname(sourceExecutablePath), { recursive: true })
            await fs.mkdir(path.join(sourceAppPath, 'Contents', 'Resources'), { recursive: true })
            await fs.writeFile(sourceExecutablePath, '#!/bin/sh\n', 'utf8')
            await fs.writeFile(generatedIconPath, 'generated-icon', 'utf8')
            await fs.writeFile(
                plistPath,
                [
                    '<plist>',
                    '<dict>',
                    '<key>CFBundleName</key>',
                    '<string>Electron</string>',
                    '<key>CFBundleDisplayName</key>',
                    '<string>Electron</string>',
                    '<key>CFBundleExecutable</key>',
                    '<string>Electron</string>',
                    '</dict>',
                    '</plist>',
                ].join('\n'),
                'utf8',
            )

            const moduleUrl = await DevAppLauncherService.prepareCustomElectronModule({
                platform: 'darwin',
                tempRoot,
                sourceAppPath,
                ensureMacIconAssets,
            })

            expect(moduleUrl).not.toBeNull()

            const modulePath = fileURLToPath(moduleUrl as string)
            const moduleContent = await fs.readFile(modulePath, 'utf8')
            const appPath = DevAppLauncherService.getTemporaryAppPath(tempRoot)
            const executablePath = DevAppLauncherService.getExecutablePath(appPath)
            const updatedPlist = await fs.readFile(DevAppLauncherService.getInfoPlistPath(appPath), 'utf8')
            const copiedIcon = await fs.readFile(DevAppLauncherService.getBundleIconPath(appPath), 'utf8')

            expect(moduleContent).toBe(DevAppLauncherService.buildElectronModuleContent(executablePath))
            expect(updatedPlist).toContain(`<string>${AppIdentityService.getProductName()}</string>`)
            expect(copiedIcon).toBe('generated-icon')
            expect(ensureMacIconAssets).toHaveBeenCalledTimes(1)
            await expect(fs.access(executablePath)).resolves.toBeUndefined()
            await expect(
                fs.access(
                    DevAppLauncherService.getExecutablePath(appPath, DevAppLauncherService.SOURCE_EXECUTABLE_NAME),
                ),
            ).rejects.toThrow()
        } finally {
            await fs.rm(tempRoot, { recursive: true, force: true })
        }
    })
})
