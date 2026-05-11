import { describe, expect, test } from '@jest/globals'
import { DesktopBuilderConfigService, type BuildDesktopArtifactOptions } from './desktop-builder-config-service'

function createOptions(overrides: Partial<BuildDesktopArtifactOptions> = {}): BuildDesktopArtifactOptions {
    return {
        platform: 'win',
        target: 'nsis',
        arch: 'x64',
        buildVersion: '1.2.3',
        outputDir: 'release-assets',
        skipBuild: false,
        ...overrides,
    }
}

describe('DesktopBuilderConfigService', () => {
    test('creates Windows icon config for the app and NSIS installer surfaces', () => {
        const config = DesktopBuilderConfigService.createBuilderConfig(createOptions(), {})
        const winConfig = config.win as Record<string, unknown>
        const nsisConfig = config.nsis as Record<string, unknown>

        expect(winConfig.icon).toBe('build/icon.ico')
        expect(winConfig.target).toEqual(['nsis'])
        expect(winConfig.signAndEditExecutable).toBe(false)
        expect(nsisConfig.installerIcon).toBe('build/icon.ico')
        expect(nsisConfig.uninstallerIcon).toBe('build/icon.ico')
    })

    test('keeps Azure signing config when Windows signing secrets are present', () => {
        const environment = {
            AZURE_TENANT_ID: 'tenant',
            AZURE_CLIENT_ID: 'client',
            AZURE_CLIENT_SECRET: 'secret',
            AZURE_TRUSTED_SIGNING_ENDPOINT: 'endpoint',
            AZURE_TRUSTED_SIGNING_ACCOUNT_NAME: 'account',
            AZURE_TRUSTED_SIGNING_CERTIFICATE_PROFILE_NAME: 'profile',
            AZURE_TRUSTED_SIGNING_PUBLISHER_NAME: 'publisher',
        }

        const config = DesktopBuilderConfigService.createBuilderConfig(createOptions(), environment)
        const winConfig = config.win as Record<string, unknown>

        expect(winConfig.signAndEditExecutable).toBeUndefined()
        expect(winConfig.azureSignOptions).toEqual({
            publisherName: 'publisher',
            endpoint: 'endpoint',
            certificateProfileName: 'profile',
            codeSigningAccountName: 'account',
            fileDigest: 'SHA256',
            timestampDigest: 'SHA256',
            timestampRfc3161: 'http://timestamp.acs.microsoft.com',
        })
    })
})
