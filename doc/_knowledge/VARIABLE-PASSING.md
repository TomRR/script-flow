# Variable Passing Between Scripts

ScriptFlow connects scripts in a workflow using **environment variables**. When enabled on a connector, the entire captured output of Script A is stored in an environment variable that Script B can read.

## Setup (in the UI)

1. Click the **connector** (the link icon) between two scripts
2. Enable **"Pass Output as Environment Variable"**
3. Set a **Variable Name** (e.g., `RESULT`)
4. Optionally toggle **"Stdout only"** to exclude stderr from the passed value

## Key Behavior

- The **full output** is passed — not just the last line. Multi-line output, JSON, etc. all work.
- Each script's output is only passed to the **immediate next script**. It is cleared before the script after that.
- The connector condition checker and output pass are **independent** — you can use one without the other.
- If "Stdout only" is disabled (default), both stdout and stderr are included in the passed value.

---

## Bash

**File extension:** `.sh`

### Sending a value (print to stdout)

```bash
echo "my_value"
```

### Receiving a value (read environment variable)

```bash
echo "$RESULT"
# or
echo "${RESULT}"
```

### Example: curl API call

```bash
#!/usr/bin/env bash
set -euo pipefail

# -s suppresses progress bar (which goes to stderr)
response=$(curl -s --header "PRIVATE-TOKEN: $API_TOKEN" \
  "https://api.example.com/projects/$PROJECT_ID/data")

echo "$response"
```

### Tips

- **Always use `curl -s`** — without it, curl writes progress info to stderr, which pollutes the output unless "Stdout only" is enabled.
- Everything printed to stdout across the whole script is captured. If you only want specific output, redirect debug info to stderr: `echo "debug" >&2`
- To pass only a specific field from JSON, pipe through `jq`: `curl -s ... | jq -r '.token'`

---

## Python

**File extension:** `.py`

### Sending a value (print to stdout)

```python
print("my_value")
```

### Receiving a value (read environment variable)

```python
import os

value = os.environ.get("RESULT", "")
# or (raises KeyError if not set):
value = os.environ["RESULT"]
```

### Example: HTTP request

```python
import os
import urllib.request
import json

token = os.environ.get("API_TOKEN", "")
project_id = os.environ.get("PROJECT_ID", "")

url = f"https://api.example.com/projects/{project_id}/data"
req = urllib.request.Request(url, headers={"PRIVATE-TOKEN": token})

with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())

# Print the result — this becomes the output for the next script
print(json.dumps(data, indent=2))
```

### Tips

- ScriptFlow runs Python with `-u` (unbuffered) so output streams in real time.
- Use `print()` for values you want to pass. Use `print(..., file=sys.stderr)` for debug output that shouldn't be passed.
- `os.environ.get("VAR", "default")` is safer than `os.environ["VAR"]` — it won't crash if the variable isn't set.

---

## C\#

**Script type:** `csharp` (runs via `dotnet run`)

### Sending a value (print to stdout)

```csharp
Console.WriteLine("my_value");
```

### Receiving a value (read environment variable)

```csharp
string? value = Environment.GetEnvironmentVariable("RESULT");
```

### Example: HTTP request

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static async Task Main()
    {
        var token = Environment.GetEnvironmentVariable("API_TOKEN") ?? "";
        var projectId = Environment.GetEnvironmentVariable("PROJECT_ID") ?? "";

        using var client = new HttpClient();
        client.DefaultRequestHeaders.Add("PRIVATE-TOKEN", token);

        var url = $"https://api.example.com/projects/{projectId}/data";
        var response = await client.GetStringAsync(url);

        // Print the result — this becomes the output for the next script
        Console.WriteLine(response);
    }
}
```

### Tips

- Use `Console.WriteLine()` for output you want to pass. Use `Console.Error.WriteLine()` for debug output.
- `Environment.GetEnvironmentVariable()` returns `null` if the variable isn't set — always handle this with `??` or a null check.

---

## PowerShell

**File extension:** `.ps1`

### Sending a value (print to stdout)

```powershell
Write-Output "my_value"
```

### Receiving a value (read environment variable)

```powershell
$value = $env:RESULT
```

### Example: HTTP request

```powershell
$headers = @{
    "PRIVATE-TOKEN" = $env:API_TOKEN
}

$url = "https://api.example.com/projects/$env:PROJECT_ID/data"
$response = Invoke-RestMethod -Uri $url -Headers $headers

# Print the result — this becomes the output for the next script
$response | ConvertTo-Json -Depth 10
```

### Tips

- Use `Write-Output` (or just return a value) for output you want to pass. Use `Write-Host` or `Write-Warning` for debug output (these go to stderr/console, not stdout).
- PowerShell objects are not strings — use `ConvertTo-Json` if the next script expects JSON.
- `Invoke-RestMethod` automatically parses JSON responses into PowerShell objects, unlike `Invoke-WebRequest` which returns the raw response.

---

## Custom

For the custom script type, you define the command yourself (e.g., `node --experimental-modules`). The same rules apply:

- **Send** by printing to stdout (e.g., `console.log()` in Node.js)
- **Receive** by reading environment variables (e.g., `process.env.RESULT` in Node.js)

---

## Known Limitation

The **condition checker** always evaluates against the combined stdout + stderr output, while the **output pass** respects the "Stdout only" toggle. This means if a script writes a warning to stderr as its last output, the condition might fail even though stdout had the correct value — but the output pass (with "Stdout only" enabled) would still pass the correct stdout value.

**Workaround:** Ensure your scripts write the expected condition value as the very last line of stdout, and redirect any debug/warning output to stderr.
