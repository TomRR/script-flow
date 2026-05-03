import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Plus, Trash2, Star, Check } from 'lucide-react'
import type { EnvValue } from '../../../../renderer.d'
import { MultiValueVariableService } from '../services/multi-value-variable-service'

interface MultiValueVariableDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialKey?: string
    initialValue?: EnvValue
    onSave: (key: string, value: EnvValue) => void
    existingKeys: string[]
    isEditing?: boolean
}

export function MultiValueVariableDialog({
    open,
    onOpenChange,
    initialKey = '',
    initialValue,
    onSave,
    existingKeys,
    isEditing = false,
}: MultiValueVariableDialogProps) {
    const [key, setKey] = useState(initialKey)
    const [variableType, setVariableType] = useState<'static' | 'multi-value'>('static')
    const [displayType, setDisplayType] = useState<'dropdown' | 'radio'>('dropdown')
    const [staticValue, setStaticValue] = useState('')
    const [values, setValues] = useState<string[]>(['', ''])
    const [defaultIndex, setDefaultIndex] = useState(0)
    const [keyError, setKeyError] = useState('')

    useEffect(() => {
        if (open) {
            setKey(initialKey)
            if (initialValue) {
                if (MultiValueVariableService.isStatic(initialValue)) {
                    setVariableType('static')
                    setStaticValue(initialValue.value)
                    setValues(['', ''])
                    setDefaultIndex(0)
                } else if (MultiValueVariableService.isMultiValue(initialValue)) {
                    setVariableType('multi-value')
                    setDisplayType(initialValue.display)
                    setValues(initialValue.values.length >= 2 ? initialValue.values : ['', ''])
                    setDefaultIndex(initialValue.defaultValue)
                    setStaticValue('')
                }
            } else {
                setVariableType('static')
                setDisplayType('dropdown')
                setStaticValue('')
                setValues(['', ''])
                setDefaultIndex(0)
            }
            setKeyError('')
        }
    }, [open, initialKey, initialValue])

    const handleAddValue = () => {
        setValues([...values, ''])
    }

    const handleRemoveValue = (index: number) => {
        if (values.length <= 2) return
        const newValues = values.filter((_, i) => i !== index)
        setValues(newValues)
        if (defaultIndex === index) {
            setDefaultIndex(0)
        } else if (defaultIndex > index) {
            setDefaultIndex(defaultIndex - 1)
        }
        if (defaultIndex >= newValues.length) {
            setDefaultIndex(newValues.length - 1)
        }
    }

    const handleValueChange = (index: number, newValue: string) => {
        const newValues = [...values]
        newValues[index] = newValue
        setValues(newValues)
    }

    const handleSetDefault = (index: number) => {
        setDefaultIndex(index)
    }

    const validate = (): boolean => {
        if (!key.trim()) {
            setKeyError('Key is required')
            return false
        }
        if (!isEditing && existingKeys.includes(key.trim())) {
            setKeyError('Key already exists')
            return false
        }
        if (variableType === 'multi-value') {
            const validValues = values.filter((v) => v.trim().length > 0)
            if (validValues.length < 2) {
                setKeyError('At least 2 values are required')
                return false
            }
        }
        setKeyError('')
        return true
    }

    const handleSave = () => {
        if (!validate()) return

        let envValue: EnvValue
        if (variableType === 'static') {
            envValue = MultiValueVariableService.createStatic(staticValue)
        } else {
            const validValues = values.filter((v) => v.trim().length > 0)
            envValue = MultiValueVariableService.createMultiValue(
                displayType,
                validValues,
                Math.min(defaultIndex, validValues.length - 1),
            )
        }

        onSave(key.trim(), envValue)
        onOpenChange(false)
    }

    const handleCancel = () => {
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Variable' : 'Add Variable'}</DialogTitle>
                    <DialogDescription>Configure an environment variable for this script.</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Key Input */}
                    <div className="space-y-2">
                        <Label htmlFor="key">Key Name</Label>
                        <Input
                            id="key"
                            placeholder="e.g., TARGET_ENV"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            disabled={isEditing}
                        />
                        {keyError && <p className="text-sm text-red-500">{keyError}</p>}
                    </div>

                    {/* Variable Type Selection */}
                    <div className="space-y-2">
                        <Label>Variable Type</Label>
                        <RadioGroup
                            value={variableType}
                            onValueChange={(value) => setVariableType(value as 'static' | 'multi-value')}
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="static" id="static" />
                                <Label htmlFor="static" className="cursor-pointer">
                                    Static Value
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="multi-value" id="multi-value" />
                                <Label htmlFor="multi-value" className="cursor-pointer">
                                    Multi-Value List
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {variableType === 'static' ? (
                        /* Static Value Input */
                        <div className="space-y-2">
                            <Label htmlFor="static-value">Value</Label>
                            <Input
                                id="static-value"
                                placeholder="Enter value..."
                                value={staticValue}
                                onChange={(e) => setStaticValue(e.target.value)}
                            />
                        </div>
                    ) : (
                        <>
                            {/* Display Type Selection */}
                            <div className="space-y-2">
                                <Label>Display Style</Label>
                                <RadioGroup
                                    value={displayType}
                                    onValueChange={(value) => setDisplayType(value as 'dropdown' | 'radio')}
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="dropdown" id="dropdown" />
                                        <Label htmlFor="dropdown" className="cursor-pointer">
                                            Dropdown (Compact)
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="radio" id="radio" />
                                        <Label htmlFor="radio" className="cursor-pointer">
                                            Radio Buttons (High Visibility)
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {/* Values List */}
                            <div className="space-y-3">
                                <Label>Define Values</Label>
                                <div className="space-y-2">
                                    {values.map((value, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Input
                                                placeholder={`Value ${index + 1}`}
                                                value={value}
                                                onChange={(e) => handleValueChange(index, e.target.value)}
                                                className="flex-1"
                                            />
                                            <Button
                                                variant={defaultIndex === index ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => handleSetDefault(index)}
                                                className="shrink-0"
                                                title={defaultIndex === index ? 'Default value' : 'Set as default'}
                                            >
                                                {defaultIndex === index ? (
                                                    <>
                                                        <Check className="h-4 w-4 mr-1" />
                                                        Default
                                                    </>
                                                ) : (
                                                    <>
                                                        <Star className="h-4 w-4 mr-1" />
                                                        Make Default
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveValue(index)}
                                                disabled={values.length <= 2}
                                                className="shrink-0 text-red-500 hover:text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <Button variant="outline" size="sm" onClick={handleAddValue} className="w-full">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Option
                                </Button>
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>{isEditing ? 'Save Changes' : 'Add Variable'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
