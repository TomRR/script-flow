import { ScriptTypeDetectorService, ScriptType } from './script-type-detector-service'

describe('ScriptTypeDetectorService', () => {
    describe('detectType', () => {
        describe('bash scripts', () => {
            test('detects .sh extension as bash', () => {
                expect(ScriptTypeDetectorService.detectType('script.sh')).toBe('bash')
            })

            test('detects .bash extension as bash', () => {
                expect(ScriptTypeDetectorService.detectType('script.bash')).toBe('bash')
            })

            test('detects .SH extension (uppercase) as bash', () => {
                expect(ScriptTypeDetectorService.detectType('script.SH')).toBe('bash')
            })

            test('detects .BASH extension (uppercase) as bash', () => {
                expect(ScriptTypeDetectorService.detectType('script.BASH')).toBe('bash')
            })

            test('detects .Sh extension (mixed case) as bash', () => {
                expect(ScriptTypeDetectorService.detectType('script.Sh')).toBe('bash')
            })

            test('detects bash script with full path', () => {
                expect(ScriptTypeDetectorService.detectType('/home/user/scripts/deploy.sh')).toBe('bash')
            })

            test('detects bash script with Windows path', () => {
                expect(ScriptTypeDetectorService.detectType('C:\\Users\\scripts\\deploy.sh')).toBe('bash')
            })
        })

        describe('powershell scripts', () => {
            test('detects .ps1 extension as powershell', () => {
                expect(ScriptTypeDetectorService.detectType('install.ps1')).toBe('powershell')
            })

            test('detects .ps extension as powershell', () => {
                expect(ScriptTypeDetectorService.detectType('script.ps')).toBe('powershell')
            })

            test('detects .PS1 extension (uppercase) as powershell', () => {
                expect(ScriptTypeDetectorService.detectType('script.PS1')).toBe('powershell')
            })

            test('detects powershell script with full path', () => {
                expect(ScriptTypeDetectorService.detectType('/home/user/scripts/install.ps1')).toBe('powershell')
            })
        })

        describe('python scripts', () => {
            test('detects .py extension as python', () => {
                expect(ScriptTypeDetectorService.detectType('script.py')).toBe('python')
            })

            test('detects .PY extension (uppercase) as python', () => {
                expect(ScriptTypeDetectorService.detectType('script.PY')).toBe('python')
            })

            test('detects python script with full path', () => {
                expect(ScriptTypeDetectorService.detectType('/home/user/scripts/main.py')).toBe('python')
            })

            test('detects python script with Windows path', () => {
                expect(ScriptTypeDetectorService.detectType('C:\\Users\\scripts\\main.py')).toBe('python')
            })
        })

        describe('csharp scripts', () => {
            test('detects .cs extension as csharp', () => {
                expect(ScriptTypeDetectorService.detectType('script.cs')).toBe('csharp')
            })

            test('detects .CS extension (uppercase) as csharp', () => {
                expect(ScriptTypeDetectorService.detectType('script.CS')).toBe('csharp')
            })

            test('detects csharp script with full path', () => {
                expect(ScriptTypeDetectorService.detectType('/home/user/scripts/Program.cs')).toBe('csharp')
            })
        })

        describe('custom scripts', () => {
            test('detects .bat extension as custom', () => {
                expect(ScriptTypeDetectorService.detectType('install.bat')).toBe('custom')
            })

            test('detects .cmd extension as custom', () => {
                expect(ScriptTypeDetectorService.detectType('setup.cmd')).toBe('custom')
            })

            test('detects .BAT extension (uppercase) as custom', () => {
                expect(ScriptTypeDetectorService.detectType('install.BAT')).toBe('custom')
            })

            test('detects .CMD extension (uppercase) as custom', () => {
                expect(ScriptTypeDetectorService.detectType('setup.CMD')).toBe('custom')
            })

            test('detects .exe extension as custom', () => {
                expect(ScriptTypeDetectorService.detectType('program.exe')).toBe('custom')
            })

            test('detects .js extension as custom', () => {
                expect(ScriptTypeDetectorService.detectType('script.js')).toBe('custom')
            })

            test('detects .rb extension as custom', () => {
                expect(ScriptTypeDetectorService.detectType('script.rb')).toBe('custom')
            })

            test('detects .pl extension as custom', () => {
                expect(ScriptTypeDetectorService.detectType('script.pl')).toBe('custom')
            })
        })

        describe('edge cases', () => {
            test('detects file without extension as custom', () => {
                expect(ScriptTypeDetectorService.detectType('Makefile')).toBe('custom')
            })

            test('detects file with only dot as custom', () => {
                expect(ScriptTypeDetectorService.detectType('.bashrc')).toBe('custom')
            })

            test('detects file with multiple dots in name', () => {
                expect(ScriptTypeDetectorService.detectType('my.script.name.sh')).toBe('bash')
            })

            test('detects empty string as custom', () => {
                expect(ScriptTypeDetectorService.detectType('')).toBe('custom')
            })

            test('detects relative path correctly', () => {
                expect(ScriptTypeDetectorService.detectType('scripts/deploy.sh')).toBe('bash')
            })

            test('detects nested path with spaces', () => {
                expect(ScriptTypeDetectorService.detectType('My Scripts/deploy.sh')).toBe('bash')
            })

            test('detects unknown extension as custom', () => {
                expect(ScriptTypeDetectorService.detectType('document.pdf')).toBe('custom')
            })

            test('detects file with extension in path segments', () => {
                expect(ScriptTypeDetectorService.detectType('/home/user/scripts.sh/config.py')).toBe('python')
            })
        })
    })
})
