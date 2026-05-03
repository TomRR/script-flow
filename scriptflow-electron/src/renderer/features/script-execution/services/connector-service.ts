import type { ConditionConfig, ConditionType } from '../../../../main/vault-handler'

/**
 * Service for evaluating script output conditions.
 * Provides utilities for checking if script output meets configured conditions.
 * All conditions are checked against the LAST line of the output only.
 */
export class ConnectorService {
    /**
     * Extracts the last non-empty line from a multiline string.
     * Returns an empty string if there are no non-empty lines.
     */
    static getLastLine(output: string): string {
        // Split by newline characters (handles both \n and \r\n)
        const lines = output.split(/\r?\n/)

        // Find the last non-empty line (trim whitespace)
        for (let i = lines.length - 1; i >= 0; i--) {
            const trimmedLine = lines[i].trim()
            if (trimmedLine.length > 0) {
                return trimmedLine
            }
        }

        // If no non-empty lines found, return empty string
        return ''
    }

    /**
     * Checks if the output meets the configured condition.
     * Returns true if the condition is disabled or if the output matches the condition.
     * Only checks against the LAST line of the output.
     */
    static checkCondition(output: string, condition: ConditionConfig): boolean {
        if (!condition.enabled) {
            return true
        }

        const value = condition.value
        const lastLine = this.getLastLine(output)

        switch (condition.type) {
            case 'contains':
                return lastLine.includes(value)
            case 'equals':
                return lastLine === value.trim()
            case 'startsWith':
                return lastLine.startsWith(value)
            case 'endsWith':
                return lastLine.endsWith(value)
            default:
                // For unknown condition types, default to passing
                return true
        }
    }

    /**
     * Checks if a value contains the expected substring.
     * Case-sensitive. Only checks the last line of the output.
     */
    static checkContains(output: string, expectedValue: string): boolean {
        const lastLine = this.getLastLine(output)
        return lastLine.includes(expectedValue)
    }

    /**
     * Checks if the output equals the expected value exactly.
     * Trims whitespace from the expected value before comparison.
     * Only checks the last line of the output.
     */
    static checkEquals(output: string, expectedValue: string): boolean {
        const lastLine = this.getLastLine(output)
        return lastLine === expectedValue.trim()
    }

    /**
     * Checks if the output starts with the expected value.
     * Only checks the last line of the output.
     */
    static checkStartsWith(output: string, expectedValue: string): boolean {
        const lastLine = this.getLastLine(output)
        return lastLine.startsWith(expectedValue)
    }

    /**
     * Checks if the output ends with the expected value.
     * Only checks the last line of the output.
     */
    static checkEndsWith(output: string, expectedValue: string): boolean {
        const lastLine = this.getLastLine(output)
        return lastLine.endsWith(expectedValue)
    }

    /**
     * Validates if a string is a valid environment variable name.
     * Must start with letter or underscore, followed by letters, numbers, or underscores.
     */
    static isValidEnvVarName(name: string): boolean {
        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
    }

    /**
     * Gets a human-readable label for a condition type.
     */
    static getConditionLabel(type: ConditionType): string {
        const labels: Record<ConditionType, string> = {
            contains: 'Contains',
            equals: 'Equals',
            startsWith: 'Starts With',
            endsWith: 'Ends With',
        }
        return labels[type]
    }

    /**
     * Creates a default disabled condition configuration.
     */
    static createDefaultCondition(): ConditionConfig {
        return {
            type: 'contains',
            value: '',
            enabled: false,
        }
    }

    /**
     * Checks if the condition is valid and can be used for evaluation.
     * A valid condition must be enabled and have a non-empty value.
     */
    static isValidCondition(condition: ConditionConfig): boolean {
        return condition.enabled && condition.value.length > 0
    }
}
