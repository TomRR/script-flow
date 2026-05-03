import { AppInfoService } from './app-info-service'

describe('AppInfoService', () => {
    test('normalizes darwin to mac', () => {
        const service = new AppInfoService({
            platform: 'darwin',
            architecture: 'arm64',
            getVersion: () => '1.2.3',
        })

        expect(service.getInfo()).toEqual({
            platform: 'mac',
            architecture: 'arm64',
            version: '1.2.3',
        })
    })

    test('normalizes win32 to windows', () => {
        const service = new AppInfoService({
            platform: 'win32',
            architecture: 'x64',
            getVersion: () => '2.0.0',
        })

        expect(service.getInfo()).toEqual({
            platform: 'windows',
            architecture: 'x64',
            version: '2.0.0',
        })
    })

    test('returns unknown for unsupported platforms', () => {
        const service = new AppInfoService({
            platform: 'freebsd',
            architecture: 'x64',
            getVersion: () => '0.0.1',
        })

        expect(service.getInfo()).toEqual({
            platform: 'unknown',
            architecture: 'x64',
            version: '0.0.1',
        })
    })
})
