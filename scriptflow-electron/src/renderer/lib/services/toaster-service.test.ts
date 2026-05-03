import { ToasterService, TOASTER_CONFIG } from './toaster-service'
import { toast } from 'sonner'

jest.mock('sonner', () => ({
    toast: {
        error: jest.fn(),
        warning: jest.fn(),
        success: jest.fn(),
    },
}))

describe('ToasterService', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('TOASTER_CONFIG', () => {
        test('should export configuration constants', () => {
            expect(TOASTER_CONFIG.DURATION_ERROR).toBe(4000)
            expect(TOASTER_CONFIG.DURATION_WARNING).toBe(4000)
            expect(TOASTER_CONFIG.DURATION_SUCCESS).toBe(3000)
            expect(TOASTER_CONFIG.DELAY_SHOW).toBe(100)
        })
    })

    describe('showError', () => {
        test('should call toast.error with message and styling options', () => {
            // Arrange
            const message = 'Test error message'

            // Act
            ToasterService.showError(message)

            // Assert
            expect(toast.error).toHaveBeenCalledWith(message, {
                duration: TOASTER_CONFIG.DURATION_ERROR,
                style: {
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                },
            })
        })

        test('should use failed script colors for error toast', () => {
            // Arrange
            const message = 'Workflow failed'

            // Act
            ToasterService.showError(message)

            // Assert
            const callArgs = (toast.error as jest.Mock).mock.calls[0][1]
            expect(callArgs.style.background).toBe('#fef2f2') // red-50
            expect(callArgs.style.border).toBe('1px solid #fecaca') // red-200
            expect(callArgs.style.color).toBe('#dc2626') // red-600
        })

        test('should set duration to 4000ms', () => {
            // Arrange
            const message = 'Test'

            // Act
            ToasterService.showError(message)

            // Assert
            const callArgs = (toast.error as jest.Mock).mock.calls[0][1]
            expect(callArgs.duration).toBe(4000)
        })
    })

    describe('showWarning', () => {
        test('should call toast.warning with message and styling options', () => {
            // Arrange
            const message = 'Condition not met'

            // Act
            ToasterService.showWarning(message)

            // Assert
            expect(toast.warning).toHaveBeenCalledWith(message, {
                duration: TOASTER_CONFIG.DURATION_WARNING,
                style: {
                    background: '#fffbeb',
                    border: '1px solid #fcd34d',
                    color: '#d97706',
                },
            })
        })

        test('should use amber colors for warning toast', () => {
            // Arrange
            const message = 'Warning message'

            // Act
            ToasterService.showWarning(message)

            // Assert
            const callArgs = (toast.warning as jest.Mock).mock.calls[0][1]
            expect(callArgs.style.background).toBe('#fffbeb') // amber-50
            expect(callArgs.style.border).toBe('1px solid #fcd34d') // amber-300
            expect(callArgs.style.color).toBe('#d97706') // amber-600
        })

        test('should set duration to 4000ms', () => {
            // Arrange
            const message = 'Test warning'

            // Act
            ToasterService.showWarning(message)

            // Assert
            const callArgs = (toast.warning as jest.Mock).mock.calls[0][1]
            expect(callArgs.duration).toBe(4000)
        })
    })

    describe('showSuccess', () => {
        test('should call toast.success with message and styling options', () => {
            // Arrange
            const message = 'Workflow completed'

            // Act
            ToasterService.showSuccess(message)

            // Assert
            expect(toast.success).toHaveBeenCalledWith(message, {
                duration: TOASTER_CONFIG.DURATION_SUCCESS,
                style: {
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    color: '#16a34a',
                },
            })
        })

        test('should use green colors for success toast', () => {
            // Arrange
            const message = 'Success message'

            // Act
            ToasterService.showSuccess(message)

            // Assert
            const callArgs = (toast.success as jest.Mock).mock.calls[0][1]
            expect(callArgs.style.background).toBe('#f0fdf4') // green-50
            expect(callArgs.style.border).toBe('1px solid #86efac') // green-300
            expect(callArgs.style.color).toBe('#16a34a') // green-600
        })

        test('should set duration to 3000ms', () => {
            // Arrange
            const message = 'Test success'

            // Act
            ToasterService.showSuccess(message)

            // Assert
            const callArgs = (toast.success as jest.Mock).mock.calls[0][1]
            expect(callArgs.duration).toBe(3000)
        })
    })
})
