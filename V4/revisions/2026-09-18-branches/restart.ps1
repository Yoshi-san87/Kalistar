$ErrorActionPreference = 'Stop'
$atelier = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../../atelier')).Path
$runtime = Get-Content -Raw -LiteralPath (Join-Path $atelier 'data/runtime.json') | ConvertFrom-Json
$state = Invoke-RestMethod -Uri ($runtime.url + '/api/status') -TimeoutSec 15
$active = @($state.jobs | Where-Object { $_.state -in @('checking','rendering','verifying','queued') })
if ($active.Count -gt 0) { throw 'Un travail Atelier est actif. Ne pas interrompre.' }
$process = Get-CimInstance Win32_Process -Filter "ProcessId = $($runtime.pid)"
if (-not $process -or $process.CommandLine -notmatch 'server\.cjs') { throw 'Service non identifie.' }
$node = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
if ($process.ExecutablePath -ne $node) { throw 'Executable inattendu.' }
Stop-Process -Id $runtime.pid
Start-Sleep -Milliseconds 700
$new = Start-Process -FilePath $node -ArgumentList @('server.cjs') -WorkingDirectory $atelier -WindowStyle Hidden -RedirectStandardOutput (Join-Path $atelier 'data/server.log') -RedirectStandardError (Join-Path $atelier 'data/server-error.log') -PassThru
for ($i=0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    $current = Get-Content -Raw -LiteralPath (Join-Path $atelier 'data/runtime.json') | ConvertFrom-Json
    if ($current.pid -eq $new.Id) {
        try {
            $status = Invoke-RestMethod -Uri ($current.url + '/api/status') -TimeoutSec 2
            if ($status.integrity.state -eq 'intact') { Write-Output ($current | ConvertTo-Json); exit 0 }
        } catch { }
    }
}
throw 'Le service redemarre ne repond pas encore.'
