import { MultiValueVariableService } from '../services/multi-value-variable-service'

describe('MultiValueVariableService', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('createStatic', () => {
        test('creates a static env value with type and value', () => {
            const result = MultiValueVariableService.createStatic('test-value')

            expect(result).toEqual({ type: 'static', value: 'test-value' })
        })
    })

    describe('createMultiValue', () => {
        test('creates a multi-value env variable', () => {
            const result = MultiValueVariableService.createMultiValue(
                'dropdown',
                ['Option 1', 'Option 2', 'Option 3'],
                0,
            )

            expect(result).toEqual({
                type: 'multi-value',
                display: 'dropdown',
                values: ['Option 1', 'Option 2', 'Option 3'],
                defaultValue: 0,
            })
        })

        test('creates multi-value with radio display', () => {
            const result = MultiValueVariableService.createMultiValue('radio', ['A', 'B'], 1)

            expect(result.display).toBe('radio')
            expect(result.defaultValue).toBe(1)
        })
    })

    describe('isStatic', () => {
        test('returns true for static env value', () => {
            const staticVar = MultiValueVariableService.createStatic('test')
            expect(MultiValueVariableService.isStatic(staticVar)).toBe(true)
        })

        test('returns false for multi-value env variable', () => {
            const multiVar = MultiValueVariableService.createMultiValue('dropdown', ['A', 'B'], 0)
            expect(MultiValueVariableService.isStatic(multiVar)).toBe(false)
        })

        test('returns false for undefined', () => {
            expect(MultiValueVariableService.isStatic(undefined)).toBe(false)
        })

        test('returns false for plain string', () => {
            expect(MultiValueVariableService.isStatic('plain-string')).toBe(false)
        })
    })

    describe('isMultiValue', () => {
        test('returns true for multi-value env variable', () => {
            const multiVar = MultiValueVariableService.createMultiValue('dropdown', ['A', 'B'], 0)
            expect(MultiValueVariableService.isMultiValue(multiVar)).toBe(true)
        })

        test('returns false for static env value', () => {
            const staticVar = MultiValueVariableService.createStatic('test')
            expect(MultiValueVariableService.isMultiValue(staticVar)).toBe(false)
        })

        test('returns false for undefined', () => {
            expect(MultiValueVariableService.isMultiValue(undefined)).toBe(false)
        })

        test('returns false for plain string', () => {
            expect(MultiValueVariableService.isMultiValue('plain-string')).toBe(false)
        })
    })

    describe('getCurrentValue', () => {
        test('returns value for static env value', () => {
            const staticVar = MultiValueVariableService.createStatic('test-value')
            expect(MultiValueVariableService.getCurrentValue(staticVar)).toBe('test-value')
        })

        test('returns selected value for multi-value env variable', () => {
            const multiVar = MultiValueVariableService.createMultiValue(
                'dropdown',
                ['Option 1', 'Option 2', 'Option 3'],
                1,
            )
            expect(MultiValueVariableService.getCurrentValue(multiVar)).toBe('Option 2')
        })

        test('returns empty string for undefined', () => {
            expect(MultiValueVariableService.getCurrentValue(undefined)).toBe('')
        })

        test('returns plain string as-is', () => {
            expect(MultiValueVariableService.getCurrentValue('plain-string')).toBe('plain-string')
        })
    })

    describe('getDisplayValue', () => {
        test('returns value for static env value', () => {
            const staticVar = MultiValueVariableService.createStatic('test-value')
            expect(MultiValueVariableService.getDisplayValue(staticVar)).toBe('test-value')
        })

        test('returns bracketed values for multi-value with 3 or fewer options', () => {
            const multiVar = MultiValueVariableService.createMultiValue(
                'dropdown',
                ['Option 1', 'Option 2', 'Option 3'],
                0,
            )
            expect(MultiValueVariableService.getDisplayValue(multiVar)).toBe('[Option 1, Option 2, Option 3]')
        })

        test('returns count for multi-value with more than 3 options', () => {
            const multiVar = MultiValueVariableService.createMultiValue('dropdown', ['A', 'B', 'C', 'D', 'E'], 0)
            expect(MultiValueVariableService.getDisplayValue(multiVar)).toBe('[5 options]')
        })

        test('returns empty string for undefined', () => {
            expect(MultiValueVariableService.getDisplayValue(undefined)).toBe('')
        })

        test('returns plain string as-is', () => {
            expect(MultiValueVariableService.getDisplayValue('plain-string')).toBe('plain-string')
        })
    })

    describe('validateMultiValue', () => {
        test('returns true for valid multi-value with 2+ non-empty values', () => {
            expect(MultiValueVariableService.validateMultiValue(['A', 'B'])).toBe(true)
            expect(MultiValueVariableService.validateMultiValue(['A', 'B', 'C'])).toBe(true)
        })

        test('returns false for single value', () => {
            expect(MultiValueVariableService.validateMultiValue(['A'])).toBe(false)
        })

        test('returns false for empty values', () => {
            expect(MultiValueVariableService.validateMultiValue([''])).toBe(false)
            expect(MultiValueVariableService.validateMultiValue(['A', ''])).toBe(false)
        })

        test('returns false for whitespace-only values', () => {
            expect(MultiValueVariableService.validateMultiValue(['A', '   '])).toBe(false)
        })
    })

    describe('convertLegacyEnv', () => {
        test('converts plain string env to EnvValue objects', () => {
            const env = { KEY1: 'value1', KEY2: 'value2' }
            const result = MultiValueVariableService.convertLegacyEnv(env)

            expect(result).toEqual({
                KEY1: { type: 'static', value: 'value1' },
                KEY2: { type: 'static', value: 'value2' },
            })
        })
    })

    describe('setDefaultValue', () => {
        test('sets new default value within bounds', () => {
            const multiVar = MultiValueVariableService.createMultiValue('dropdown', ['A', 'B', 'C'], 0)
            const result = MultiValueVariableService.setDefaultValue(multiVar, 2)

            expect(result.defaultValue).toBe(2)
        })

        test('returns original value when index out of bounds', () => {
            const multiVar = MultiValueVariableService.createMultiValue('dropdown', ['A', 'B', 'C'], 0)
            const result = MultiValueVariableService.setDefaultValue(multiVar, 10)

            expect(result.defaultValue).toBe(0)
        })
    })

    describe('updateMultiValueAtIndex', () => {
        test('updates value at specific index', () => {
            const multiVar = MultiValueVariableService.createMultiValue('dropdown', ['A', 'B', 'C'], 0)
            const result = MultiValueVariableService.updateMultiValueAtIndex(multiVar, 1, 'X')

            expect(result.values).toEqual(['A', 'X', 'C'])
        })

        test('returns original when index out of bounds', () => {
            const multiVar = MultiValueVariableService.createMultiValue('dropdown', ['A', 'B', 'C'], 0)
            const result = MultiValueVariableService.updateMultiValueAtIndex(multiVar, 10, 'X')

            expect(result.values).toEqual(['A', 'B', 'C'])
        })
    })

    describe('addValueToMultiValue', () => {
        test('adds new value to end of list', () => {
            const multiVar = MultiValueVariableService.createMultiValue('dropdown', ['A', 'B'], 0)
            const result = MultiValueVariableService.addValueToMultiValue(multiVar, 'C')

            expect(result.values).toEqual(['A', 'B', 'C'])
        })
    })

    describe('removeValueFromMultiValue', () => {
        test('removes value at index', () => {
            const multiVar = MultiValueVariableService.createMultiValue('dropdown', ['A', 'B', 'C'], 0)
            const result = MultiValueVariableService.removeValueFromMultiValue(multiVar, 1)

            expect(result.values).toEqual(['A', 'C'])
        })

        test('returns original when only 2 values remain', () => {
            const multiVar = MultiValueVariableService.createMultiValue('dropdown', ['A', 'B'], 0)
            const result = MultiValueVariableService.removeValueFromMultiValue(multiVar, 0)

            expect(result.values).toEqual(['A', 'B'])
        })

        test('adjusts default value when removing default index', () => {
            const multiVar = MultiValueVariableService.createMultiValue('dropdown', ['A', 'B', 'C'], 1)
            const result = MultiValueVariableService.removeValueFromMultiValue(multiVar, 1)

            expect(result.defaultValue).toBe(0)
        })
    })

    describe('isEnvValue', () => {
        test('returns true for valid static EnvValue', () => {
            expect(MultiValueVariableService.isEnvValue({ type: 'static', value: 'test' })).toBe(true)
        })

        test('returns true for valid multi-value EnvValue', () => {
            expect(
                MultiValueVariableService.isEnvValue({
                    type: 'multi-value',
                    display: 'dropdown',
                    values: ['A', 'B'],
                    defaultValue: 0,
                }),
            ).toBe(true)
        })

        test('returns false for null', () => {
            expect(MultiValueVariableService.isEnvValue(null)).toBe(false)
        })

        test('returns false for undefined', () => {
            expect(MultiValueVariableService.isEnvValue(undefined)).toBe(false)
        })

        test('returns false for plain string', () => {
            expect(MultiValueVariableService.isEnvValue('plain-string')).toBe(false)
        })

        test('returns false for invalid multi-value display type', () => {
            expect(
                MultiValueVariableService.isEnvValue({
                    type: 'multi-value',
                    display: 'invalid',
                    values: ['A', 'B'],
                    defaultValue: 0,
                }),
            ).toBe(false)
        })
    })
})
