# Repository command environment

For every `uv` command run from this repository, set these environment variables in the same PowerShell process before invoking `uv`:

```powershell
New-Item -ItemType Directory -Force .tmp/uv-cache, .tmp/uv-tmp | Out-Null
$env:UV_CACHE_DIR = (Resolve-Path .tmp/uv-cache).Path
$env:TEMP = (Resolve-Path .tmp/uv-tmp).Path
$env:TMP = $env:TEMP
```

Keep these settings scoped to the command process. Do not change the Windows user or machine environment variables; other repositories may use their own `uv` directories.
