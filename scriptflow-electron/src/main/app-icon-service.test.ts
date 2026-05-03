import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, jest, test } from '@jest/globals'
import { AppIconService, type EnsureMacIconAssetsOptions } from './app-icon-service'

describe('AppIconService', () => {
    test('resolves the canonical source and output paths', () => {
        const projectRoot = path.join(path.sep, 'repo', 'scriptflow-electron')
        const tempRoot = path.join(path.sep, 'tmp', 'scriptflow-icons')

        expect(AppIconService.getSourceIconPath(projectRoot)).toBe(path.join(projectRoot, 'public', 'icon.png'))
        expect(AppIconService.getMacIconPath(projectRoot)).toBe(path.join(projectRoot, 'build', 'icon.icns'))
        expect(AppIconService.getTemporaryPaddedIconPath(tempRoot)).toBe(
            path.join(tempRoot, 'scriptflow-icon', 'icon-square.png'),
        )
    })

    test('calculates a square icon size using the larger source dimension', () => {
        expect(AppIconService.getSquareSize({ width: 1093, height: 961 })).toBe(1093)
    })

    test('builds the expected macOS command arguments', () => {
        const repoRoot = path.join(path.sep, 'repo')
        const publicIconPath = path.join(repoRoot, 'public', 'icon.png')
        const tempIconPath = path.join(path.sep, 'tmp', 'icon-square.png')
        const paddedIconPath = path.join(path.sep, 'tmp', 'scriptflow-icon', 'icon-square.png')
        const buildDirectory = path.join(repoRoot, 'build')

        expect(AppIconService.createImageSizeArgs(publicIconPath)).toEqual([
            '-g',
            'pixelWidth',
            '-g',
            'pixelHeight',
            publicIconPath,
        ])

        expect(AppIconService.createPadImageArgs(publicIconPath, tempIconPath, 1093)).toEqual([
            '--padToHeightWidth',
            '1093',
            '1093',
            publicIconPath,
            '--out',
            tempIconPath,
        ])

        expect(AppIconService.createIcnsArgs(repoRoot, paddedIconPath, buildDirectory)).toEqual([
            'icon',
            '--format',
            'icns',
            '--root',
            repoRoot,
            '--root',
            path.dirname(paddedIconPath),
            '--out',
            buildDirectory,
            '--input',
            paddedIconPath,
        ])
    })

    test('parses image dimensions from sips output', () => {
        const size = AppIconService.parseImageSize(
            ['/repo/public/icon.png', '  pixelWidth: 1093', '  pixelHeight: 961'].join('\n'),
        )

        expect(size).toEqual({ width: 1093, height: 961 })
    })

    test('returns null on non-macOS platforms', async () => {
        const runCommand = jest.fn<NonNullable<EnsureMacIconAssetsOptions['runCommand']>>()

        const result = await AppIconService.ensureMacIconAssets({
            platform: 'linux',
            runCommand,
        })

        expect(result).toBeNull()
        expect(runCommand).not.toHaveBeenCalled()
    })

    test('generates the padded icon and icns asset on macOS', async () => {
        const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'scriptflow-app-icon-project-'))
        const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'scriptflow-app-icon-temp-'))
        const runCommand = jest.fn<NonNullable<EnsureMacIconAssetsOptions['runCommand']>>()

        runCommand.mockResolvedValueOnce({
            stdout: ['/repo/public/icon.png', '  pixelWidth: 1093', '  pixelHeight: 961'].join('\n'),
            stderr: '',
        })
        runCommand.mockResolvedValue({ stdout: '', stderr: '' })

        try {
            const result = await AppIconService.ensureMacIconAssets({
                platform: 'darwin',
                architecture: 'arm64',
                projectRoot,
                tempRoot,
                runCommand,
            })

            expect(result).toBe(path.join(projectRoot, 'build', 'icon.icns'))
            expect(runCommand).toHaveBeenNthCalledWith(
                1,
                'sips',
                AppIconService.createImageSizeArgs(path.join(projectRoot, 'public', 'icon.png')),
            )
            expect(runCommand).toHaveBeenNthCalledWith(
                2,
                'sips',
                AppIconService.createPadImageArgs(
                    path.join(projectRoot, 'public', 'icon.png'),
                    path.join(tempRoot, 'scriptflow-icon', 'icon-square.png'),
                    1093,
                ),
            )
            expect(runCommand).toHaveBeenNthCalledWith(
                3,
                path.join(projectRoot, 'node_modules', 'app-builder-bin', 'mac', 'app-builder_arm64'),
                AppIconService.createIcnsArgs(
                    projectRoot,
                    path.join(tempRoot, 'scriptflow-icon', 'icon-square.png'),
                    path.join(projectRoot, 'build'),
                ),
            )
        } finally {
            await fs.rm(projectRoot, { recursive: true, force: true })
            await fs.rm(tempRoot, { recursive: true, force: true })
        }
    })
})
