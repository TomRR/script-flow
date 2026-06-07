import type { ScriptEntry } from '../../../../renderer.d'
import { ScriptRunnerSelectionService, UNSUPPORTED_AUTO_RUNNER_MESSAGE } from './script-runner-selection-service'

function createScript(overrides: Partial<ScriptEntry> = {}): ScriptEntry {
    return {
        id: '1',
        name: 'Deploy',
        type: 'bash',
        path: '/scripts/deploy.sh',
        placement: 0,
        ...overrides,
    }
}

describe('ScriptRunnerSelectionService', () => {
    describe('detectAutoType', () => {
        test('detects built-in runners for auto mode', () => {
            expect(ScriptRunnerSelectionService.detectAutoType('deploy.sh')).toBe('bash')
            expect(ScriptRunnerSelectionService.detectAutoType('deploy.bash')).toBe('bash')
            expect(ScriptRunnerSelectionService.detectAutoType('build.py')).toBe('python')
            expect(ScriptRunnerSelectionService.detectAutoType('Program.cs')).toBe('csharp')
            expect(ScriptRunnerSelectionService.detectAutoType('TestProject.csproj')).toBe('csharp')
            expect(ScriptRunnerSelectionService.detectAutoType('install.ps1')).toBe('powershell')
            expect(ScriptRunnerSelectionService.detectAutoType('install.ps')).toBe('powershell')
        })

        test('does not auto-detect custom-like files', () => {
            expect(ScriptRunnerSelectionService.detectAutoType('setup.bat')).toBeNull()
            expect(ScriptRunnerSelectionService.detectAutoType('setup.cmd')).toBeNull()
            expect(ScriptRunnerSelectionService.detectAutoType('script.js')).toBeNull()
        })
    })

    describe('getMode', () => {
        test('uses saved mode when it is valid', () => {
            expect(ScriptRunnerSelectionService.getMode(createScript({ scriptTypeMode: 'auto' }))).toBe('auto')
            expect(ScriptRunnerSelectionService.getMode(createScript({ scriptTypeMode: 'manual' }))).toBe('manual')
        })

        test('infers auto for existing scripts when type matches the detected runner', () => {
            expect(
                ScriptRunnerSelectionService.getMode(createScript({ type: 'python', path: '/scripts/build.py' })),
            ).toBe('auto')
        })

        test('infers manual for existing scripts when type does not match detection', () => {
            expect(
                ScriptRunnerSelectionService.getMode(createScript({ type: 'bash', path: '/scripts/build.py' })),
            ).toBe('manual')
        })

        test('keeps explicit auto mode when the path is unsupported', () => {
            expect(
                ScriptRunnerSelectionService.getMode(
                    createScript({ type: 'custom', path: '/scripts/setup.cmd', scriptTypeMode: 'auto' }),
                ),
            ).toBe('auto')
        })
    })

    describe('getScriptDefaults', () => {
        test('defaults built-in scripts to auto mode', () => {
            expect(ScriptRunnerSelectionService.getScriptDefaults('/scripts/build.py')).toEqual({
                type: 'python',
                scriptTypeMode: 'auto',
            })
        })

        test('defaults .csproj scripts to auto csharp mode', () => {
            expect(ScriptRunnerSelectionService.getScriptDefaults('/scripts/TestProject.csproj')).toEqual({
                type: 'csharp',
                scriptTypeMode: 'auto',
            })
        })

        test('defaults custom-like scripts to manual custom', () => {
            expect(ScriptRunnerSelectionService.getScriptDefaults('/scripts/setup.cmd')).toEqual({
                type: 'custom',
                scriptTypeMode: 'manual',
            })
        })
    })

    describe('updates', () => {
        test('switches to auto mode with the detected runner', () => {
            expect(ScriptRunnerSelectionService.updateMode(createScript({ type: 'custom' }), 'auto')).toEqual(
                expect.objectContaining({
                    type: 'bash',
                    scriptTypeMode: 'auto',
                }),
            )
        })

        test('keeps unsupported paths in auto mode when auto is requested', () => {
            expect(
                ScriptRunnerSelectionService.updateMode(
                    createScript({ type: 'custom', path: '/scripts/setup.cmd' }),
                    'auto',
                ),
            ).toEqual(
                expect.objectContaining({
                    type: 'custom',
                    scriptTypeMode: 'auto',
                }),
            )
        })

        test('updates manual runner selection', () => {
            expect(ScriptRunnerSelectionService.updateManualType(createScript(), 'powershell')).toEqual(
                expect.objectContaining({
                    type: 'powershell',
                    scriptTypeMode: 'manual',
                }),
            )
        })

        test('updates auto script type when selecting a supported file', () => {
            expect(
                ScriptRunnerSelectionService.updatePath(createScript({ scriptTypeMode: 'auto' }), '/scripts/build.py'),
            ).toEqual(
                expect.objectContaining({
                    path: '/scripts/build.py',
                    type: 'python',
                    scriptTypeMode: 'auto',
                }),
            )
        })

        test('keeps auto mode when auto selects an unsupported file', () => {
            expect(
                ScriptRunnerSelectionService.updatePath(
                    createScript({ scriptTypeMode: 'auto', customCommand: 'node' }),
                    '/scripts/setup.cmd',
                ),
            ).toEqual(
                expect.objectContaining({
                    path: '/scripts/setup.cmd',
                    type: 'bash',
                    scriptTypeMode: 'auto',
                    customCommand: 'node',
                }),
            )
        })

        test('keeps manual runner when selecting a new file', () => {
            expect(
                ScriptRunnerSelectionService.updatePath(
                    createScript({ type: 'python', scriptTypeMode: 'manual' }),
                    '/scripts/Program.cs',
                ),
            ).toEqual(
                expect.objectContaining({
                    path: '/scripts/Program.cs',
                    type: 'python',
                    scriptTypeMode: 'manual',
                }),
            )
        })
    })

    describe('unsupported auto warnings', () => {
        test('returns warning when auto cannot detect a runner', () => {
            expect(
                ScriptRunnerSelectionService.getUnsupportedAutoWarning(
                    createScript({ path: '/scripts/main.ts', scriptTypeMode: 'auto' }),
                ),
            ).toBe(UNSUPPORTED_AUTO_RUNNER_MESSAGE)
        })

        test('does not return warning for detected auto scripts', () => {
            expect(
                ScriptRunnerSelectionService.getUnsupportedAutoWarning(
                    createScript({ path: '/scripts/TestProject.csproj', scriptTypeMode: 'auto' }),
                ),
            ).toBeNull()
        })

        test('returns the first unsupported auto warning for workflow guards', () => {
            expect(
                ScriptRunnerSelectionService.getFirstUnsupportedAutoWarning([
                    createScript({ path: '/scripts/build.py', scriptTypeMode: 'auto' }),
                    createScript({ path: '/scripts/main.ts', scriptTypeMode: 'auto' }),
                ]),
            ).toBe(UNSUPPORTED_AUTO_RUNNER_MESSAGE)
        })
    })
})
