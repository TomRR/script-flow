import { ScriptEntryStatusService } from './script-entry-status-service'

describe('ScriptEntryStatusService Integration', () => {
    describe('Execution Status Integration', () => {
        test('should validate all execution statuses have proper styling', () => {
            const statuses = ['idle', 'running', 'success', 'failed', 'condition_failed'] as const

            statuses.forEach((status) => {
                const styles = ScriptEntryStatusService.getStatusStyles(status)

                // Validate that each status has the required style properties
                expect(styles).toHaveProperty('container')
                expect(styles).toHaveProperty('badge')
                expect(styles).toHaveProperty('line')
                expect(styles).toHaveProperty('bar')

                // Validate container styles are strings
                expect(typeof styles.container).toBe('string')

                // Validate specific status indicators
                if (status === 'running') {
                    expect(styles.container).toContain('border-amber-400/40')
                    expect(styles.container).toContain('animate-gradient-shift')
                } else if (status === 'success') {
                    expect(styles.container).toContain('border-emerald-400/40')
                    expect(styles.container).toContain('bg-emerald-500/5')
                } else if (status === 'failed') {
                    expect(styles.container).toContain('border-red-400/40')
                    expect(styles.container).toContain('bg-red-500/5')
                } else if (status === 'condition_failed') {
                    expect(styles.container).toContain('border-yellow-400/50')
                    expect(styles.container).toContain('bg-yellow-500/5')
                } else if (status === 'idle') {
                    expect(styles.container).toBe('')
                }
            })
        })

        test('should properly merge base classes with status classes', () => {
            const baseClasses = 'flex flex-col gap-3 p-4 border rounded-md bg-card shadow-sm'

            // Test each status merges correctly
            const testCases = [
                { status: 'idle' as const, expectedContains: [baseClasses] },
                { status: 'running' as const, expectedContains: ['border-amber-400/40', 'ring-1 ring-amber-400/30'] },
                { status: 'success' as const, expectedContains: ['border-emerald-400/40', 'bg-emerald-500/5'] },
                { status: 'failed' as const, expectedContains: ['border-red-400/40', 'bg-red-500/5'] },
                { status: 'condition_failed' as const, expectedContains: ['border-yellow-400/50', 'bg-yellow-500/5'] },
            ]

            testCases.forEach(({ status, expectedContains }) => {
                const result = ScriptEntryStatusService.getContainerClasses(baseClasses, status)

                // Should always contain the base structure
                expect(result).toContain('flex flex-col gap-3 p-4 border rounded-md')
                expect(result).toContain('shadow-sm')

                // Should contain status-specific classes
                expectedContains.forEach((expectedClass) => {
                    if (expectedClass === baseClasses) {
                        // For idle, check that result contains the essential base classes
                        expect(result).toContain('flex flex-col gap-3 p-4 border rounded-md')
                        expect(result).toContain('shadow-sm')
                    } else {
                        expect(result).toContain(expectedClass)
                    }
                })
            })
        })

        test('should identify visual indicator statuses correctly', () => {
            const visualStatuses = ['running', 'success', 'failed', 'condition_failed'] as const
            const nonVisualStatuses = ['idle'] as const

            visualStatuses.forEach((status) => {
                expect(ScriptEntryStatusService.hasVisualIndicators(status)).toBe(true)
            })

            nonVisualStatuses.forEach((status) => {
                expect(ScriptEntryStatusService.hasVisualIndicators(status)).toBe(false)
            })
        })

        test('should provide meaningful status descriptions', () => {
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
                expect(description.length).toBeGreaterThan(0)
            })
        })
    })

    describe('Regression Prevention', () => {
        test('should prevent missing container styles for active statuses', () => {
            const activeStatuses = ['running', 'success', 'failed', 'condition_failed'] as const

            activeStatuses.forEach((status) => {
                const styles = ScriptEntryStatusService.getStatusStyles(status)

                // Container should not be empty for active statuses
                expect(styles.container.length).toBeGreaterThan(0)

                // Should contain visual indicators
                expect(styles.container).toMatch(/border-\w+-\d+\/\d+/)
            })
        })

        test('should ensure running status has animation classes', () => {
            const styles = ScriptEntryStatusService.getStatusStyles('running')

            expect(styles.container).toContain('after:animate-gradient-shift')
            expect(styles.badge).toContain('animate-gradient-shift')
            expect(styles.bar).toContain('animate-gradient-shift')
        })

        test('should validate color scheme consistency', () => {
            const colorSchemes = {
                success: ['emerald'],
                failed: ['red'],
                condition_failed: ['yellow'],
                running: ['amber', 'emerald'], // Gradient uses both
            }

            Object.entries(colorSchemes).forEach(([status, expectedColors]) => {
                const styles = ScriptEntryStatusService.getStatusStyles(status as any)

                expectedColors.forEach((color) => {
                    expect(styles.container).toContain(color)
                })
            })
        })
    })
})
