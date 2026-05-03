/** @jest-environment jsdom */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ScriptConnector } from './ScriptConnector'
import type { ScriptEntry } from '../../../../renderer.d'

describe('ScriptConnector', () => {
    const mockOnUpdate = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('shows output passing badge when condition is disabled', () => {
        const script: ScriptEntry = {
            id: 'script-1',
            type: 'bash',
            path: '/scripts/one.sh',
            placement: 0,
            successCondition: {
                type: 'contains',
                value: '',
                enabled: false,
            },
            outputPass: {
                enabled: true,
                envVarName: 'RESULT_JSON',
            },
        }

        render(<ScriptConnector script={script} onUpdate={mockOnUpdate} />)

        expect(screen.getByText('Pass Output → $RESULT_JSON')).toBeInTheDocument()
    })

    it('does not show the configured condition value in output passing helper text', () => {
        const conditionValue = '{"very":"long json payload value"}'
        const script: ScriptEntry = {
            id: 'script-2',
            type: 'bash',
            path: '/scripts/two.sh',
            placement: 1,
            successCondition: {
                type: 'contains',
                value: conditionValue,
                enabled: false,
            },
            outputPass: {
                enabled: true,
                envVarName: 'RESULT_JSON',
            },
        }

        render(<ScriptConnector script={script} onUpdate={mockOnUpdate} />)

        fireEvent.click(screen.getByText('Pass Output → $RESULT_JSON'))

        expect(screen.getByText(/The next script will receive the latest script output in/)).toBeInTheDocument()
        expect(
            screen.queryByText(`If condition passes, $RESULT_JSON will be set to "${conditionValue}"`),
        ).not.toBeInTheDocument()
        expect(screen.queryByText(conditionValue)).not.toBeInTheDocument()
    })
})
