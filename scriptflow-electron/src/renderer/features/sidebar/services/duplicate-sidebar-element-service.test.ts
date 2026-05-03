import { DuplicateSidebarElementService } from './duplicate-sidebar-element-service'

const mockVault = {
    duplicateSection: jest.fn(),
    duplicateSubSection: jest.fn(),
}

describe('DuplicateSidebarElementService', () => {
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

    test('duplicateSection calls vault.duplicateSection', async () => {
        const mockSection = { id: '2', title: 'Original New', 'sub-sections': {}, placement: 1 }
        mockVault.duplicateSection.mockResolvedValue(mockSection)

        const result = await DuplicateSidebarElementService.duplicateSection('1')
        expect(mockVault.duplicateSection).toHaveBeenCalledWith('1')
        expect(result).toEqual(mockSection)
    })

    test('duplicateSubSection calls vault.duplicateSubSection', async () => {
        const mockSubSection = { key: 'abc', subSection: { title: 'Workflow New', placement: 1 } }
        mockVault.duplicateSubSection.mockResolvedValue(mockSubSection)

        const result = await DuplicateSidebarElementService.duplicateSubSection('1', 'orig')
        expect(mockVault.duplicateSubSection).toHaveBeenCalledWith('1', 'orig')
        expect(result).toEqual(mockSubSection)
    })
})
