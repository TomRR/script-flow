import { ScriptEntryStatusService } from './script-entry-status-service'

describe('ScriptEntryStatusService', () => {
    describe('getContainerClasses', () => {
        test('should return base classes for idle status', () => {
            const baseClasses = 'flex flex-col gap-3 p-4 border rounded-md bg-card shadow-sm'
            const result = ScriptEntryStatusService.getContainerClasses(baseClasses, 'idle')

            expect(result).toBe(baseClasses)
        })

        test('should add running status classes', () => {
            const baseClasses = 'flex flex-col gap-3 p-4 border rounded-md bg-card shadow-sm'
            const result = ScriptEntryStatusService.getContainerClasses(baseClasses, 'running')

            expect(result).toContain(baseClasses)
            expect(result).toContain('border-amber-400/40')
            expect(result).toContain('ring-1 ring-amber-400/30')
            expect(result).toContain('after:animate-gradient-shift')
        })

        test('should add success status classes', () => {
            const baseClasses = 'flex flex-col gap-3 p-4 border rounded-md bg-card shadow-sm'
            const result = ScriptEntryStatusService.getContainerClasses(baseClasses, 'success')

            expect(result).toContain('flex flex-col gap-3 p-4 border rounded-md shadow-sm')
            expect(result).toContain('border-emerald-400/40')
            expect(result).toContain('bg-emerald-500/5')
            expect(result).toContain('ring-1 ring-emerald-400/30')
        })

        test('should add failed status classes', () => {
            const baseClasses = 'flex flex-col gap-3 p-4 border rounded-md bg-card shadow-sm'
            const result = ScriptEntryStatusService.getContainerClasses(baseClasses, 'failed')

            expect(result).toContain('flex flex-col gap-3 p-4 border rounded-md shadow-sm')
            expect(result).toContain('border-red-400/40')
            expect(result).toContain('bg-red-500/5')
            expect(result).toContain('ring-1 ring-red-400/30')
        })

        test('should add condition_failed status classes', () => {
            const baseClasses = 'flex flex-col gap-3 p-4 border rounded-md bg-card shadow-sm'
            const result = ScriptEntryStatusService.getContainerClasses(baseClasses, 'condition_failed')

            expect(result).toContain('flex flex-col gap-3 p-4 border rounded-md shadow-sm')
            expect(result).toContain('border-yellow-400/50')
            expect(result).toContain('bg-yellow-500/5')
            expect(result).toContain('ring-1 ring-yellow-400/30')
        })
    })

    describe('getStatusStyles', () => {
        test('should return complete style object for each status', () => {
            const statuses = ['idle', 'running', 'success', 'failed', 'condition_failed'] as const

            statuses.forEach((status) => {
                const styles = ScriptEntryStatusService.getStatusStyles(status)

                expect(styles).toHaveProperty('container')
                expect(styles).toHaveProperty('badge')
                expect(styles).toHaveProperty('line')
                expect(styles).toHaveProperty('bar')

                expect(typeof styles.container).toBe('string')
                expect(typeof styles.badge).toBe('string')
                expect(typeof styles.line).toBe('string')
                expect(typeof styles.bar).toBe('string')
            })
        })

        test('should return empty container for idle status', () => {
            const styles = ScriptEntryStatusService.getStatusStyles('idle')
            expect(styles.container).toBe('')
        })

        test('should return animated container for running status', () => {
            const styles = ScriptEntryStatusService.getStatusStyles('running')
            expect(styles.container).toContain('after:animate-gradient-shift')
        })
    })

    describe('hasVisualIndicators', () => {
        test('should return false for idle status', () => {
            expect(ScriptEntryStatusService.hasVisualIndicators('idle')).toBe(false)
        })

        test('should return true for all non-idle statuses', () => {
            const activeStatuses = ['running', 'success', 'failed', 'condition_failed'] as const

            activeStatuses.forEach((status) => {
                expect(ScriptEntryStatusService.hasVisualIndicators(status)).toBe(true)
            })
        })
    })

    describe('getStatusDescription', () => {
        test('should return correct description for each status', () => {
            const descriptions = {
                idle: 'No execution activity',
                running: 'Script is currently executing',
                success: 'Script completed successfully',
                failed: 'Script execution failed',
                condition_failed: 'Script condition was not met',
            }

            Object.entries(descriptions).forEach(([status, expectedDescription]) => {
                const description = ScriptEntryStatusService.getStatusDescription(status as any)
                expect(description).toBe(expectedDescription)
            })
        })
    })
})
