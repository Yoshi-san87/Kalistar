param([Parameter(Mandatory=$true)][string]$Script)
$ErrorActionPreference = 'Stop'
$expected = Join-Path $PSScriptRoot 'replace.jsx'
if ((Resolve-Path -LiteralPath $Script).Path -ne (Resolve-Path -LiteralPath $expected).Path) { throw 'Script hors revision.' }
$mutex = New-Object System.Threading.Mutex($false, 'Local\KalistarV4AtelierRender')
$held = $false
try {
    $held = $mutex.WaitOne(0)
    if (-not $held) { throw 'Une composition Kalistar est deja en cours.' }
    # Attach only to the inspected running instance; do not start a second version.
    $photoshop = [System.Runtime.InteropServices.Marshal]::GetActiveObject('Photoshop.Application.200')
    if ($photoshop.Version -ne '27.10.0') { throw 'Version Photoshop differente de celle inspectee.' }
    $result = $photoshop.DoJavaScriptFile($expected)
    Write-Output $result
} finally {
    if ($held) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
