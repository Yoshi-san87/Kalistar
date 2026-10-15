param(
    [ValidateSet('Game', 'Atelier')]
    [string]$View = 'Atelier',
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$data = Join-Path $PSScriptRoot 'data'
$runtimePath = Join-Path $data 'runtime.json'
function Get-RunningRuntime {
    try {
        $candidate = Get-Content -Raw -LiteralPath $runtimePath | ConvertFrom-Json
        $uri = [uri]$candidate.url
        if ($uri.Scheme -ne 'http' -or $uri.Host -ne '127.0.0.1' -or
            $uri.AbsolutePath -ne '/' -or $uri.UserInfo -or $uri.Query -or $uri.Fragment) { return }
        $lock = Get-Content -Raw -LiteralPath (Join-Path $data 'server.lock') | ConvertFrom-Json
        if (-not $candidate.pid -or $candidate.pid -ne $lock.pid) { return }
        $response = Invoke-RestMethod -Uri ($candidate.url.TrimEnd('/') + '/api/status') -TimeoutSec 3
        if ($response.integrity.state -in @('checking', 'intact', 'changed')) { return $candidate }
    } catch { return }
}

$runtime = Get-RunningRuntime
if (-not $runtime) {
    $node = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    if (-not (Test-Path -LiteralPath $node -PathType Leaf)) {
        $command = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $command) { throw 'Node.js introuvable. Installer Node.js ou configurer le runtime local avant de lancer Kalistar.' }
        $node = $command.Source
    }
    $null = New-Item -ItemType Directory -Force -Path $data
    $errorLog = Join-Path $data 'server-error.log'
    $service = Start-Process -FilePath $node -ArgumentList @('server.cjs') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $data 'server.log') -RedirectStandardError $errorLog -PassThru
    $deadline = (Get-Date).AddSeconds(60)
    do {
        Start-Sleep -Milliseconds 250
        $runtime = Get-RunningRuntime
        if ($runtime) { break }
        $service.Refresh()
        if ($service.HasExited) { break }
    } while ((Get-Date) -lt $deadline)
    if (-not $runtime) {
        if (Test-Path -LiteralPath $errorLog) { Get-Content -LiteralPath $errorLog -Tail 12 | Write-Host }
        throw "Le service Kalistar ne repond pas. Consulter : $errorLog"
    }
}
$url = $runtime.url.TrimEnd('/') + '/jeu/'
if ($View -eq 'Atelier') { $url += '#atelier' }
Write-Host "Kalistar est pret : $url"
if (-not $NoBrowser) { Start-Process $url }
