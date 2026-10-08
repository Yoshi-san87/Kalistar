$ErrorActionPreference = 'Stop'
$mutex = New-Object System.Threading.Mutex($false, 'Local\KalistarV4AtelierRender')
$held = $false
try {
    $held = $mutex.WaitOne(0)
    if (-not $held) { throw 'Une composition Kalistar est deja en cours.' }
    $photoshop = [System.Runtime.InteropServices.Marshal]::GetActiveObject('Photoshop.Application.190')
    if ($photoshop.Version -ne '26.11.8') { throw 'Photoshop 26.11.8 requis.' }
    Write-Output $photoshop.DoJavaScriptFile((Join-Path $PSScriptRoot 'compose.jsx'))
} finally {
    if ($held) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}

