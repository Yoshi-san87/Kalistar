param(
    [string]$Card = '',
    [string]$Name = 'MOMO-rendu'
)
$ErrorActionPreference = 'Stop'
$V4 = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
if (-not $Card) { $Card = Join-Path $V4 'master/profiles/momo.json' }
$Card = (Resolve-Path -LiteralPath $Card).Path
if ($Name -notmatch '^[A-Za-z0-9_-]+$') { throw 'Nom de sortie invalide.' }
$Node = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
if (-not (Test-Path -LiteralPath $Node)) { throw 'Runtime Node Codex introuvable.' }
& $Node (Join-Path $PSScriptRoot 'stage.cjs') $Card $Name
if ($LASTEXITCODE -ne 0) { throw 'Preparation interrompue. Le maitre ne sera pas touche.' }
$Photoshop = New-Object -ComObject Photoshop.Application
$Result = $Photoshop.DoJavaScriptFile((Join-Path $PSScriptRoot 'populate.jsx'))
Write-Output $Result
