export class AppIdentityService {
    static readonly APP_ID = 'com.tomrr.scriptflow'
    static readonly PRODUCT_NAME = 'ScriptFlow'

    static getAppId(): string {
        return AppIdentityService.APP_ID
    }

    static getProductName(): string {
        return AppIdentityService.PRODUCT_NAME
    }
}
