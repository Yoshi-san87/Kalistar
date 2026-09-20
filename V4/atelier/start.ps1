$ErrorActionPreference = 'Stop'
$node = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
if (-not (Test-Path -LiteralPath $node)) { throw 'Node.js local introuvable.' }
$data = Join-Path $PSScriptRoot 'data'
$runtimePath = Join-Path $data 'runtime.json'
$running = $false
if (Test-Path -LiteralPath $runtimePath) {
    $runtime = Get-Content -Raw -LiteralPath $runtimePath | ConvertFrom-Json
    try {
        $response = Invoke-RestMethod -Uri ($runtime.url + '/api/status') -TimeoutSec 3
        $running = $null -ne $response.integrity
    } catch { }
}
if (-not $running) {
    Start-Process -FilePath $node -ArgumentList @('server.cjs') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $data 'server.log') -RedirectStandardError (Join-Path $data 'server-error.log')
    for ($i = 0; $i -lt 40; $i++) {
        Start-Sleep -Milliseconds 250
        if (Test-Path -LiteralPath $runtimePath) {
            $runtime = Get-Content -Raw -LiteralPath $runtimePath | ConvertFrom-Json
            try { $null = Invoke-RestMethod -Uri ($runtime.url + '/api/status') -TimeoutSec 1; $running = $true; break } catch { }
        }
    }
}
if (-not $running) { throw 'Le service Atelier ne repond pas. Consulter data/server-error.log.' }
Start-Process ($runtime.url + '/jeu/#atelier')
