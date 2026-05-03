import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Pencil, Plus, ChevronRight, ChevronDown, MoreHorizontal, Trash2, Copy } from 'lucide-react'
import type { Section, SubSection, VaultsConfig } from '../../../../renderer.d'
import { SidebarService } from '../services/sidebar-service'
import { DuplicateSidebarElementService } from '../services/duplicate-sidebar-element-service'
import { DragAndDropSidebarService } from '../services/drag-and-drop-sidebar-service'
import type { SelectedPage } from '../../../App'
import { SecretsDialog } from '../../secrets/components/SecretsDialog'
import { LogsDialog } from '../../logging/components/LogsDialog'
import { DragHandle } from './DragHandle'
import { VaultSelectorDropdown } from './VaultSelectorDropdown'
import { VaultNameDialog } from './VaultNameDialog'

// @dnd-kit imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    selectedPage: SelectedPage | null
    onSelectPage: (page: SelectedPage | null) => void
}

export function Sidebar({ className, selectedPage, onSelectPage }: SidebarProps) {
    const [sections, setSections] = useState<Section[]>([])
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingTitle, setEditingTitle] = useState('')
    const [isAddingSection, setIsAddingSection] = useState(false)
    const [newSectionTitle, setNewSectionTitle] = useState('')
    const [addingWorkflowToSectionId, setAddingWorkflowToSectionId] = useState<string | null>(null)
    const [newWorkflowTitle, setNewWorkflowTitle] = useState('')
    const [sectionToDelete, setSectionToDelete] = useState<string | null>(null)
    const [workflowToDelete, setWorkflowToDelete] = useState<{ sectionId: string; subSectionKey: string } | null>(null)
    const [editingWorkflow, setEditingWorkflow] = useState<{ sectionId: string; subSectionKey: string } | null>(null)
    const [editingWorkflowTitle, setEditingWorkflowTitle] = useState('')
    const [isSecretsDialogOpen, setIsSecretsDialogOpen] = useState(false)
    const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false)
    const [draggedWorkflow, setDraggedWorkflow] = useState<{ sectionId: string; workflowKey: string } | null>(null)
    const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null)
    const [autoExpandTimeout, setAutoExpandTimeout] = useState<NodeJS.Timeout | null>(null)

    // Vault management state
    const [vaultsConfig, setVaultsConfig] = useState<VaultsConfig>({ activeVaultId: null, vaults: [] })
    const [pendingVaultPath, setPendingVaultPath] = useState<string | null>(null)
    const [isVaultNameDialogOpen, setIsVaultNameDialogOpen] = useState(false)
    const [vaultToRemove, setVaultToRemove] = useState<{ id: string; name: string } | null>(null)

    const editInputRef = useRef<HTMLInputElement>(null)
    const addInputRef = useRef<HTMLInputElement>(null)
    const addWorkflowInputRef = useRef<HTMLInputElement>(null)

    // @dnd-kit sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                delay: 250,
                distance: 5,
                tolerance: 10,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    )

    // Load sections on mount
    useEffect(() => {
        const loadSections = async () => {
            try {
                const loadedSections = await SidebarService.getSections()
                setSections(loadedSections)
                // Expand all sections by default
                setExpandedSections(new Set(loadedSections.map((s) => s.id)))
            } catch (error) {
                console.error('Failed to load sections:', error)
            }
        }
        loadSections()
    }, [])

    // Load vaults on mount
    useEffect(() => {
        const loadVaults = async () => {
            try {
                const config = await SidebarService.getVaults()
                setVaultsConfig(config)
            } catch (error) {
                console.error('Failed to load vaults:', error)
            }
        }
        loadVaults()
    }, [])

    const toggleSection = (sectionId: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev)
            if (next.has(sectionId)) {
                next.delete(sectionId)
            } else {
                next.add(sectionId)
            }
            return next
        })
    }

    // Focus input when editing starts
    useEffect(() => {
        if ((editingId || editingWorkflow) && editInputRef.current) {
            editInputRef.current.focus()
            editInputRef.current.select()
        }
    }, [editingId, editingWorkflow])

    // Focus input when adding section
    useEffect(() => {
        if (isAddingSection && addInputRef.current) {
            addInputRef.current.focus()
        }
    }, [isAddingSection])

    // Focus input when adding workflow
    useEffect(() => {
        if (addingWorkflowToSectionId && addWorkflowInputRef.current) {
            addWorkflowInputRef.current.focus()
        }
    }, [addingWorkflowToSectionId])

    const handleOpenNewVault = async () => {
        try {
            const selectedPath = await SidebarService.selectVault()
            if (selectedPath) {
                setPendingVaultPath(selectedPath)
                setIsVaultNameDialogOpen(true)
            }
        } catch (error) {
            console.error('Failed to select vault:', error)
        }
    }

    const handleConfirmVaultName = async (name: string) => {
        if (pendingVaultPath) {
            try {
                const success = await SidebarService.initVault(pendingVaultPath, name)
                if (success) {
                    window.location.reload()
                }
            } catch (error) {
                console.error('Failed to initialize vault:', error)
            }
        }
        setPendingVaultPath(null)
    }

    const handleCancelVaultName = () => {
        setPendingVaultPath(null)
    }

    const handleSwitchVault = async (vaultId: string) => {
        try {
            const success = await SidebarService.setActiveVault(vaultId)
            if (success) {
                window.location.reload()
            }
        } catch (error) {
            console.error('Failed to switch vault:', error)
        }
    }

    const handleRemoveVault = (vaultId: string, vaultName: string) => {
        setVaultToRemove({ id: vaultId, name: vaultName })
    }

    const confirmRemoveVault = async () => {
        if (!vaultToRemove) return

        try {
            const success = await SidebarService.removeVault(vaultToRemove.id)
            if (success) {
                // Refresh vaults list
                const config = await SidebarService.getVaults()
                setVaultsConfig(config)
            }
        } catch (error) {
            console.error('Failed to remove vault:', error)
        } finally {
            setVaultToRemove(null)
        }
    }

    const handleOpenSettings = async () => {
        try {
            await SidebarService.openConfigDirectory()
        } catch (error) {
            console.error('Failed to open settings:', error)
        }
    }

    const handleOpenSecrets = () => {
        setIsSecretsDialogOpen(true)
    }

    const handleOpenLogs = () => {
        setIsLogsDialogOpen(true)
    }

    const handleStartRename = (section: Section) => {
        setEditingId(section.id)
        setEditingTitle(section.title)
    }

    const handleCancelRename = () => {
        setEditingId(null)
        setEditingTitle('')
    }

    const handleSaveRename = async () => {
        if (!editingId || !editingTitle.trim()) {
            handleCancelRename()
            return
        }

        try {
            const updated = await SidebarService.updateSection(editingId, editingTitle.trim())
            if (updated) {
                setSections((prev) => prev.map((s) => (s.id === editingId ? updated : s)))
            }
        } catch (error) {
            console.error('Failed to rename section:', error)
        }
        handleCancelRename()
    }

    const handleRenameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSaveRename()
        } else if (e.key === 'Escape') {
            handleCancelRename()
        }
    }

    const handleStartAddSection = () => {
        setIsAddingSection(true)
        setNewSectionTitle('')
    }

    const handleCancelAddSection = () => {
        setIsAddingSection(false)
        setNewSectionTitle('')
    }

    const handleSaveNewSection = async () => {
        if (!newSectionTitle.trim()) {
            handleCancelAddSection()
            return
        }

        try {
            const newSection = await SidebarService.addSection(newSectionTitle.trim())
            if (newSection) {
                setSections((prev) => [...prev, newSection])
                // Expand the newly added section
                setExpandedSections((prev) => new Set(prev).add(newSection.id))
            }
        } catch (error) {
            console.error('Failed to add section:', error)
        }
        handleCancelAddSection()
    }

    const handleAddSectionKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSaveNewSection()
        } else if (e.key === 'Escape') {
            handleCancelAddSection()
        }
    }

    const handleStartAddWorkflow = (sectionId: string) => {
        setAddingWorkflowToSectionId(sectionId)
        setNewWorkflowTitle('')
    }

    const handleCancelAddWorkflow = () => {
        setAddingWorkflowToSectionId(null)
        setNewWorkflowTitle('')
    }

    const handleSaveNewWorkflow = async () => {
        if (!addingWorkflowToSectionId || !newWorkflowTitle.trim()) {
            handleCancelAddWorkflow()
            return
        }

        try {
            const result = await SidebarService.addSubSection(addingWorkflowToSectionId, newWorkflowTitle.trim())
            if (result) {
                setSections((prev) =>
                    prev.map((section) => {
                        if (section.id === addingWorkflowToSectionId) {
                            return {
                                ...section,
                                'sub-sections': {
                                    ...section['sub-sections'],
                                    [result.key]: result.subSection,
                                },
                            }
                        }
                        return section
                    }),
                )
            }
        } catch (error) {
            console.error('Failed to add workflow:', error)
        }
        handleCancelAddWorkflow()
    }

    const handleDeleteSection = (sectionId: string) => {
        setSectionToDelete(sectionId)
    }

    const handleDuplicateSection = async (section: Section) => {
        try {
            const duplicated = await DuplicateSidebarElementService.duplicateSection(section.id)
            if (duplicated) {
                setSections((prev) => {
                    const index = prev.findIndex((item) => item.id === section.id)
                    if (index === -1) {
                        return prev
                    }
                    const next = [...prev]
                    next.splice(index + 1, 0, duplicated)
                    return next.map((item, placement) => ({
                        ...item,
                        placement,
                    }))
                })
                setExpandedSections((prev) => new Set(prev).add(duplicated.id))
            }
        } catch (error) {
            console.error('Failed to duplicate section:', error)
        }
    }

    const confirmDeleteSection = async () => {
        if (!sectionToDelete) return

        try {
            const success = await SidebarService.deleteSection(sectionToDelete)
            if (success) {
                setSections((prev) => prev.filter((s) => s.id !== sectionToDelete))
                // Also clear selection if it was in this section
                if (selectedPage?.sectionId === sectionToDelete) {
                    onSelectPage(null)
                }
            }
        } catch (error) {
            console.error('Failed to delete section:', error)
        }
        setSectionToDelete(null)
    }

    const handleDeleteWorkflow = (sectionId: string, subSectionKey: string) => {
        setWorkflowToDelete({ sectionId, subSectionKey })
    }

    const handleDuplicateWorkflow = async (sectionId: string, subSectionKey: string) => {
        try {
            const result = await DuplicateSidebarElementService.duplicateSubSection(sectionId, subSectionKey)
            if (!result) return

            setSections((prev) =>
                prev.map((section) => {
                    if (section.id !== sectionId) {
                        return section
                    }

                    const original = section['sub-sections'][subSectionKey]
                    if (!original) {
                        return section
                    }

                    const updatedSubSections: Record<string, SubSection> = Object.fromEntries(
                        Object.entries(section['sub-sections']).map(([key, subSection]) => [
                            key,
                            {
                                ...subSection,
                                scripts: subSection.scripts ? [...subSection.scripts] : [],
                            },
                        ]),
                    )

                    const originalPlacement = original.placement
                    Object.values(updatedSubSections).forEach((subSection) => {
                        if (subSection.placement > originalPlacement) {
                            subSection.placement += 1
                        }
                    })

                    updatedSubSections[result.key] = result.subSection

                    const normalizedEntries = Object.entries(updatedSubSections).sort(
                        (a, b) => a[1].placement - b[1].placement,
                    )

                    const normalizedSubSections: Record<string, SubSection> = {}
                    normalizedEntries.forEach(([key, subSection], index) => {
                        normalizedSubSections[key] = { ...subSection, placement: index }
                    })

                    return {
                        ...section,
                        'sub-sections': normalizedSubSections,
                    }
                }),
            )
        } catch (error) {
            console.error('Failed to duplicate workflow:', error)
        }
    }

    const confirmDeleteWorkflow = async () => {
        if (!workflowToDelete) return
        const { sectionId, subSectionKey } = workflowToDelete

        try {
            const success = await SidebarService.deleteSubSection(sectionId, subSectionKey)
            if (success) {
                setSections((prev) =>
                    prev.map((section) => {
                        if (section.id === sectionId) {
                            const newSubSections = { ...section['sub-sections'] }
                            delete newSubSections[subSectionKey]
                            return {
                                ...section,
                                'sub-sections': newSubSections,
                            }
                        }
                        return section
                    }),
                )
                // Clear selection if this workflow was selected
                if (selectedPage?.sectionId === sectionId && selectedPage?.subSectionKey === subSectionKey) {
                    onSelectPage(null)
                }
            }
        } catch (error) {
            console.error('Failed to delete workflow:', error)
        }
        setWorkflowToDelete(null)
    }

    const handleStartWorkflowRename = (sectionId: string, subSectionKey: string, title: string) => {
        setEditingWorkflow({ sectionId, subSectionKey })
        setEditingWorkflowTitle(title)
    }

    const handleCancelWorkflowRename = () => {
        setEditingWorkflow(null)
        setEditingWorkflowTitle('')
    }

    const handleSaveWorkflowRename = async () => {
        if (!editingWorkflow || !editingWorkflowTitle.trim()) {
            handleCancelWorkflowRename()
            return
        }

        const { sectionId, subSectionKey } = editingWorkflow
        const newTitle = editingWorkflowTitle.trim()

        try {
            const success = await SidebarService.updateSubSection(sectionId, subSectionKey, newTitle)
            if (success) {
                setSections((prev) =>
                    prev.map((section) => {
                        if (section.id === sectionId) {
                            return {
                                ...section,
                                'sub-sections': {
                                    ...section['sub-sections'],
                                    [subSectionKey]: {
                                        ...section['sub-sections'][subSectionKey],
                                        title: newTitle,
                                    },
                                },
                            }
                        }
                        return section
                    }),
                )
                // Update selection if it was this workflow
                if (selectedPage?.sectionId === sectionId && selectedPage?.subSectionKey === subSectionKey) {
                    onSelectPage({ ...selectedPage, title: newTitle })
                }
            }
        } catch (error) {
            console.error('Failed to rename workflow:', error)
        }
        handleCancelWorkflowRename()
    }

    const handleWorkflowRenameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSaveWorkflowRename()
        } else if (e.key === 'Escape') {
            handleCancelWorkflowRename()
        }
    }

    const handleAddWorkflowKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSaveNewWorkflow()
        } else if (e.key === 'Escape') {
            handleCancelAddWorkflow()
        }
    }

    // Helper to get sorted subsections - using service method for consistency
    const getSortedSubSections = (subSections: Record<string, SubSection>): [string, SubSection][] => {
        return DragAndDropSidebarService.getSortedSubSections(subSections)
    }

    // Drag and drop handlers
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event

        // Check if this is a workflow drag (workflow IDs include a colon separator)
        if (typeof active.id === 'string' && active.id.includes(':')) {
            const [sectionId, workflowKey] = active.id.split(':')
            setDraggedWorkflow({ sectionId, workflowKey })
            setHoveredSectionId(null)
        }
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { over } = event
        // We don't need active here, but keeping the event parameter for consistency

        // Only handle workflow dragging over sections
        if (!over || !draggedWorkflow) return

        const overId = String(over.id)

        // Check if over is a section (doesn't contain colon)
        if (!overId.includes(':')) {
            const overSectionId = overId

            // Clear existing timeout
            if (autoExpandTimeout) {
                clearTimeout(autoExpandTimeout)
            }

            // Auto-expand after 500ms if section is not expanded
            if (!expandedSections.has(overSectionId)) {
                const timeout = setTimeout(() => {
                    setExpandedSections((prev) => new Set(prev).add(overSectionId))
                }, 500)
                setAutoExpandTimeout(timeout)
            }

            setHoveredSectionId(overSectionId)
        }
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        const activeId = String(active.id)
        const overId = over ? String(over.id) : null

        // Clear auto-expand timeout
        if (autoExpandTimeout) {
            clearTimeout(autoExpandTimeout)
            setAutoExpandTimeout(null)
        }

        // Reset drag state
        setDraggedWorkflow(null)
        setHoveredSectionId(null)

        if (!over) return

        // Handle section reordering
        if (!activeId.includes(':') && overId && !overId.includes(':')) {
            const activeIndex = sections.findIndex((s) => s.id === activeId)
            const overIndex = sections.findIndex((s) => s.id === overId)

            if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
                const reorderedSections = DragAndDropSidebarService.reorderSections(sections, activeIndex, overIndex)
                setSections(reorderedSections)

                // Persist to backend
                const result = await DragAndDropSidebarService.persistSectionReorder(activeIndex, overIndex)
                if (!result.success) {
                    console.error('Failed to persist section reorder:', result.error)
                    // Revert on error
                    setSections(sections)
                }
            }
        }

        // Handle workflow reordering within section
        if (activeId.includes(':') && overId && overId.includes(':')) {
            const [activeSectionId, activeWorkflowKey] = activeId.split(':')
            const [overSectionId, overWorkflowKey] = overId.split(':')

            // Same section reordering
            if (activeSectionId === overSectionId) {
                const section = sections.find((s) => s.id === activeSectionId)
                if (!section || !section['sub-sections']) return

                const workflows = getSortedSubSections(section['sub-sections'])
                const activeIndex = workflows.findIndex(([key]) => key === activeWorkflowKey)
                const overIndex = workflows.findIndex(([key]) => key === overWorkflowKey)

                if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
                    const reorderedWorkflows = DragAndDropSidebarService.reorderWorkflows(
                        workflows,
                        activeIndex,
                        overIndex,
                    )

                    // Update section with reordered workflows
                    const updatedSubSections: Record<string, SubSection> = {}
                    reorderedWorkflows.forEach(([key, subSection]) => {
                        updatedSubSections[key] = subSection
                    })

                    const updatedSection = { ...section, 'sub-sections': updatedSubSections }
                    setSections((prev) => prev.map((s) => (s.id === activeSectionId ? updatedSection : s)))

                    // Persist to backend
                    const result = await DragAndDropSidebarService.persistWorkflowReorder(
                        activeSectionId,
                        activeIndex,
                        overIndex,
                    )
                    if (!result.success) {
                        console.error('Failed to persist workflow reorder:', result.error)
                        // Revert on error
                        setSections((prev) => prev)
                    }
                }
            }
        }

        // Handle moving workflow to different section
        if (activeId.includes(':') && overId && !overId.includes(':') && draggedWorkflow) {
            const targetSectionId = overId
            const sourceSectionId = draggedWorkflow.sectionId
            const workflowKey = draggedWorkflow.workflowKey

            if (sourceSectionId !== targetSectionId) {
                const sourceSection = sections.find((s) => s.id === sourceSectionId)
                const targetSection = sections.find((s) => s.id === targetSectionId)

                if (!sourceSection || !targetSection) return

                const { sourceSection: updatedSourceSection, targetSection: updatedTargetSection } =
                    DragAndDropSidebarService.moveWorkflowToSection(sourceSection, targetSection, workflowKey)

                setSections((prev) =>
                    prev.map((section) => {
                        if (section.id === sourceSectionId) return updatedSourceSection
                        if (section.id === targetSectionId) return updatedTargetSection
                        return section
                    }),
                )

                // Persist to backend
                const targetWorkflows = DragAndDropSidebarService.getSortedSubSections(
                    updatedTargetSection['sub-sections'],
                )
                const targetIndex = targetWorkflows.findIndex(([key]) => key === workflowKey)

                const result = await DragAndDropSidebarService.persistWorkflowMove(
                    workflowKey,
                    sourceSectionId,
                    targetSectionId,
                    targetIndex,
                )

                if (!result.success) {
                    console.error('Failed to persist workflow move:', result.error)
                    // Revert on error
                    setSections((prev) => prev)
                } else {
                    // Clear selection if moved workflow was selected
                    if (selectedPage?.sectionId === sourceSectionId && selectedPage?.subSectionKey === workflowKey) {
                        onSelectPage({
                            sectionId: targetSectionId,
                            subSectionKey: workflowKey,
                            title: sourceSection['sub-sections'][workflowKey]?.title || '',
                        })
                    }
                }
            }
        }
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className={cn('pb-12 flex flex-col h-full', className)}>
                <div className="space-y-4 py-4 flex-1">
                    <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                        {sections.map((section) => {
                            const isExpanded = expandedSections.has(section.id)
                            return (
                                <div key={section.id} className="px-3 py-2">
                                    <DragHandle id={section.id}>
                                        <div
                                            className={`flex items-center justify-between mb-2 flex-1 ${hoveredSectionId === section.id ? 'ring-2 ring-primary rounded' : ''}`}
                                        >
                                            {editingId === section.id ? (
                                                <input
                                                    ref={editInputRef}
                                                    type="text"
                                                    value={editingTitle}
                                                    onChange={(e) => setEditingTitle(e.target.value)}
                                                    onKeyDown={handleRenameKeyDown}
                                                    onBlur={handleSaveRename}
                                                    className="flex-1 ml-1 text-lg font-semibold tracking-tight bg-transparent border-b border-primary outline-none"
                                                />
                                            ) : (
                                                <>
                                                    <button
                                                        className="flex items-center gap-1 text-lg font-semibold tracking-tight hover:text-primary transition-colors"
                                                        onClick={() => toggleSection(section.id)}
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4" />
                                                        )}
                                                        {section.title}
                                                    </button>
                                                    <div className="flex items-center gap-1 group-hover:opacity-100 opacity-0 transition-opacity">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem
                                                                    onClick={() => handleStartRename(section)}
                                                                >
                                                                    <Pencil className="mr-2 h-4 w-4" />
                                                                    Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => handleDuplicateSection(section)}
                                                                >
                                                                    <Copy className="mr-2 h-4 w-4" />
                                                                    Duplicate
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => handleDeleteSection(section.id)}
                                                                    className="text-red-500 focus:text-red-500"
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </DragHandle>
                                    {isExpanded && (
                                        <div className="space-y-1 ml-5">
                                            <SortableContext
                                                items={getSortedSubSections(section['sub-sections'] || {}).map(
                                                    ([key]) => `${section.id}:${key}`,
                                                )}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                {/* Render existing subsections */}
                                                {section['sub-sections'] &&
                                                    typeof section['sub-sections'] === 'object' &&
                                                    !Array.isArray(section['sub-sections']) &&
                                                    getSortedSubSections(section['sub-sections']).map(
                                                        ([key, subSection]) => {
                                                            const isSelected =
                                                                selectedPage?.sectionId === section.id &&
                                                                selectedPage?.subSectionKey === key
                                                            const isEditing =
                                                                editingWorkflow?.sectionId === section.id &&
                                                                editingWorkflow?.subSectionKey === key

                                                            return (
                                                                <DragHandle key={key} id={`${section.id}:${key}`}>
                                                                    <div className="group/item flex items-center flex-1">
                                                                        {isEditing ? (
                                                                            <input
                                                                                ref={editInputRef}
                                                                                type="text"
                                                                                value={editingWorkflowTitle}
                                                                                onChange={(e) =>
                                                                                    setEditingWorkflowTitle(
                                                                                        e.target.value,
                                                                                    )
                                                                                }
                                                                                onKeyDown={handleWorkflowRenameKeyDown}
                                                                                onBlur={handleSaveWorkflowRename}
                                                                                className="flex-1 ml-1 text-sm bg-transparent border-b border-primary outline-none"
                                                                            />
                                                                        ) : (
                                                                            <>
                                                                                <Button
                                                                                    variant={
                                                                                        isSelected
                                                                                            ? 'secondary'
                                                                                            : 'ghost'
                                                                                    }
                                                                                    className="flex-1 justify-start font-normal h-8"
                                                                                    onClick={() =>
                                                                                        onSelectPage({
                                                                                            sectionId: section.id,
                                                                                            subSectionKey: key,
                                                                                            title: subSection.title,
                                                                                        })
                                                                                    }
                                                                                >
                                                                                    {subSection.title}
                                                                                </Button>
                                                                                <DropdownMenu>
                                                                                    <DropdownMenuTrigger asChild>
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="h-8 w-8 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                                                        >
                                                                                            <MoreHorizontal className="h-3 w-3" />
                                                                                        </Button>
                                                                                    </DropdownMenuTrigger>
                                                                                    <DropdownMenuContent align="end">
                                                                                        <DropdownMenuItem
                                                                                            onClick={() =>
                                                                                                handleStartWorkflowRename(
                                                                                                    section.id,
                                                                                                    key,
                                                                                                    subSection.title,
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            <Pencil className="mr-2 h-4 w-4" />
                                                                                            Edit
                                                                                        </DropdownMenuItem>
                                                                                        <DropdownMenuItem
                                                                                            onClick={() =>
                                                                                                handleDuplicateWorkflow(
                                                                                                    section.id,
                                                                                                    key,
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            <Copy className="mr-2 h-4 w-4" />
                                                                                            Duplicate
                                                                                        </DropdownMenuItem>
                                                                                        <DropdownMenuItem
                                                                                            onClick={() =>
                                                                                                handleDeleteWorkflow(
                                                                                                    section.id,
                                                                                                    key,
                                                                                                )
                                                                                            }
                                                                                            className="text-red-500 focus:text-red-500"
                                                                                        >
                                                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                                                            Delete
                                                                                        </DropdownMenuItem>
                                                                                    </DropdownMenuContent>
                                                                                </DropdownMenu>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </DragHandle>
                                                            )
                                                        },
                                                    )}
                                            </SortableContext>

                                            {/* Add Workflow button/input */}
                                            {addingWorkflowToSectionId === section.id ? (
                                                <input
                                                    ref={addWorkflowInputRef}
                                                    type="text"
                                                    value={newWorkflowTitle}
                                                    onChange={(e) => setNewWorkflowTitle(e.target.value)}
                                                    onKeyDown={handleAddWorkflowKeyDown}
                                                    onBlur={handleSaveNewWorkflow}
                                                    placeholder="Workflow name..."
                                                    className="w-full px-4 py-2 text-sm bg-transparent border-b border-primary outline-none"
                                                />
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    className="w-full justify-start font-normal text-muted-foreground text-sm"
                                                    onClick={() => handleStartAddWorkflow(section.id)}
                                                >
                                                    <Plus className="mr-2 h-3 w-3" />
                                                    Add Workflow
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </SortableContext>

                    {/* Add Section button/input */}
                    <div className="px-3 py-2">
                        {isAddingSection ? (
                            <div className="px-4">
                                <input
                                    ref={addInputRef}
                                    type="text"
                                    value={newSectionTitle}
                                    onChange={(e) => setNewSectionTitle(e.target.value)}
                                    onKeyDown={handleAddSectionKeyDown}
                                    onBlur={handleSaveNewSection}
                                    placeholder="Section name..."
                                    className="w-full text-lg font-semibold tracking-tight bg-transparent border-b border-primary outline-none"
                                />
                            </div>
                        ) : (
                            <Button
                                variant="ghost"
                                className="w-full justify-start font-normal text-muted-foreground"
                                onClick={handleStartAddSection}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Section
                            </Button>
                        )}
                    </div>
                </div>

                {/* Vault selector dropdown at the bottom */}
                <div className="px-3 py-2 border-t">
                    <VaultSelectorDropdown
                        vaultsConfig={vaultsConfig}
                        onSwitchVault={handleSwitchVault}
                        onOpenNewVault={handleOpenNewVault}
                        onRemoveVault={handleRemoveVault}
                        onOpenSecrets={handleOpenSecrets}
                        onOpenSettings={handleOpenSettings}
                        onOpenLogs={handleOpenLogs}
                    />
                </div>
            </div>

            {/* Secrets Dialog */}
            <SecretsDialog open={isSecretsDialogOpen} onOpenChange={setIsSecretsDialogOpen} />
            {/* Logs Dialog */}
            <LogsDialog open={isLogsDialogOpen} onOpenChange={setIsLogsDialogOpen} />
            {/* Delete Section Confirmation Dialog */}
            <AlertDialog open={!!sectionToDelete} onOpenChange={(open) => !open && setSectionToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Deleting a section will delete all its workflows
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteSection} className="bg-red-500 hover:bg-red-600">
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Workflow Confirmation Dialog */}
            <AlertDialog open={!!workflowToDelete} onOpenChange={(open) => !open && setWorkflowToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>Deleting a workflow will remove all its scripts</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteWorkflow} className="bg-red-500 hover:bg-red-600">
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Vault Name Dialog */}
            <VaultNameDialog
                open={isVaultNameDialogOpen}
                onOpenChange={setIsVaultNameDialogOpen}
                onConfirm={handleConfirmVaultName}
                onCancel={handleCancelVaultName}
            />

            {/* Remove Vault Confirmation Dialog */}
            <AlertDialog open={!!vaultToRemove} onOpenChange={(open) => !open && setVaultToRemove(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Vault?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove "{vaultToRemove?.name}" from your vault list? The vault
                            folder will not be deleted, but all associated secrets will be permanently removed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setVaultToRemove(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRemoveVault} className="bg-red-500 hover:bg-red-600">
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DndContext>
    )
}
