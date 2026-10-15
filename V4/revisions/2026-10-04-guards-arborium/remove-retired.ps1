$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$proof = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'publication.json') | ConvertFrom-Json
if ($proof.state -ne 'published') { throw 'Publication native requise avant suppression.' }
$relative = @(
    'V4/creations/49900309', 'V4/creations/49900310',
    'V4/Illustrations/City_Guards_Helvik_01.png', 'V4/Illustrations/City_Guards_Sovra_01.png',
    'V4/expansions/2026-10-04-city-guards/cards/helvik',
    'V4/expansions/2026-10-04-city-guards/cards/sovra',
    'V4/expansions/2026-10-04-city-guards/selected-art/helvik.png',
    'V4/expansions/2026-10-04-city-guards/selected-art/sovra.png',
    'V4/expansions/2026-10-04-city-guards/prompts/helvik-v3.txt',
    'V4/expansions/2026-10-04-city-guards/prompts/sovra-v3.txt',
    'V4/expansions/2026-10-04-city-guards/browser-proof/desktop-helvik.png',
    'V4/expansions/2026-10-04-city-guards/browser-proof/razr50-helvik.png'
)
$targets = @()
$files = @()
foreach ($item in $relative) {
    $target = (Resolve-Path -LiteralPath (Join-Path $root $item)).Path
    if (-not $target.StartsWith($root + '\', [StringComparison]::OrdinalIgnoreCase)) { throw "Hors checkout : $target" }
    $node = Get-Item -LiteralPath $target
    $children = if ($node.PSIsContainer) { @(Get-ChildItem -LiteralPath $target -Recurse -Force) } else { @($node) }
    foreach ($child in @($node) + $children) { if ($child.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Lien interdit : $($child.FullName)" } }
    foreach ($child in $children | Where-Object { -not $_.PSIsContainer }) {
        $files += @{ path=$child.FullName.Substring($root.Length + 1).Replace('\','/'); sha256=(Get-FileHash -LiteralPath $child.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
    }
    $targets += $target
}
$files | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'removed-files.json') -Encoding utf8
foreach ($target in $targets) { Remove-Item -LiteralPath $target -Recurse -Force }
Write-Output "Removed $($files.Count) files, all inside $root"
