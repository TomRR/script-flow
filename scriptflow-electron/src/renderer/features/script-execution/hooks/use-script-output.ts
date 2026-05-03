import { useState, useCallback } from 'react'

export interface UseScriptOutputReturn {
    output: string
    appendOutput: (data: string) => void
    clearOutput: () => void
    setOutput: (value: string) => void
}

export function useScriptOutput(): UseScriptOutputReturn {
    const [output, setOutputState] = useState<string>('')

    const appendOutput = useCallback((data: string) => {
        setOutputState((prev) => prev + data)
    }, [])

    const clearOutput = useCallback(() => {
        setOutputState('')
    }, [])

    const setOutput = useCallback((value: string) => {
        setOutputState(value)
    }, [])

    return {
        output,
        appendOutput,
        clearOutput,
        setOutput,
    }
}
