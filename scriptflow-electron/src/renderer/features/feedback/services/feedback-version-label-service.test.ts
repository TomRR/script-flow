import { FeedbackVersionLabelService } from './feedback-version-label-service'

describe('FeedbackVersionLabelService', () => {
    test('keeps plain versions unchanged', () => {
        expect(FeedbackVersionLabelService.formatLabel('0.1.1')).toBe('0.1.1')
    })

    test('removes a leading lowercase release tag marker', () => {
        expect(FeedbackVersionLabelService.formatLabel('v0.1.1')).toBe('0.1.1')
    })

    test('removes a leading uppercase release tag marker', () => {
        expect(FeedbackVersionLabelService.formatLabel('V0.1.1')).toBe('0.1.1')
    })

    test('falls back when the version is empty or missing', () => {
        expect(FeedbackVersionLabelService.formatLabel('')).toBe('0.0.0')
        expect(FeedbackVersionLabelService.formatLabel('   ')).toBe('0.0.0')
        expect(FeedbackVersionLabelService.formatLabel()).toBe('0.0.0')
    })
})
