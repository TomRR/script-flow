import { KeyboardService } from './keyboard-service'

describe('KeyboardService', () => {
    let cleanup: (() => void) | null = null

    afterEach(() => {
        if (cleanup) {
            cleanup()
            cleanup = null
        }
    })

    describe('registerWorkflowStop', () => {
        test('should trigger callback on Cmd+C on Mac', () => {
            // Arrange
            const callback = jest.fn()
            Object.defineProperty(navigator, 'platform', {
                value: 'MacIntel',
                configurable: true,
            })
            cleanup = KeyboardService.registerWorkflowStop(callback)

            // Act
            const event = new KeyboardEvent('keydown', {
                key: 'c',
                metaKey: true,
            })
            window.dispatchEvent(event)

            // Assert
            expect(callback).toHaveBeenCalledTimes(1)
        })

        test('should trigger callback on Ctrl+C on Windows/Linux', () => {
            // Arrange
            const callback = jest.fn()
            Object.defineProperty(navigator, 'platform', {
                value: 'Win32',
                configurable: true,
            })
            cleanup = KeyboardService.registerWorkflowStop(callback)

            // Act
            const event = new KeyboardEvent('keydown', {
                key: 'c',
                ctrlKey: true,
            })
            window.dispatchEvent(event)

            // Assert
            expect(callback).toHaveBeenCalledTimes(1)
        })

        test('should trigger callback on uppercase C', () => {
            // Arrange
            const callback = jest.fn()
            Object.defineProperty(navigator, 'platform', {
                value: 'MacIntel',
                configurable: true,
            })
            cleanup = KeyboardService.registerWorkflowStop(callback)

            // Act
            const event = new KeyboardEvent('keydown', {
                key: 'C',
                metaKey: true,
            })
            window.dispatchEvent(event)

            // Assert
            expect(callback).toHaveBeenCalledTimes(1)
        })

        test('should not trigger callback without modifier key', () => {
            // Arrange
            const callback = jest.fn()
            Object.defineProperty(navigator, 'platform', {
                value: 'MacIntel',
                configurable: true,
            })
            cleanup = KeyboardService.registerWorkflowStop(callback)

            // Act
            const event = new KeyboardEvent('keydown', {
                key: 'c',
            })
            window.dispatchEvent(event)

            // Assert
            expect(callback).not.toHaveBeenCalled()
        })

        test('should not trigger callback on other keys', () => {
            // Arrange
            const callback = jest.fn()
            Object.defineProperty(navigator, 'platform', {
                value: 'MacIntel',
                configurable: true,
            })
            cleanup = KeyboardService.registerWorkflowStop(callback)

            // Act
            const event = new KeyboardEvent('keydown', {
                key: 'v',
                metaKey: true,
            })
            window.dispatchEvent(event)

            // Assert
            expect(callback).not.toHaveBeenCalled()
        })

        test('should prevent default behavior', () => {
            // Arrange
            const callback = jest.fn()
            Object.defineProperty(navigator, 'platform', {
                value: 'MacIntel',
                configurable: true,
            })
            cleanup = KeyboardService.registerWorkflowStop(callback)

            // Act
            const event = new KeyboardEvent('keydown', {
                key: 'c',
                metaKey: true,
                cancelable: true,
            })
            const preventDefaultSpy = jest.spyOn(event, 'preventDefault')
            window.dispatchEvent(event)

            // Assert
            expect(preventDefaultSpy).toHaveBeenCalled()
        })

        test('cleanup function should remove event listener', () => {
            // Arrange
            const callback = jest.fn()
            Object.defineProperty(navigator, 'platform', {
                value: 'MacIntel',
                configurable: true,
            })
            cleanup = KeyboardService.registerWorkflowStop(callback)

            // Act - cleanup
            cleanup()
            cleanup = null

            // Try to trigger event after cleanup
            const event = new KeyboardEvent('keydown', {
                key: 'c',
                metaKey: true,
            })
            window.dispatchEvent(event)

            // Assert
            expect(callback).not.toHaveBeenCalled()
        })
    })
})
