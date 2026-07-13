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
    test('uses the requested architecture in artifact names', () => {
        expect(DesktopBuilderConfigService.createArtifactNamePattern('linux', 'x64')).toBe(
            'ScriptFlow-${version}-linux-x64.${ext}',
        )
        expect(DesktopBuilderConfigService.createArtifactNamePattern('mac', 'arm64')).toBe(
            'ScriptFlow-${version}-mac-arm64.${ext}',
        )
    })

    test('creates a generic updater configuration from the release API URL', () => {
        const config = DesktopBuilderConfigService.createBuilderConfig(createOptions(), {
            RELEASE_API_BASE_URL: 'https://releases.example.com',
        })

        expect(config.publish).toEqual([
            {
                provider: 'generic',
                url: 'https://releases.example.com/script-flow/updates',
            },
        ])
    })

    test('normalizes trailing slashes in the release API updater URL', () => {
        expect(
            DesktopBuilderConfigService.resolveAzurePublishConfig({
                RELEASE_API_BASE_URL: '  https://releases.example.com///  ',
            }),
        ).toEqual({
            provider: 'generic',
            url: 'https://releases.example.com/script-flow/updates',
        })
    })

    test('omits updater configuration when the release API URL is missing', () => {
        const config = DesktopBuilderConfigService.createBuilderConfig(createOptions(), {})

        expect(config.publish).toBeUndefined()
    })

    test('does not use the retired public Azure URL for updater configuration', () => {
        expect(
            DesktopBuilderConfigService.resolveAzurePublishConfig({
                AZURE_INSTALLER_PUBLIC_BASE_URL: 'https://storage.example.com/installers',
            }),
        ).toBeUndefined()
    })

    test.each([
        'not-a-url',
        'http://downloads.example.com/installers',
        'https://user:password@downloads.example.com/installers',
        'https://downloads.example.com/installers?token=value',
        'https://downloads.example.com/installers#latest',
    ])('rejects invalid release API URL %s', (url) => {
        expect(() =>
            DesktopBuilderConfigService.resolveAzurePublishConfig({
                RELEASE_API_BASE_URL: url,
            }),
        ).toThrow('RELEASE_API_BASE_URL must be a valid HTTPS URL.')
    })

    test('creates Windows icon config for the app and NSIS installer surfaces', () => {
        const config = DesktopBuilderConfigService.createBuilderConfig(createOptions(), {})
        const winConfig = config.win as Record<string, unknown>
        const nsisConfig = config.nsis as Record<string, unknown>

        expect(winConfig.icon).toBe('build/icon.ico')
        expect(winConfig.target).toEqual(['nsis'])
        expect(winConfig.signAndEditExecutable).toBeUndefined()
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
