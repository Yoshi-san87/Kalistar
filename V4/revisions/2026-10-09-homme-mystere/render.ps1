$ErrorActionPreference = 'Stop'
$mutex = New-Object System.Threading.Mutex($false, 'Local\KalistarV4AtelierRender')
$held = $false
try {
 $held = $mutex.WaitOne(0)
 if (-not $held) { throw 'Another native render is running.' }
 $ps = [System.Runtime.InteropServices.Marshal]::GetActiveObject('Photoshop.Application.190')
 if ($ps.Version -ne '26.11.8') { throw 'Unexpected Photoshop version.' }
 Write-Output $ps.DoJavaScriptFile((Join-Path $PSScriptRoot 'rename.jsx'))
} finally {
 if ($held) { $mutex.ReleaseMutex() }
 $mutex.Dispose()
}
