$ErrorActionPreference = 'Stop'
$mutex = New-Object System.Threading.Mutex($false, 'Local\KalistarV4AtelierRender')
$held = $false
try {
    $held = $mutex.WaitOne(0)
    if (-not $held) { throw 'Composition already active' }
    $photoshop = [System.Runtime.InteropServices.Marshal]::GetActiveObject('Photoshop.Application.190')
    if ($photoshop.Version -ne '26.11.7') { throw 'Unexpected Photoshop version' }
    $photoshop.DoJavaScriptFile((Join-Path $PSScriptRoot 'inspect-smart-object.jsx'))
} finally {
    if ($held) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
