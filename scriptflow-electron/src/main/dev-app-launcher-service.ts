import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { AppIdentityService } from './app-identity-service'
import { AppIconService } from './app-icon-service'

interface DevAppLauncherServiceOptions {
    platform?: NodeJS.Platform
    projectRoot?: string
    tempRoot?: string
    sourceAppPath?: string
    ensureMacIconAssets?: () => Promise<string | null>
}

export class DevAppLauncherService {
    static readonly MODULE_FILENAME = 'electron-path.mjs'
    static readonly PLIST_FILENAME = 'Info.plist'
    static readonly SOURCE_APP_NAME = 'Electron.app'
    static readonly SOURCE_EXECUTABLE_NAME = 'Electron'
    static readonly TEMP_DIRECTORY_NAME = 'scriptflow-dev-launcher'
    static readonly BUNDLE_ICON_FILENAME = 'icon.icns'

    static getTemporaryRoot(tempRoot = os.tmpdir()): string {
        return path.join(tempRoot, DevAppLauncherService.TEMP_DIRECTORY_NAME)
    }

    static getTemporaryAppPath(tempRoot = os.tmpdir()): string {
        return path.join(DevAppLauncherService.getTemporaryRoot(tempRoot), `${AppIdentityService.getProductName()}.app`)
    }

    static getInfoPlistPath(appPath: string): string {
        return path.join(appPath, 'Contents', DevAppLauncherService.PLIST_FILENAME)
    }

    static getBundleIconPath(appPath: string): string {
        return path.join(appPath, 'Contents', 'Resources', DevAppLauncherService.BUNDLE_ICON_FILENAME)
    }

    static getExecutablePath(appPath: string, executableName = AppIdentityService.getProductName()): string {
        return path.join(appPath, 'Contents', 'MacOS', executableName)
    }

    static getElectronModulePath(tempRoot = os.tmpdir()): string {
        return path.join(DevAppLauncherService.getTemporaryRoot(tempRoot), DevAppLauncherService.MODULE_FILENAME)
    }

    static buildElectronModuleContent(executablePath: string): string {
        return `export default ${JSON.stringify(executablePath)};\n`
    }

    static updateInfoPlistContent(plistContent: string): string {
        const productName = AppIdentityService.getProductName()
        const keysToReplace = ['CFBundleDisplayName', 'CFBundleExecutable', 'CFBundleName']

        return keysToReplace.reduce((content, key) => {
            return content.replace(
                new RegExp(`(<key>${key}<\\/key>\\s*<string>)([^<]*)(<\\/string>)`),
                `$1${productName}$3`,
            )
        }, plistContent)
    }

    static async prepareCustomElectronModule(options: DevAppLauncherServiceOptions = {}): Promise<string | null> {
        const platform = options.platform ?? process.platform
        if (platform !== 'darwin') {
            return null
        }

        const tempRoot = options.tempRoot ?? os.tmpdir()
        const projectRoot = options.projectRoot ?? process.cwd()
        const appPath = DevAppLauncherService.getTemporaryAppPath(tempRoot)
        const modulePath = DevAppLauncherService.getElectronModulePath(tempRoot)
        const sourceAppPath =
            options.sourceAppPath ??
            path.join(projectRoot, 'node_modules', 'electron', 'dist', DevAppLauncherService.SOURCE_APP_NAME)
        const ensureMacIconAssets =
            options.ensureMacIconAssets ?? (() => AppIconService.ensureMacIconAssets({ projectRoot }))

        await fs.rm(appPath, { recursive: true, force: true })
        await fs.mkdir(DevAppLauncherService.getTemporaryRoot(tempRoot), { recursive: true })
        await fs.cp(sourceAppPath, appPath, { recursive: true })

        const plistPath = DevAppLauncherService.getInfoPlistPath(appPath)
        const originalPlist = await fs.readFile(plistPath, 'utf8')
        const updatedPlist = DevAppLauncherService.updateInfoPlistContent(originalPlist)
        await fs.writeFile(plistPath, updatedPlist, 'utf8')

        const sourceExecutablePath = DevAppLauncherService.getExecutablePath(
            appPath,
            DevAppLauncherService.SOURCE_EXECUTABLE_NAME,
        )
        const targetExecutablePath = DevAppLauncherService.getExecutablePath(appPath)
        const generatedIconPath = await ensureMacIconAssets()

        await fs.rm(targetExecutablePath, { force: true })
        await fs.rename(sourceExecutablePath, targetExecutablePath)
        if (generatedIconPath) {
            await fs.copyFile(generatedIconPath, DevAppLauncherService.getBundleIconPath(appPath))
        }

        await fs.writeFile(modulePath, DevAppLauncherService.buildElectronModuleContent(targetExecutablePath), 'utf8')

        return pathToFileURL(modulePath).href
    }
}
