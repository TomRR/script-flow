import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'

interface DragHandleProps {
    id: string
    children: ReactNode
}

export function DragHandle({ id, children }: DragHandleProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group flex items-center w-full cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
            {...attributes}
            {...listeners}
        >
            {children}
        </div>
    )
}
