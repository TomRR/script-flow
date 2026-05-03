import type { MultiValueEnvVariable } from '../../../../renderer.d'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface MultiValueDropdownProps {
    name: string
    value: MultiValueEnvVariable
    onChange: (newValue: MultiValueEnvVariable) => void
}

export function MultiValueDropdown({ name, value, onChange }: MultiValueDropdownProps) {
    const currentValue = value.values[value.defaultValue] ?? ''

    const handleValueChange = (selectedValue: string) => {
        const newIndex = value.values.indexOf(selectedValue)
        if (newIndex !== -1 && newIndex !== value.defaultValue) {
            onChange({
                ...value,
                defaultValue: newIndex,
            })
        }
    }

    return (
        <div className="flex items-center gap-2 px-2 py-1 bg-secondary rounded text-xs border">
            <span className="font-medium text-secondary-foreground">{name}</span>
            <span className="text-muted-foreground">=</span>
            <Select value={currentValue} onValueChange={handleValueChange}>
                <SelectTrigger className="h-6 min-w-[80px] w-auto text-xs border-0 bg-transparent hover:bg-accent px-2 py-0 gap-1">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {value.values.map((option, index) => (
                        <SelectItem key={index} value={option} className="text-xs">
                            {option}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
