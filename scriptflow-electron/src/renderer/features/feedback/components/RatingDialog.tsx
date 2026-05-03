import * as React from 'react'
import { useFeedback } from '../FeedbackContext'
import { useDocService } from '../services/use-doc-service'
import { useRatingService } from '../services/use-rating-service'
import { FeedbackLinkService } from '../services/feedback-link-service'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

import { Loader2, Heart } from 'lucide-react'

interface RatingDialogProps {
    isOpen: boolean
    onClose: () => void
    rating: number | null
}

export function RatingDialog({ isOpen, onClose, rating }: RatingDialogProps) {
    const { discovery, appId, version, platform, architecture, os, isAppInfoLoading } = useFeedback()
    const { sponsorUrl } = useDocService(discovery.config, discovery.isFallback)
    const { submitRating, submitFeedback, isSubmitting } = useRatingService(discovery.config, discovery.isFallback, {
        appId,
        version,
        platform,
        architecture,
        os,
    })
    const [feedbackText, setFeedbackText] = React.useState('')
    const [isSubmitted, setIsSubmitted] = React.useState(false)
    const hasSubmittedRatingRef = React.useRef(false)

    React.useEffect(() => {
        if (!isOpen) {
            hasSubmittedRatingRef.current = false
            setIsSubmitted(false)
            setFeedbackText('')
            return
        }

        if (rating === null || isAppInfoLoading || hasSubmittedRatingRef.current) {
            return
        }

        hasSubmittedRatingRef.current = true
        submitRating(rating)
    }, [isOpen, rating, isAppInfoLoading, submitRating])

    const handleSubmitFeedback = async () => {
        if (isAppInfoLoading) {
            return
        }

        if (feedbackText.trim()) {
            await submitFeedback(feedbackText.trim())
        }
        setIsSubmitted(true)
        setTimeout(() => {
            onClose()
        }, 2000)
    }

    const handleSponsor = async () => {
        if (sponsorUrl) {
            await FeedbackLinkService.open(sponsorUrl)
        }
    }

    const handleClose = () => {
        onClose()
    }

    const getRatingMessage = () => {
        switch (rating) {
            case 1:
            case 2:
                return 'What can we improve?'
            case 3:
                return "Glad you're loving Scriptflow!"
            default:
                return ''
        }
    }

    const getRatingEmoji = () => {
        switch (rating) {
            case 1:
                return '😡'
            case 2:
                return '😐'
            case 3:
                return '😍'
            default:
                return ''
        }
    }

    if (rating === null) {
        return null
    }

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            onClose()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md pointer-events-auto">
                <DialogHeader>
                    <div className="flex items-center justify-center mb-4">
                        <span className="text-5xl">{getRatingEmoji()}</span>
                    </div>
                    <DialogTitle className="text-center">{getRatingMessage()}</DialogTitle>
                    <DialogDescription className="text-center">
                        {rating <= 2
                            ? 'Your feedback helps us make Scriptflow better.'
                            : 'Thanks for using Scriptflow!'}
                    </DialogDescription>
                </DialogHeader>

                {isSubmitted ? (
                    <div className="flex flex-col items-center py-4">
                        <Heart className="h-12 w-12 text-red-500 mb-2" />
                        <p className="text-center text-muted-foreground">Thanks for your feedback!</p>
                    </div>
                ) : rating <= 2 ? (
                    <div className="space-y-4">
                        <textarea
                            placeholder="Tell us what we can improve..."
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            autoFocus
                        />
                        <DialogFooter>
                            <Button
                                onClick={handleSubmitFeedback}
                                disabled={isSubmitting || isAppInfoLoading || !feedbackText.trim()}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit Feedback'
                                )}
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                        {sponsorUrl && (
                            <Button variant="outline" onClick={handleSponsor}>
                                <Heart className="mr-2 h-4 w-4" />
                                Support Us
                            </Button>
                        )}
                        <Button onClick={handleClose}>Close</Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}
