import { FeedbackVersionLabelService } from './feedback-version-label-service'

describe('FeedbackVersionLabelService', () => {
    test('formats plain versions as release tags', () => {
        expect(FeedbackVersionLabelService.formatTag('0.1.1')).toBe('v0.1.1')
    })

    test('keeps versions that already use the release tag format', () => {
        expect(FeedbackVersionLabelService.formatTag('v0.1.1')).toBe('v0.1.1')
    })

    test('falls back when the version is empty or missing', () => {
        expect(FeedbackVersionLabelService.formatTag('')).toBe('v0.0.0')
        expect(FeedbackVersionLabelService.formatTag('   ')).toBe('v0.0.0')
        expect(FeedbackVersionLabelService.formatTag()).toBe('v0.0.0')
    })
})
