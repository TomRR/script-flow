import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { AppIconService } from '../src/main/app-icon-service'
import { AppIdentityService } from '../src/main/app-identity-service'

export type BuildPlatform = 'mac' | 'linux' | 'win'
export type BuildArch = 'arm64' | 'x64'

export interface BuildDesktopArtifactOptions {
    platform: BuildPlatform
    target: string
    arch: BuildArch
    buildVersion?: string
    outputDir: string
    skipBuild: boolean
}

interface GitHubPublishConfig {
    provider: 'github'
    owner: string
    repo: string
    releaseType: 'release' | 'prerelease'
}

interface AzureSignOptions {
    publisherName: string
    endpoint: string
    certificateProfileName: string
    codeSigningAccountName: string
    fileDigest: 'SHA256'
    timestampDigest: 'SHA256'
    timestampRfc3161: 'http://timestamp.acs.microsoft.com'
}

export class DesktopBuilderConfigService {
    static createArtifactNamePattern(platformValue: BuildPlatform): string {
        return `ScriptFlow-\${version}-${platformValue}-\${arch}.\${ext}`
    }

    static resolveGitHubPublishConfig(version: string): GitHubPublishConfig | undefined {
        const rawRepository =
            process.env.SCRIPTFLOW_DESKTOP_UPDATE_REPOSITORY?.trim() || process.env.GITHUB_REPOSITORY?.trim() || ''
        if (!rawRepository) {
            return undefined
        }

        const [owner, repo, ...rest] = rawRepository.split('/')
        if (!owner || !repo || rest.length > 0) {
            return undefined
        }

        return {
            provider: 'github',
            owner,
            repo,
            releaseType: version.includes('-') ? 'prerelease' : 'release',
        }
    }

    static hasMacSigningSecrets(environment: NodeJS.ProcessEnv = process.env): boolean {
        return DesktopBuilderConfigService.hasAll([
            environment.CSC_LINK,
            environment.CSC_KEY_PASSWORD,
            environment.APPLE_API_KEY,
            environment.APPLE_API_KEY_ID,
            environment.APPLE_API_ISSUER,
        ])
    }

    static hasWindowsSigningSecrets(environment: NodeJS.ProcessEnv = process.env): boolean {
        return DesktopBuilderConfigService.hasAll([
            environment.AZURE_TENANT_ID,
            environment.AZURE_CLIENT_ID,
            environment.AZURE_CLIENT_SECRET,
            environment.AZURE_TRUSTED_SIGNING_ENDPOINT,
            environment.AZURE_TRUSTED_SIGNING_ACCOUNT_NAME,
            environment.AZURE_TRUSTED_SIGNING_CERTIFICATE_PROFILE_NAME,
            environment.AZURE_TRUSTED_SIGNING_PUBLISHER_NAME,
        ])
    }

    static resolveWindowsSigningConfig(environment: NodeJS.ProcessEnv = process.env): AzureSignOptions | undefined {
        if (!DesktopBuilderConfigService.hasWindowsSigningSecrets(environment)) {
            return undefined
        }

        return {
            publisherName: environment.AZURE_TRUSTED_SIGNING_PUBLISHER_NAME!,
            endpoint: environment.AZURE_TRUSTED_SIGNING_ENDPOINT!,
            certificateProfileName: environment.AZURE_TRUSTED_SIGNING_CERTIFICATE_PROFILE_NAME!,
            codeSigningAccountName: environment.AZURE_TRUSTED_SIGNING_ACCOUNT_NAME!,
            fileDigest: 'SHA256',
            timestampDigest: 'SHA256',
            timestampRfc3161: 'http://timestamp.acs.microsoft.com',
        }
    }

    static createBuilderConfig(
        options: BuildDesktopArtifactOptions,
        environment: NodeJS.ProcessEnv,
    ): Record<string, unknown> {
        const publishConfig = DesktopBuilderConfigService.resolveGitHubPublishConfig(options.buildVersion!)
        const builderConfig: Record<string, unknown> = {
            appId: AppIdentityService.getAppId(),
            productName: AppIdentityService.getProductName(),
            artifactName: DesktopBuilderConfigService.createArtifactNamePattern(options.platform),
            directories: {
                output: options.outputDir,
                buildResources: 'build',
            },
            icon: AppIconService.SOURCE_ICON_RELATIVE_PATH,
            files: ['dist-electron/**/*', 'dist/**/*', '!**/*.{ts,tsx,map}'],
            extraMetadata: {
                version: options.buildVersion,
            },
            nsis: {
                oneClick: false,
                allowToChangeInstallationDirectory: true,
                ...(options.platform === 'win'
                    ? {
                          installerIcon: AppIconService.WINDOWS_ICON_RELATIVE_PATH,
                          uninstallerIcon: AppIconService.WINDOWS_ICON_RELATIVE_PATH,
                      }
                    : {}),
            },
        }

        if (publishConfig) {
            builderConfig.publish = [publishConfig]
        }

        if (options.platform === 'mac') {
            builderConfig.mac = {
                icon: AppIconService.MAC_ICON_RELATIVE_PATH,
                category: 'public.app-category.developer-tools',
                target: options.target === 'dmg' ? ['dmg', 'zip'] : [options.target],
                ...(DesktopBuilderConfigService.hasMacSigningSecrets(environment) ? {} : { identity: null }),
            }
        }

        if (options.platform === 'linux') {
            builderConfig.linux = {
                target: [options.target],
                category: 'Development',
            }
        }

        if (options.platform === 'win') {
            const azureSignOptions = DesktopBuilderConfigService.resolveWindowsSigningConfig(environment)
            builderConfig.win = {
                icon: AppIconService.WINDOWS_ICON_RELATIVE_PATH,
                target: [options.target],
                ...(azureSignOptions ? { azureSignOptions } : { signAndEditExecutable: false }),
            }
        }

        return builderConfig
    }

    static writeBuilderConfig(options: BuildDesktopArtifactOptions, environment: NodeJS.ProcessEnv): string {
        const builderConfig = DesktopBuilderConfigService.createBuilderConfig(options, environment)
        const configPath = path.join(
            tmpdir(),
            `scriptflow-builder-${options.platform}-${options.arch}-${Date.now()}.json`,
        )

        writeFileSync(configPath, JSON.stringify(builderConfig, null, 4), 'utf8')

        return configPath
    }

    private static hasAll(values: Array<string | undefined>): values is string[] {
        return values.every((value) => typeof value === 'string' && value.trim().length > 0)
    }
}
