import * as React from 'react'
import { BookOpen, Bug, Lightbulb, Loader2 } from 'lucide-react'
import { useFeedback } from '../FeedbackContext'
import { useIssueService } from '../services/use-issue-service'
import { useDocService } from '../services/use-doc-service'
import { FeedbackLinkService } from '../services/feedback-link-service'

interface FeedbackDropdownProps {
    isOpen: boolean
    onClose: () => void
    onRatingSelect: (rating: number) => void
}

export function FeedbackDropdown({ isOpen, onClose, onRatingSelect }: FeedbackDropdownProps) {
    const { discovery } = useFeedback()
    const { bugUrl, featureUrl } = useIssueService(discovery.config, discovery.isFallback)
    const { docsUrl } = useDocService(discovery.config, discovery.isFallback)
    const dropdownRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, onClose])

    const handleBugReport = async () => {
        await FeedbackLinkService.open(bugUrl)
        onClose()
    }

    const handleFeatureRequest = async () => {
        await FeedbackLinkService.open(featureUrl)
        onClose()
    }

    const handleDocs = async () => {
        if (docsUrl) {
            await FeedbackLinkService.open(docsUrl)
            onClose()
        }
    }

    const handleRating = (rating: number) => {
        onRatingSelect(rating)
        onClose()
    }

    if (!isOpen) {
        return null
    }

    return (
        <div
            ref={dropdownRef}
            className="absolute right-0 top-full mt-1 z-50 min-w-[220px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
            {discovery.isLoading ? (
                <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                </div>
            ) : (
                <>
                    {docsUrl && (
                        <button
                            onClick={handleDocs}
                            className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                            <BookOpen className="mr-2 h-4 w-4" />
                            Documentation
                        </button>
                    )}
                    <button
                        onClick={handleBugReport}
                        className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                        <Bug className="mr-2 h-4 w-4" />
                        Report a Bug
                    </button>
                    <button
                        onClick={handleFeatureRequest}
                        className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                        <Lightbulb className="mr-2 h-4 w-4" />
                        Feature Request
                    </button>
                    <div className="-mx-1 my-1 h-px bg-muted" />
                    <div className="px-2 py-1.5">
                        <span className="text-xs text-muted-foreground">Rate Scriptflow</span>
                        <div className="mt-2 flex justify-center gap-2">
                            <button
                                onClick={() => handleRating(1)}
                                className="text-2xl hover:scale-110 transition-transform p-1 rounded hover:bg-accent"
                                aria-label="Rate 1 - Poor"
                            >
                                😡
                            </button>
                            <button
                                onClick={() => handleRating(2)}
                                className="text-2xl hover:scale-110 transition-transform p-1 rounded hover:bg-accent"
                                aria-label="Rate 2 - Okay"
                            >
                                😐
                            </button>
                            <button
                                onClick={() => handleRating(3)}
                                className="text-2xl hover:scale-110 transition-transform p-1 rounded hover:bg-accent"
                                aria-label="Rate 3 - Great"
                            >
                                😍
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
