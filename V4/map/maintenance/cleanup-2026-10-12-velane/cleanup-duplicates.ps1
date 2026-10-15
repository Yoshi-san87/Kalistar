$ErrorActionPreference = 'Stop'
$generatedRoot = 'C:\Users\guill\.codex\generated_images\01a12863-205a-7172-9800-7c1a7d0b723c'
$mapRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'plan.json') -Raw | ConvertFrom-Json
$removed = @()
foreach ($entry in $manifest.files) {
  $source = [IO.Path]::GetFullPath($entry.source)
  $copy = [IO.Path]::GetFullPath((Join-Path $mapRoot $entry.preservedCopy))
  if ([IO.Path]::GetDirectoryName($source) -ne $generatedRoot -or [IO.Path]::GetExtension($source) -ne '.png') { throw 'Unsafe generated image path' }
  if (-not $copy.StartsWith($mapRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe preserved copy path' }
  if (-not (Test-Path -LiteralPath $copy -PathType Leaf)) { throw 'Preserved copy missing' }
  if ((Get-FileHash -LiteralPath $copy -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) { throw 'Preserved copy hash mismatch' }
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { continue }
  if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) { throw 'Generated copy hash mismatch' }
  $bytes = (Get-Item -LiteralPath $source).Length
  Remove-Item -LiteralPath $source
  $removed += [PSCustomObject]@{ source=$source; preservedCopy=$copy; bytes=$bytes; sha256=$entry.sha256 }
}
$result = [PSCustomObject]@{ removed=$removed; freedBytes=($removed | Measure-Object bytes -Sum).Sum; protectedSourcesRemoved=0 }
$result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'result.json') -Encoding utf8
$result | Select-Object freedBytes,protectedSourcesRemoved | ConvertTo-Json
