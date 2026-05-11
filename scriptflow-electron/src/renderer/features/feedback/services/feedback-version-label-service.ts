const FALLBACK_VERSION_TAG = 'v0.0.0'

export class FeedbackVersionLabelService {
    static formatTag(version?: string | null): string {
        const normalizedVersion = version?.trim()

        if (!normalizedVersion) {
            return FALLBACK_VERSION_TAG
        }

        return normalizedVersion.startsWith('v') ? normalizedVersion : `v${normalizedVersion}`
    }
}
