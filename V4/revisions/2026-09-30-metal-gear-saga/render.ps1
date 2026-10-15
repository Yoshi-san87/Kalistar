$ErrorActionPreference = 'Stop'
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
