# ScriptFlow Test Vault

A self-contained test vault with pre-configured workflows to manually verify all ScriptFlow features.

## How to Use

1. Open ScriptFlow
2. Add this folder (`test-vault/`) as a vault
3. All sections and workflows will appear pre-configured
4. Click "Run All" on each workflow to verify features

## Sections Overview

| Section | # Workflows | Expected Result |
|---------|-------------|-----------------|
| **1. Basic Execution** | 4 (one per language) | All GREEN |
| **2. Failure Handling** | 4 (one per language) | All RED (intentional) |
| **3. Environment Variables** | 5 (4 languages + multi-value) | All GREEN, output shows `MY_VAR` value |
| **4. Conditions** | 5 (equals/contains/startsWith/endsWith + failure) | 4 GREEN, 1 RED (intentional) |
| **5. Output Passing** | 4 (one per language) | All GREEN, consumer prints producer output |
| **6. Advanced** | 6 (stdout-only, full output, multiline, 3-chain, cross-lang, cond+pass) | All GREEN |

## What Each Section Tests

### 1. Basic Execution
Verifies that each script type (Bash, PowerShell, Python, C#) can be executed and exits cleanly.

### 2. Failure Handling (expect RED)
Verifies that scripts exiting with non-zero codes are correctly detected as failures. **These are supposed to be red.**

### 3. Environment Variables
- **Static**: Each language reads `MY_VAR=hello_from_scriptflow` and prints it
- **Multi-Value**: A dropdown variable with options `dev`, `staging`, `production` — select one before running

### 4. Conditions
Tests all 4 condition types on the connector between two scripts:
- **equals**: Last line must exactly match `SUCCESS`
- **contains**: Last line must contain `SUCC`
- **startsWith**: Last line must start with `SUCC`
- **endsWith**: Last line must end with `COMPLETE` (multi-line output)
- **Condition Failure**: Deliberately mismatched condition — **should be red**

### 5. Output Passing
Two-script chains where Script A's output is passed to Script B via `SCRIPT_OUTPUT` env var. Script B prints what it received.

### 6. Advanced
- **Stdout Only**: Proves `stdoutOnly=true` excludes stderr from the passed output
- **Full Output**: Proves `stdoutOnly=false` includes both stdout and stderr
- **Multi-line + Last-Line Condition**: 5-line output, condition checks only the last line
- **3-Script Chain**: A→B→C with output passing at each hop; proves env vars are cleared between hops
- **Cross-Language Chain**: Bash→Python→PowerShell passing output across languages
- **Condition + Output Pass Combined**: Both condition check AND output passing on the same connector

## Prerequisites

- **Bash**: Git Bash or WSL
- **PowerShell**: Available natively on Windows
- **Python 3**: `python3` must be on PATH
- **C# / .NET**: `dotnet` CLI must be installed (projects target `net8.0`)

## Script Locations

```
scripts/
├── bash/          (.sh files)
├── powershell/    (.ps1 files)
├── python/        (.py files)
└── csharp/        (dotnet console projects, each in its own folder)
```
