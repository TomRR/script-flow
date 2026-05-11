const FALLBACK_VERSION_LABEL = '0.0.0'

export class FeedbackVersionLabelService {
    static formatLabel(version?: string | null): string {
        const normalizedVersion = version?.trim()

        if (!normalizedVersion) {
            return FALLBACK_VERSION_LABEL
        }

        return normalizedVersion.replace(/^[vV]/, '')
    }
}
