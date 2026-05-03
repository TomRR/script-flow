import type { EnvValue, StaticEnvValue, MultiValueEnvVariable } from '../../../../renderer.d'

export class MultiValueVariableService {
    static isStatic(value: EnvValue | string | undefined): value is StaticEnvValue {
        if (value === undefined) return false
        if (typeof value === 'string') return false
        return value.type === 'static'
    }

    static isMultiValue(value: EnvValue | string | undefined): value is MultiValueEnvVariable {
        if (value === undefined) return false
        if (typeof value === 'string') return false
        return value.type === 'multi-value'
    }

    static isEnvValue(value: unknown): value is EnvValue {
        if (value === undefined || value === null) return false
        if (typeof value !== 'object') return false

        const obj = value as Record<string, unknown>
        if (obj.type === 'static') {
            return typeof obj.value === 'string'
        }
        if (obj.type === 'multi-value') {
            return (
                (obj.display === 'dropdown' || obj.display === 'radio') &&
                Array.isArray(obj.values) &&
                obj.values.every((v) => typeof v === 'string') &&
                typeof obj.defaultValue === 'number'
            )
        }
        return false
    }

    static getDisplayValue(value: EnvValue | string | undefined): string {
        if (value === undefined) return ''
        if (typeof value === 'string') return value
        if (this.isStatic(value)) {
            return value.value
        }
        if (this.isMultiValue(value)) {
            if (value.values.length > 3) {
                return `[${value.values.length} options]`
            }
            return `[${value.values.join(', ')}]`
        }
        return ''
    }

    static getCurrentValue(value: EnvValue | string | undefined): string {
        if (value === undefined) return ''
        if (typeof value === 'string') return value
        if (this.isStatic(value)) {
            return value.value
        }
        if (this.isMultiValue(value)) {
            return value.values[value.defaultValue] ?? ''
        }
        return ''
    }

    static createStatic(value: string): StaticEnvValue {
        return {
            type: 'static',
            value,
        }
    }

    static createMultiValue(
        display: 'dropdown' | 'radio',
        values: string[],
        defaultValue: number,
    ): MultiValueEnvVariable {
        return {
            type: 'multi-value',
            display,
            values,
            defaultValue,
        }
    }

    static validateMultiValue(values: string[]): boolean {
        return values.length >= 2 && values.every((v) => v.trim().length > 0)
    }

    static convertLegacyEnv(env: Record<string, string>): Record<string, EnvValue> {
        const result: Record<string, EnvValue> = {}
        for (const [key, value] of Object.entries(env)) {
            result[key] = this.createStatic(value)
        }
        return result
    }

    static setDefaultValue(value: MultiValueEnvVariable, index: number): MultiValueEnvVariable {
        if (index < 0 || index >= value.values.length) {
            return value
        }
        return {
            ...value,
            defaultValue: index,
        }
    }

    static updateMultiValueAtIndex(
        value: MultiValueEnvVariable,
        index: number,
        newValue: string,
    ): MultiValueEnvVariable {
        if (index < 0 || index >= value.values.length) {
            return value
        }
        const newValues = [...value.values]
        newValues[index] = newValue
        return {
            ...value,
            values: newValues,
        }
    }

    static addValueToMultiValue(value: MultiValueEnvVariable, newValue: string): MultiValueEnvVariable {
        return {
            ...value,
            values: [...value.values, newValue],
        }
    }

    static removeValueFromMultiValue(value: MultiValueEnvVariable, index: number): MultiValueEnvVariable {
        if (value.values.length <= 2) {
            return value
        }
        const newValues = value.values.filter((_, i) => i !== index)
        let newDefaultValue = value.defaultValue
        if (index === value.defaultValue) {
            newDefaultValue = 0
        } else if (index < value.defaultValue) {
            newDefaultValue = value.defaultValue - 1
        }
        if (newDefaultValue >= newValues.length) {
            newDefaultValue = newValues.length - 1
        }
        return {
            ...value,
            values: newValues,
            defaultValue: newDefaultValue,
        }
    }
}
