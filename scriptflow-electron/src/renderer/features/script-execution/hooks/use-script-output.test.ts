import { renderHook, act } from '@testing-library/react'
import { useScriptOutput } from './use-script-output'

describe('useScriptOutput', () => {
    it('should initialize with empty output', () => {
        const { result } = renderHook(() => useScriptOutput())
        expect(result.current.output).toBe('')
    })

    it('should append output data', () => {
        const { result } = renderHook(() => useScriptOutput())

        act(() => {
            result.current.appendOutput('first line')
        })
        expect(result.current.output).toBe('first line')

        act(() => {
            result.current.appendOutput('\nsecond line')
        })
        expect(result.current.output).toBe('first line\nsecond line')
    })

    it('should clear output', () => {
        const { result } = renderHook(() => useScriptOutput())

        act(() => {
            result.current.appendOutput('some output')
        })
        expect(result.current.output).toBe('some output')

        act(() => {
            result.current.clearOutput()
        })
        expect(result.current.output).toBe('')
    })

    it('should set output directly', () => {
        const { result } = renderHook(() => useScriptOutput())

        act(() => {
            result.current.setOutput('direct value')
        })
        expect(result.current.output).toBe('direct value')

        act(() => {
            result.current.setOutput('new value')
        })
        expect(result.current.output).toBe('new value')
    })

    it('should maintain separate state between different hook instances', () => {
        const { result: result1 } = renderHook(() => useScriptOutput())
        const { result: result2 } = renderHook(() => useScriptOutput())

        act(() => {
            result1.current.appendOutput('instance 1 output')
        })

        expect(result1.current.output).toBe('instance 1 output')
        expect(result2.current.output).toBe('')
    })
})
