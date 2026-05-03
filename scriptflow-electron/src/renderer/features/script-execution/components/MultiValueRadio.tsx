import type { MultiValueEnvVariable } from '../../../../renderer.d'
import { cn } from '@/lib/utils'

interface MultiValueRadioProps {
    name: string
    value: MultiValueEnvVariable
    onChange: (newValue: MultiValueEnvVariable) => void
}

export function MultiValueRadio({ name, value, onChange }: MultiValueRadioProps) {
    const handleValueChange = (index: number) => {
        if (index !== value.defaultValue) {
            onChange({
                ...value,
                defaultValue: index,
            })
        }
    }

    return (
        <div className="flex items-center gap-2 px-2 py-1 bg-secondary rounded text-xs border">
            <span className="font-medium text-secondary-foreground">{name}</span>
            <span className="text-muted-foreground">=</span>
            <div className="flex items-center rounded-md border overflow-hidden">
                {value.values.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => handleValueChange(index)}
                        className={cn(
                            'px-2 py-0.5 text-xs transition-colors',
                            index === value.defaultValue
                                ? 'bg-primary text-primary-foreground font-medium'
                                : 'bg-transparent text-secondary-foreground hover:bg-accent',
                            index > 0 && 'border-l',
                        )}
                    >
                        {option}
                    </button>
                ))}
            </div>
        </div>
    )
}
