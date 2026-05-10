import { ScriptCommandService } from './script-command-service'

describe('ScriptCommandService', () => {
    test('translates Windows bash script paths to Git Bash format', () => {
        const command = ScriptCommandService.buildCommand({ type: 'bash' }, 'C:\\dev\\ScriptVault\\MR\\mr.sh', {
            platform: 'win32',
            bashCommand: 'C:\\Program Files\\Git\\bin\\bash.exe',
        })

        expect(command).toEqual({
            command: 'C:\\Program Files\\Git\\bin\\bash.exe',
            args: ['/c/dev/ScriptVault/MR/mr.sh'],
        })
    })

    test('keeps Windows bash paths with spaces as a single argument', () => {
        const command = ScriptCommandService.buildCommand({ type: 'bash' }, 'C:\\My Scripts\\deploy script.sh', {
            platform: 'win32',
            bashCommand: 'C:\\Program Files\\Git\\bin\\bash.exe',
        })

        expect(command.args).toEqual(['/c/My Scripts/deploy script.sh'])
        expect(command.args).toHaveLength(1)
    })

    test('keeps non-Windows bash paths unchanged', () => {
        const command = ScriptCommandService.buildCommand({ type: 'bash' }, '/Users/tom/scripts/deploy.sh', {
            platform: 'darwin',
        })

        expect(command).toEqual({
            command: 'bash',
            args: ['/Users/tom/scripts/deploy.sh'],
        })
    })
})
