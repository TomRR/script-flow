import * as React from 'react'
import { Smile } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FeedbackTriggerProps {
    onClick: () => void
    isOpen?: boolean
}

export const FeedbackTrigger = React.forwardRef<HTMLButtonElement, FeedbackTriggerProps>(({ onClick, isOpen }, ref) => {
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
    }

    return (
        <Button
            ref={ref}
            variant="ghost"
            size="icon"
            onClick={handleClick}
            data-state={isOpen ? 'open' : 'closed'}
            className="h-9 w-9 shrink-0"
            aria-label="Open feedback menu"
            aria-expanded={isOpen}
        >
            <Smile className="h-5 w-5" />
        </Button>
    )
})

FeedbackTrigger.displayName = 'FeedbackTrigger'
