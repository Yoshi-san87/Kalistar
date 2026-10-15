param([ValidateSet('inspect','extract','effects','frames')][string]$Mode = 'extract')
$ErrorActionPreference = 'Stop'
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned -Force
$mutex = New-Object System.Threading.Mutex($false, 'Local\KalistarV4AtelierRender')
$held = $false
try {
    $held = $mutex.WaitOne(0)
    if (-not $held) { throw 'Kalistar Photoshop mutex is already held.' }
    $photoshop = New-Object -ComObject Photoshop.Application.190
    $file = if ($Mode -eq 'effects') { 'extract-designer-effects.jsx' } elseif ($Mode -eq 'frames') { 'extract-designer-frames.jsx' } else { 'extract-designer.jsx' }
    $path = (Join-Path $PSScriptRoot $file).Replace('\','/')
    $result = $photoshop.DoJavaScript("var DESIGNER_MODE = '$Mode'; $.evalFile(new File('$path'));")
    Write-Output $result
    Write-Output ('Open Photoshop documents after pass: ' + $photoshop.Documents.Count)
} finally {
    if ($held) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
