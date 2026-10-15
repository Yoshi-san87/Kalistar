param([Parameter(Mandatory=$true)][string]$Script)
$ErrorActionPreference = 'Stop'
$expected = Join-Path $PSScriptRoot 'reframe.jsx'
if ((Resolve-Path -LiteralPath $Script).Path -ne (Resolve-Path -LiteralPath $expected).Path) { throw 'Script outside revision.' }
$mutex = New-Object System.Threading.Mutex($false, 'Local\KalistarV4AtelierRender')
$held = $false
try {
    $held = $mutex.WaitOne(0)
    if (-not $held) { throw 'Kalistar native render already active. Retry after its release.' }
    $photoshop = [System.Runtime.InteropServices.Marshal]::GetActiveObject('Photoshop.Application.190')
    if ($photoshop.Version -ne '26.11.7') { throw 'Unexpected Photoshop version.' }
    Write-Output $photoshop.DoJavaScriptFile($expected)
} finally {
    if ($held) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
