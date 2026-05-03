import { ConnectorService } from './connector-service'
import type { ConditionConfig, ConditionType } from '../../../../main/vault-handler'

describe('ConnectorService', () => {
    describe('checkCondition', () => {
        describe('disabled condition', () => {
            it('should return true when condition is disabled', () => {
                const condition: ConditionConfig = {
                    type: 'contains',
                    value: 'test',
                    enabled: false,
                }
                expect(ConnectorService.checkCondition('any output', condition)).toBe(true)
            })
        })

        describe('contains condition', () => {
            it('should return true when output contains the value', () => {
                const condition: ConditionConfig = {
                    type: 'contains',
                    value: 'world',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('hello world', condition)).toBe(true)
            })

            it('should return false when output does not contain the value', () => {
                const condition: ConditionConfig = {
                    type: 'contains',
                    value: 'foo',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('hello world', condition)).toBe(false)
            })

            it('should handle substring matching', () => {
                const condition: ConditionConfig = {
                    type: 'contains',
                    value: 'ell',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('hello', condition)).toBe(true)
            })

            it('should be case-sensitive', () => {
                const condition: ConditionConfig = {
                    type: 'contains',
                    value: 'WORLD',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('hello world', condition)).toBe(false)
                expect(ConnectorService.checkCondition('hello WORLD', condition)).toBe(true)
            })

            it('should handle empty value', () => {
                const condition: ConditionConfig = {
                    type: 'contains',
                    value: '',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('any output', condition)).toBe(true)
            })

            it('should handle empty output', () => {
                const condition: ConditionConfig = {
                    type: 'contains',
                    value: 'test',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('', condition)).toBe(false)
            })

            it('should handle whitespace', () => {
                const condition: ConditionConfig = {
                    type: 'contains',
                    value: 'hello world',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('  hello world  ', condition)).toBe(true)
            })
        })

        describe('equals condition', () => {
            it('should return true when output equals the value', () => {
                const condition: ConditionConfig = {
                    type: 'equals',
                    value: 'match',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('match', condition)).toBe(true)
            })

            it('should return false when output does not equal the value', () => {
                const condition: ConditionConfig = {
                    type: 'equals',
                    value: 'match',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('different', condition)).toBe(false)
            })

            it('should trim whitespace from both output and value', () => {
                const condition: ConditionConfig = {
                    type: 'equals',
                    value: '  match  ',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('match', condition)).toBe(true)
                expect(ConnectorService.checkCondition('  match  ', condition)).toBe(true)
            })

            it('should be case-sensitive', () => {
                const condition: ConditionConfig = {
                    type: 'equals',
                    value: 'MATCH',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('match', condition)).toBe(false)
            })

            it('should handle empty strings', () => {
                const condition: ConditionConfig = {
                    type: 'equals',
                    value: '',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('', condition)).toBe(true)
                expect(ConnectorService.checkCondition('   ', condition)).toBe(true)
            })

            it('should handle special characters', () => {
                const condition: ConditionConfig = {
                    type: 'equals',
                    value: 'hello@world.com',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('hello@world.com', condition)).toBe(true)
            })
        })

        describe('startsWith condition', () => {
            it('should return true when output starts with the value', () => {
                const condition: ConditionConfig = {
                    type: 'startsWith',
                    value: 'start',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('start of line', condition)).toBe(true)
            })

            it('should return false when output does not start with the value', () => {
                const condition: ConditionConfig = {
                    type: 'startsWith',
                    value: 'start',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('end of line', condition)).toBe(false)
            })

            it('should trim leading whitespace from output', () => {
                const condition: ConditionConfig = {
                    type: 'startsWith',
                    value: 'start',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('  start of line', condition)).toBe(true)
            })

            it('should be case-sensitive', () => {
                const condition: ConditionConfig = {
                    type: 'startsWith',
                    value: 'START',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('start of line', condition)).toBe(false)
            })

            it('should handle empty value', () => {
                const condition: ConditionConfig = {
                    type: 'startsWith',
                    value: '',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('any output', condition)).toBe(true)
            })

            it('should handle exact match', () => {
                const condition: ConditionConfig = {
                    type: 'startsWith',
                    value: 'exact',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('exact', condition)).toBe(true)
            })

            it('should only check the last line', () => {
                const condition: ConditionConfig = {
                    type: 'startsWith',
                    value: 'end',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('end', condition)).toBe(true)
                expect(ConnectorService.checkCondition('prefix\nend', condition)).toBe(true)
                expect(ConnectorService.checkCondition('end\nmore text', condition)).toBe(false)
                expect(ConnectorService.checkCondition('the end', condition)).toBe(false)
            })
        })

        describe('endsWith condition', () => {
            it('should return true when output ends with the value', () => {
                const condition: ConditionConfig = {
                    type: 'endsWith',
                    value: 'end',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('line end', condition)).toBe(true)
            })

            it('should return false when output does not end with the value', () => {
                const condition: ConditionConfig = {
                    type: 'endsWith',
                    value: 'end',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('line start', condition)).toBe(false)
            })

            it('should trim trailing whitespace from output', () => {
                const condition: ConditionConfig = {
                    type: 'endsWith',
                    value: 'end',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('line end  ', condition)).toBe(true)
            })

            it('should be case-sensitive', () => {
                const condition: ConditionConfig = {
                    type: 'endsWith',
                    value: 'END',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('line end', condition)).toBe(false)
            })

            it('should handle empty value', () => {
                const condition: ConditionConfig = {
                    type: 'endsWith',
                    value: '',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('any output', condition)).toBe(true)
            })

            it('should handle exact match', () => {
                const condition: ConditionConfig = {
                    type: 'endsWith',
                    value: 'exact',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('exact', condition)).toBe(true)
            })

            it('should only check the last line', () => {
                const condition: ConditionConfig = {
                    type: 'endsWith',
                    value: 'start',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('  start', condition)).toBe(true)
                expect(ConnectorService.checkCondition('prefix\n  start', condition)).toBe(true)
                expect(ConnectorService.checkCondition('starting', condition)).toBe(false)
                expect(ConnectorService.checkCondition('start\nsuffix', condition)).toBe(false)
            })
        })

        describe('unknown condition type', () => {
            it('should return true for unknown condition types', () => {
                const condition = {
                    type: 'unknown' as ConditionType,
                    value: 'test',
                    enabled: true,
                }
                expect(ConnectorService.checkCondition('any output', condition)).toBe(true)
            })
        })
    })

    describe('individual condition methods', () => {
        describe('checkContains', () => {
            it('should check if string contains substring', () => {
                expect(ConnectorService.checkContains('hello world', 'world')).toBe(true)
                expect(ConnectorService.checkContains('hello world', 'foo')).toBe(false)
            })
        })

        describe('checkEquals', () => {
            it('should check exact equality with trimming', () => {
                expect(ConnectorService.checkEquals('match', 'match')).toBe(true)
                expect(ConnectorService.checkEquals('  match  ', 'match')).toBe(true)
                expect(ConnectorService.checkEquals('match', 'different')).toBe(false)
            })
        })

        describe('checkStartsWith', () => {
            it('should check start with trimStart', () => {
                expect(ConnectorService.checkStartsWith('hello world', 'hello')).toBe(true)
                expect(ConnectorService.checkStartsWith('  hello world', 'hello')).toBe(true)
                expect(ConnectorService.checkStartsWith('world hello', 'hello')).toBe(false)
            })
        })

        describe('checkEndsWith', () => {
            it('should check end with trimEnd', () => {
                expect(ConnectorService.checkEndsWith('hello world', 'world')).toBe(true)
                expect(ConnectorService.checkEndsWith('hello world  ', 'world')).toBe(true)
                expect(ConnectorService.checkEndsWith('world hello', 'world')).toBe(false)
            })
        })
    })

    describe('isValidEnvVarName', () => {
        it('should validate correct environment variable names', () => {
            expect(ConnectorService.isValidEnvVarName('MY_VAR')).toBe(true)
            expect(ConnectorService.isValidEnvVarName('_PRIVATE')).toBe(true)
            expect(ConnectorService.isValidEnvVarName('var123')).toBe(true)
            expect(ConnectorService.isValidEnvVarName('ABC')).toBe(true)
        })

        it('should reject invalid environment variable names', () => {
            expect(ConnectorService.isValidEnvVarName('123VAR')).toBe(false)
            expect(ConnectorService.isValidEnvVarName('my-var')).toBe(false)
            expect(ConnectorService.isValidEnvVarName('my.var')).toBe(false)
            expect(ConnectorService.isValidEnvVarName('my var')).toBe(false)
            expect(ConnectorService.isValidEnvVarName('')).toBe(false)
        })

        it('should handle edge cases', () => {
            expect(ConnectorService.isValidEnvVarName('_')).toBe(true)
            expect(ConnectorService.isValidEnvVarName('a')).toBe(true)
            expect(ConnectorService.isValidEnvVarName('A')).toBe(true)
        })
    })

    describe('getConditionLabel', () => {
        it('should return correct labels for all condition types', () => {
            expect(ConnectorService.getConditionLabel('contains')).toBe('Contains')
            expect(ConnectorService.getConditionLabel('equals')).toBe('Equals')
            expect(ConnectorService.getConditionLabel('startsWith')).toBe('Starts With')
            expect(ConnectorService.getConditionLabel('endsWith')).toBe('Ends With')
        })
    })

    describe('createDefaultCondition', () => {
        it('should create a disabled contains condition', () => {
            const condition = ConnectorService.createDefaultCondition()
            expect(condition.type).toBe('contains')
            expect(condition.value).toBe('')
            expect(condition.enabled).toBe(false)
        })
    })

    describe('isValidCondition', () => {
        it('should return true for enabled condition with non-empty value', () => {
            const condition: ConditionConfig = {
                type: 'contains',
                value: 'test',
                enabled: true,
            }
            expect(ConnectorService.isValidCondition(condition)).toBe(true)
        })

        it('should return false for disabled condition', () => {
            const condition: ConditionConfig = {
                type: 'contains',
                value: 'test',
                enabled: false,
            }
            expect(ConnectorService.isValidCondition(condition)).toBe(false)
        })

        it('should return false for condition with empty value', () => {
            const condition: ConditionConfig = {
                type: 'contains',
                value: '',
                enabled: true,
            }
            expect(ConnectorService.isValidCondition(condition)).toBe(false)
        })
    })

    describe('real-world scenarios', () => {
        it('should handle SUCCESS message checking', () => {
            const condition: ConditionConfig = {
                type: 'contains',
                value: 'SUCCESS',
                enabled: true,
            }
            expect(ConnectorService.checkCondition('Operation completed: SUCCESS', condition)).toBe(true)
            expect(ConnectorService.checkCondition('Operation completed: success', condition)).toBe(false)
        })

        it('should handle error code checking', () => {
            const condition: ConditionConfig = {
                type: 'equals',
                value: '0',
                enabled: true,
            }
            expect(ConnectorService.checkCondition('0', condition)).toBe(true)
            expect(ConnectorService.checkCondition('  0  ', condition)).toBe(true)
            expect(ConnectorService.checkCondition('1', condition)).toBe(false)
        })

        it('should handle exit code checking', () => {
            const condition: ConditionConfig = {
                type: 'equals',
                value: 'exit code: 0',
                enabled: true,
            }
            expect(ConnectorService.checkCondition('exit code: 0', condition)).toBe(true)
        })

        it('should handle multiline output', () => {
            const condition: ConditionConfig = {
                type: 'contains',
                value: 'done',
                enabled: true,
            }
            const multilineOutput = `Starting process...
Processing step 1
Processing step 2
All done!`
            expect(ConnectorService.checkCondition(multilineOutput, condition)).toBe(true)
        })

        it('should handle JSON output', () => {
            const condition: ConditionConfig = {
                type: 'contains',
                value: '"status": "ok"',
                enabled: true,
            }
            const jsonOutput = '{"status": "ok", "data": []}'
            expect(ConnectorService.checkCondition(jsonOutput, condition)).toBe(true)
        })
    })
})
