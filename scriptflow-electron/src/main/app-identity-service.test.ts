import { AppIdentityService } from './app-identity-service'

describe('AppIdentityService', () => {
    test('returns ScriptFlow as the canonical product name', () => {
        expect(AppIdentityService.getProductName()).toBe('ScriptFlow')
    })
})
