$ErrorActionPreference = 'Stop'
if ($env:KALISTAR_SKULL_PS_GRANTED -ne '2026-10-01') { throw 'Explicit parent Photoshop grant required.' }
$lockPath = Join-Path $PSScriptRoot '../../atelier/data/render.lock'
if (-not (Test-Path -LiteralPath $lockPath)) { throw 'Run through revise.cjs render to acquire the process lock.' }
$mutex = New-Object System.Threading.Mutex($false, 'Local\KalistarV4AtelierRender')
$held = $false
try {
    $held = $mutex.WaitOne(0)
    if (-not $held) { throw 'Kalistar native renderer busy.' }
    $photoshop = [System.Runtime.InteropServices.Marshal]::GetActiveObject('Photoshop.Application.190')
    if ($photoshop.Version -ne '26.11.7') { throw 'Wrong Photoshop version.' }
    Write-Output $photoshop.DoJavaScriptFile((Join-Path $PSScriptRoot 'compose.jsx'))
} finally {
    if ($held) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
