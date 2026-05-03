import type { ExecutionStatus } from '../../../../renderer.d'
import { getExecutionStatusStyles } from '../lib/execution-status'
import { cn } from '../../../lib/utils'

export interface StatusStyleResult {
    container: string
    badge: string
    line: string
    bar: string
}

export class ScriptEntryStatusService {
    /**
     * Get the combined container classes for a script entry based on execution status
     */
    static getContainerClasses(baseClasses: string, executionStatus: ExecutionStatus): string {
        const executionStyles = getExecutionStatusStyles(executionStatus)
        return cn(baseClasses, executionStyles.container)
    }

    /**
     * Get all execution status styles for a given status
     */
    static getStatusStyles(executionStatus: ExecutionStatus): StatusStyleResult {
        return getExecutionStatusStyles(executionStatus)
    }

    /**
     * Check if a status should show visual indicators (non-idle)
     */
    static hasVisualIndicators(executionStatus: ExecutionStatus): boolean {
        return executionStatus !== 'idle'
    }

    /**
     * Get status-specific description for debugging
     */
    static getStatusDescription(executionStatus: ExecutionStatus): string {
        const descriptions: Record<ExecutionStatus, string> = {
            idle: 'No execution activity',
            running: 'Script is currently executing',
            success: 'Script completed successfully',
            failed: 'Script execution failed',
            condition_failed: 'Script condition was not met',
        }
        return descriptions[executionStatus]
    }
}
