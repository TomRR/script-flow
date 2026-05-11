/** @jest-environment jsdom */
import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { FeedbackDropdown } from './FeedbackDropdown'

const mockOpen = jest.fn()

jest.mock('../FeedbackContext', () => ({
    useFeedback: () => ({
        version: '1.2.3',
        discovery: {
            config: {
                docs: 'https://docs.example.com',
                sponsor: 'https://github.com/sponsors/example',
            },
            isLoading: false,
            isFallback: false,
        },
    }),
}))

jest.mock('../services/feedback-link-service', () => ({
    FeedbackLinkService: {
        open: (...args: unknown[]) => mockOpen(...args),
    },
}))

describe('FeedbackDropdown', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    test('opens bug reports via the feedback link service and closes the dropdown', async () => {
        const onClose = jest.fn()

        render(<FeedbackDropdown isOpen={true} onClose={onClose} onRatingSelect={jest.fn()} />)

        await act(async () => {
            fireEvent.click(screen.getByText('Report a Bug'))
        })

        expect(mockOpen).toHaveBeenCalledWith('https://tally.so/r/pbAL6B')
        expect(onClose).toHaveBeenCalled()
    })

    test('opens feature requests via the feedback link service and closes the dropdown', async () => {
        const onClose = jest.fn()

        render(<FeedbackDropdown isOpen={true} onClose={onClose} onRatingSelect={jest.fn()} />)

        await act(async () => {
            fireEvent.click(screen.getByText('Feature Request'))
        })

        expect(mockOpen).toHaveBeenCalledWith('https://tally.so/r/68kdGJ')
        expect(onClose).toHaveBeenCalled()
    })

    test('shows the current version as a release tag in the rating section', () => {
        render(<FeedbackDropdown isOpen={true} onClose={jest.fn()} onRatingSelect={jest.fn()} />)

        expect(screen.getByText('Version v1.2.3')).toBeInTheDocument()
    })
})
