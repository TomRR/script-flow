import { AppIdentityService } from './app-identity-service'

describe('AppIdentityService', () => {
    test('returns the canonical app id', () => {
        expect(AppIdentityService.getAppId()).toBe('com.tomrr.scriptflow')
    })

    test('returns ScriptFlow as the canonical product name', () => {
        expect(AppIdentityService.getProductName()).toBe('ScriptFlow')
    })
})
