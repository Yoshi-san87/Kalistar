param([Parameter(Mandatory=$true)][string]$Script)
$ErrorActionPreference = 'Stop'
$expected = Join-Path $PSScriptRoot 'compose.jsx'
if ((Resolve-Path -LiteralPath $Script).Path -ne (Resolve-Path -LiteralPath $expected).Path) { throw 'Script hors lot FF10.' }
$mutex = New-Object System.Threading.Mutex($false, 'Local\KalistarV4AtelierRender')
$held = $false
try {
    $held = $mutex.WaitOne(0)
    if (-not $held) { throw 'Une composition Kalistar est deja en cours.' }
    $photoshop = [System.Runtime.InteropServices.Marshal]::GetActiveObject('Photoshop.Application.190')
    if ($photoshop.Version -ne '26.11.7') { throw 'Version Photoshop differente de la route approuvee.' }
    Write-Output $photoshop.DoJavaScriptFile($expected)
} finally {
    if ($held) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
