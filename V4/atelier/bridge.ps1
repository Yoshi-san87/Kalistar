$ErrorActionPreference = 'Stop'
$mutex = New-Object System.Threading.Mutex($false, 'Local\KalistarV4AtelierRender')
$held = $false
try {
    $held = $mutex.WaitOne(0)
    if (-not $held) { throw 'Une composition Kalistar est deja en cours.' }
    $script = Join-Path $PSScriptRoot 'worker.jsx'
    $photoshop = New-Object -ComObject Photoshop.Application.190
    $result = $photoshop.DoJavaScriptFile($script)
    Write-Output $result
} finally {
    if ($held) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
