import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, jest, test } from '@jest/globals'
import { AppUpdateService, type AutoUpdaterLike } from './app-update-service'
import type { AppUpdateState } from '../shared/app-update-state'

class MockAutoUpdater {
    autoDownload = true
    autoInstallOnAppQuit = true
    checkForUpdates = jest.fn(async () => {
        this.emit('update-available', { version: '1.1.0' })
    })
    downloadUpdate = jest.fn(async () => {
        this.emit('download-progress', { percent: 55.4 })
        this.emit('update-downloaded', { version: '1.1.0' })
    })
    quitAndInstall = jest.fn()

    private readonly listeners = new Map<string, (...args: unknown[]) => void>()

    on(event: string, listener: (...args: unknown[]) => void): this {
        this.listeners.set(event, listener)
        return this
    }

    emit(event: string, ...args: unknown[]): void {
        this.listeners.get(event)?.(...args)
    }
}

describe('AppUpdateService', () => {
    test('stays unavailable when the packaged app has no update config', () => {
        const updater = new MockAutoUpdater()
        const service = new AppUpdateService({
            currentVersion: '1.0.0',
            isPackaged: true,
            resourcesPath: path.join(os.tmpdir(), 'missing-scriptflow-update-config'),
            autoUpdater: updater as AutoUpdaterLike,
        })

        const state = service.configure()

        expect(state.status).toBe('unavailable')
        expect(state.canCheckForUpdates).toBe(false)
        expect(updater.autoDownload).toBe(true)
    })

    test('configures updater support when app-update.yml exists', () => {
        const resourcesPath = fs.mkdtempSync(path.join(os.tmpdir(), 'scriptflow-update-config-'))
        const updater = new MockAutoUpdater()

        try {
            fs.writeFileSync(path.join(resourcesPath, 'app-update.yml'), 'provider: github\nrepo: script-flow\n')

            const stateChanges: AppUpdateState[] = []
            const service = new AppUpdateService({
                currentVersion: '1.0.0',
                isPackaged: true,
                resourcesPath,
                autoUpdater: updater as AutoUpdaterLike,
                onStateChange: (state) => {
                    stateChanges.push(state)
                },
            })

            const state = service.configure()

            expect(state.status).toBe('idle')
            expect(state.canCheckForUpdates).toBe(true)
            expect(updater.autoDownload).toBe(false)
            expect(updater.autoInstallOnAppQuit).toBe(false)
            expect(stateChanges.at(-1)?.status).toBe('idle')
        } finally {
            fs.rmSync(resourcesPath, { recursive: true, force: true })
        }
    })

    test('checks, downloads, and installs an available update', async () => {
        const resourcesPath = fs.mkdtempSync(path.join(os.tmpdir(), 'scriptflow-update-actions-'))
        const updater = new MockAutoUpdater()

        try {
            fs.writeFileSync(path.join(resourcesPath, 'app-update.yml'), 'provider: github\nrepo: script-flow\n')

            const service = new AppUpdateService({
                currentVersion: '1.0.0',
                isPackaged: true,
                resourcesPath,
                autoUpdater: updater as AutoUpdaterLike,
            })

            service.configure()
            const checkResult = await service.checkForUpdates()

            expect(checkResult.accepted).toBe(true)
            expect(service.getState()).toEqual(
                expect.objectContaining({
                    status: 'available',
                    availableVersion: '1.1.0',
                    canDownloadUpdate: true,
                }),
            )

            const downloadResult = await service.downloadUpdate()

            expect(downloadResult.accepted).toBe(true)
            expect(service.getState()).toEqual(
                expect.objectContaining({
                    status: 'downloaded',
                    availableVersion: '1.1.0',
                    downloadProgressPercent: 100,
                    canInstallUpdate: true,
                }),
            )

            const installResult = service.installUpdate()

            expect(installResult.accepted).toBe(true)
            expect(updater.quitAndInstall).toHaveBeenCalledWith(true, true)
        } finally {
            fs.rmSync(resourcesPath, { recursive: true, force: true })
        }
    })
})
