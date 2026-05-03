import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode, HTMLAttributes } from 'react'
import { GripVertical } from 'lucide-react'

export interface DragHandleProps extends HTMLAttributes<HTMLDivElement> {}

interface ScriptDragHandleProps {
    id: string
    children: (dragHandle: ReactNode) => ReactNode
    disabled?: boolean
}

export function ScriptDragHandle({ id, children, disabled = false }: ScriptDragHandleProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const dragHandle = (
        <div
            className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
            title="Drag to reorder"
        >
            <GripVertical className="h-4 w-4" />
        </div>
    )

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                w-full
                ${isDragging ? 'opacity-50' : ''}
            `}
        >
            {children(dragHandle)}
        </div>
    )
}
