import { SidebarService } from './sidebar-service'

// Mock the global window object
const mockVault = {
    getSections: jest.fn(),
    addSection: jest.fn(),
    updateSection: jest.fn(),
    deleteSection: jest.fn(),
    addSubSection: jest.fn(),
    deleteSubSection: jest.fn(),
    updateSubSection: jest.fn(),
    select: jest.fn(),
    init: jest.fn(),
    openConfigDirectory: jest.fn(),
    getVaults: jest.fn(),
    setActiveVault: jest.fn(),
    addVault: jest.fn(),
    removeVault: jest.fn(),
    updateVaultName: jest.fn(),
}

describe('SidebarService', () => {
    beforeAll(() => {
        Object.defineProperty(window, 'api', {
            value: {
                vault: mockVault,
            },
            writable: true,
        })
    })

    beforeEach(() => {
        jest.clearAllMocks()
    })

    test('getSections calls vault.getSections', async () => {
        const mockSections = [{ id: '1', title: 'Test', 'sub-sections': {}, placement: 0 }]
        mockVault.getSections.mockResolvedValue(mockSections)

        const result = await SidebarService.getSections()
        expect(mockVault.getSections).toHaveBeenCalled()
        expect(result).toEqual(mockSections)
    })

    test('addSection calls vault.addSection', async () => {
        const mockSection = { id: '2', title: 'New', 'sub-sections': {}, placement: 1 }
        mockVault.addSection.mockResolvedValue(mockSection)

        const result = await SidebarService.addSection('New')
        expect(mockVault.addSection).toHaveBeenCalledWith('New')
        expect(result).toEqual(mockSection)
    })

    test('updateSection calls vault.updateSection', async () => {
        const mockSection = { id: '1', title: 'Updated', 'sub-sections': {}, placement: 0 }
        mockVault.updateSection.mockResolvedValue(mockSection)

        const result = await SidebarService.updateSection('1', 'Updated')
        expect(mockVault.updateSection).toHaveBeenCalledWith('1', 'Updated')
        expect(result).toEqual(mockSection)
    })

    test('deleteSection calls vault.deleteSection', async () => {
        mockVault.deleteSection.mockResolvedValue(true)

        const result = await SidebarService.deleteSection('1')
        expect(mockVault.deleteSection).toHaveBeenCalledWith('1')
        expect(result).toBe(true)
    })

    test('addSubSection calls vault.addSubSection', async () => {
        const mockSub = { key: 'abc', subSection: { title: 'Sub', placement: 0 } }
        mockVault.addSubSection.mockResolvedValue(mockSub)

        const result = await SidebarService.addSubSection('1', 'Sub')
        expect(mockVault.addSubSection).toHaveBeenCalledWith('1', 'Sub')
        expect(result).toEqual(mockSub)
    })

    test('deleteSubSection calls vault.deleteSubSection', async () => {
        mockVault.deleteSubSection.mockResolvedValue(true)

        const result = await SidebarService.deleteSubSection('1', 'abc')
        expect(mockVault.deleteSubSection).toHaveBeenCalledWith('1', 'abc')
        expect(result).toBe(true)
    })

    test('updateSubSection calls vault.updateSubSection', async () => {
        mockVault.updateSubSection.mockResolvedValue(true)

        const result = await SidebarService.updateSubSection('1', 'abc', 'New Title')
        expect(mockVault.updateSubSection).toHaveBeenCalledWith('1', 'abc', 'New Title')
        expect(result).toBe(true)
    })

    test('updateVaultName calls vault.updateVaultName', async () => {
        mockVault.updateVaultName.mockResolvedValue(true)

        const result = await SidebarService.updateVaultName('vault-123', 'New Name')
        expect(mockVault.updateVaultName).toHaveBeenCalledWith('vault-123', 'New Name')
        expect(result).toBe(true)
    })

    test('updateVaultName returns false on failure', async () => {
        mockVault.updateVaultName.mockResolvedValue(false)

        const result = await SidebarService.updateVaultName('vault-123', 'New Name')
        expect(result).toBe(false)
    })
})
