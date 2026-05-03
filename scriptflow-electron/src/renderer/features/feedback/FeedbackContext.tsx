import * as React from 'react'
import type { FeedbackContextType } from './types'

const FeedbackContext = React.createContext<FeedbackContextType | null>(null)

export function useFeedback(): FeedbackContextType {
    const context = React.useContext(FeedbackContext)

    if (!context) {
        throw new Error('useFeedback must be used within a FeedbackProvider')
    }

    return context
}

export { FeedbackContext }
