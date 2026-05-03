import { useState, useEffect } from 'react'
import { PanelLeft } from 'lucide-react'
import { Button } from './components/ui/button'
import { Toaster } from './components/ui/sonner'
import { Sidebar } from './features/sidebar/components/Sidebar'
import { Welcome } from './components/Welcome'
import { WorkflowPage } from './features/workflow/components/WorkflowPage'
import { FeedbackProvider } from './features/feedback'

export interface SelectedPage {
    sectionId: string
    subSectionKey: string
    title: string
}

function App() {
    const [isConfigured, setIsConfigured] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [selectedPage, setSelectedPage] = useState<SelectedPage | null>(null)
    const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(true)

    const toggleSidebar = () => {
        setIsSidebarVisible((prev) => !prev)
    }

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const isMac = navigator.platform.toLowerCase().includes('mac')
            const modifierKey = isMac ? event.metaKey : event.ctrlKey

            if (modifierKey && event.key === 'b') {
                event.preventDefault()
                toggleSidebar()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    useEffect(() => {
        const checkConfig = async () => {
            try {
                const vaultPath = await window.api.vault.checkConfig()
                if (vaultPath) {
                    setIsConfigured(true)
                }
            } catch (error) {
                console.error('Failed to check config:', error)
            } finally {
                setIsLoading(false)
            }
        }
        checkConfig()
    }, [])

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <p className="text-muted-foreground animate-pulse">Loading...</p>
            </div>
        )
    }

    const appId = import.meta.env.VITE_APP_ID || 'scriptflow-desktop-dev'
    const version = import.meta.env.VITE_APP_VERSION || '0.0.0'

    if (!isConfigured) {
        return (
            <FeedbackProvider appId={appId} version={version}>
                <Welcome onInitSuccess={() => setIsConfigured(true)} />
            </FeedbackProvider>
        )
    }

    return (
        <FeedbackProvider appId={appId} version={version}>
            <div className="flex h-screen bg-background">
                {/* Sidebar */}
                {isSidebarVisible ? (
                    <aside className="w-64 border-r bg-muted/30 flex flex-col">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h1 className="text-xl font-bold tracking-tight">Scriptflow</h1>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleSidebar}
                                className="h-8 w-8"
                                title="Toggle Sidebar (Cmd/Ctrl + B)"
                            >
                                <PanelLeft className="h-4 w-4" />
                            </Button>
                        </div>
                        <Sidebar className="p-2 flex-1" selectedPage={selectedPage} onSelectPage={setSelectedPage} />
                    </aside>
                ) : (
                    <div className="w-10 border-r bg-muted/30 flex flex-col items-center py-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            className="h-8 w-8"
                            title="Toggle Sidebar (Cmd/Ctrl + B)"
                        >
                            <PanelLeft className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* Main Content */}
                <main className="flex-1 overflow-auto bg-background p-6">
                    {selectedPage ? (
                        <>
                            <WorkflowPage
                                key={`${selectedPage.sectionId}-${selectedPage.subSectionKey}`}
                                sectionId={selectedPage.sectionId}
                                subSectionKey={selectedPage.subSectionKey}
                                title={selectedPage.title}
                            />
                        </>
                    ) : (
                        <>
                            <h1 className="text-2xl font-bold">Welcome to Scriptflow</h1>
                            <p className="text-muted-foreground mt-2">
                                Select a workflow from the sidebar to get started.
                            </p>
                        </>
                    )}
                </main>
                <Toaster />
            </div>
        </FeedbackProvider>
    )
}

export default App
