param([ValidateSet('Plan', 'Apply', 'Verify')][string]$Mode = 'Plan')
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..')).TrimEnd('\')
$expectedRoot = 'C:\Users\guill\Documents\Doc\GP-2 inside\Cartes\Kalistar'
if (-not $root.Equals($expectedRoot, [StringComparison]::OrdinalIgnoreCase)) { throw "Unexpected workspace: $root" }
if ((Get-Item -LiteralPath $root -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Workspace root must not be a junction or symlink.' }
$prefix = $root + '\'
$planPath = Join-Path $PSScriptRoot 'plan.json'
$currentPsd = @(
  'V4/templates/MOMO_V4_11_POSITIONS.psd',
  'V4/templates/TAULIO_V4_02_POSITIONS.psd',
  'V4/templates/JELLY_JOE_V4_03_ENCRE.psd',
  'V4/templates/MOMO_BAL_V4_01_TEMPLATE_ELECTRO.psd',
  'V4/templates/RIKKA_V4_03_RECADRAGE.psd',
  'V4/template-stable/KALISTAR_V4_TEMPLATE_03F_ELECTRO_RIKKA.psd',
  'V4/sauvegardes_psd/2026-09-16_09-43-31/01_ELECTRO_MOMO_RECUPERE.psd'
)
function Relative([string]$path) { $path.Substring($prefix.Length).Replace('\', '/') }
function Reason([string]$p) {
  if ($currentPsd -contains $p) { return $null }
  if ($p -match '^V4/.+\.psd$') { return 'V4: PSD intermediaire remplace par les cartes finales et le maitre 03F' }
  if ($p -match '^V1/templates/\d{2}_.+\.psd$') { return 'V1: ancien PSD de carte exporte, reconstructible depuis le master et les donnees conserves' }
  if ($p -match '^V2/templates/(?!01_ELECTRO_MOMO\.psd$)\d{2}_.+\.psd$') { return 'V2: ancien PSD de carte exporte, reconstructible depuis le master et les donnees conserves' }
  if ($p -match '^V[12]/impression/.+\.(pdf|tif|tiff)$') { return 'V1/V2: export impression ancien, images de cartes conservees' }
  if ($p -match '^V2/archives/.+\.(pdf|tif|tiff)$') { return 'V2: ancien PDF/TIFF archive, sources et apercus conserves' }
  if ($p -match '^V[123]/verification(?:-[^/]+)?/.+\.(png|jpe?g|webp|pdf|tiff?|psd)$' -and $p -notmatch '(?i)(reference|source)') { return 'V1/V2/V3: rendu de verification ou capture regenerable, rapports et fixtures conserves' }
  if ($p -match '^V4/master/(exports|verification|staging)/.+\.(png|jpe?g|webp|tiff?)$') { return 'V4: rendu ou montage de controle du prototype abandonne' }
  if ($p -match '^V4/(template-stable|momo-bottom)/' -and $p -notmatch '^V4/template-stable/rikka-revision-03/') {
    $name = [IO.Path]::GetFileName($p)
    if ($name -match '^(render(?:-photoshop)?|reopened(?:-photoshop)?|template-(previous|new|reopened|photoshop)(?:-preview)?|master-(before|after|reopened)|reference-photoshop(?:-preview)?|.+-regression|.+-approved|fixed-.+|fresh-render|repeat|taulio-photoshop|taulio-reopened|MOMO-preview|TAULIO-preview|test-five-positions|test-number-295|weapon-hidden|small-size-comparison|preview|small-240|card-preview|source-preview)\.png$') { return 'V4: export de controle historique, original et donnees conserves' }
  }
  return $null
}
$checkedParents = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
function SafeFile([string]$relative) {
  if ([IO.Path]::IsPathRooted($relative)) { throw "Expected relative path: $relative" }
  $full = [IO.Path]::GetFullPath((Join-Path $root $relative))
  if (-not $full.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { throw "Outside workspace: $full" }
  $item = Get-Item -LiteralPath $full -Force
  if ($item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw "Not an ordinary file: $full" }
  $parent = $item.Directory
  while ($parent -and $parent.FullName.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
    if ($checkedParents.Add($parent.FullName) -and ($parent.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw "Reparse ancestor: $($parent.FullName)" }
    $parent = $parent.Parent
  }
  return $item
}
function Hash([string]$path) { (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash }
function WriteJson([string]$path, $value) { $value | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $path -Encoding utf8 }
function Inventory { @(Get-ChildItem -LiteralPath $root -Recurse -File -Force | Where-Object { $_.FullName -notlike "$PSScriptRoot\*" }) }
if ($Mode -eq 'Plan') {
  if (Test-Path -LiteralPath $planPath) { throw 'Plan already exists; do not replace the pre-cleanup inventory.' }
  $files = Inventory
  $deletions = @(); $protected = @(); $inventory = @()
  foreach ($file in $files) {
    $p = Relative $file.FullName
    $reason = Reason $p
    $entry = [ordered]@{Path=$p;Bytes=$file.Length;LastWriteTimeUtc=$file.LastWriteTimeUtc.ToString('o')}
    $inventory += [pscustomobject]$entry
    if ($reason) {
      $null = SafeFile $p
      $deletions += [pscustomobject]@{Path=$p;Bytes=$file.Length;SHA256=(Hash $file.FullName);Reason=$reason}
    } else {
      $protected += [pscustomobject]@{Path=$p;Bytes=$file.Length;SHA256=(Hash $file.FullName)}
    }
  }
  $plan = [pscustomobject]@{Root=$root;CreatedAt=(Get-Date).ToUniversalTime().ToString('o');BeforeBytes=($files | Measure-Object Length -Sum).Sum;DeleteBytes=($deletions | Measure-Object Bytes -Sum).Sum;Deletions=$deletions;Protected=$protected}
  WriteJson (Join-Path $PSScriptRoot 'inventory-before.json') $inventory
  WriteJson $planPath $plan
  [pscustomobject]@{BeforeGB=[math]::Round($plan.BeforeBytes/1e9,3);DeleteGB=[math]::Round($plan.DeleteBytes/1e9,3);AfterGB=[math]::Round(($plan.BeforeBytes-$plan.DeleteBytes)/1e9,3);FilesToDelete=$deletions.Count;ProtectedFiles=$protected.Count;Categories=@($deletions | Group-Object Reason | ForEach-Object {[pscustomobject]@{Reason=$_.Name;Files=$_.Count;GB=[math]::Round(($_.Group | Measure-Object Bytes -Sum).Sum/1e9,3)}})} | ConvertTo-Json -Depth 5
  exit
}
$plan = Get-Content -LiteralPath $planPath -Raw | ConvertFrom-Json
if ($plan.Root -ne $root) { throw 'Plan root mismatch.' }
if ($Mode -eq 'Apply') {
  $openPaths = @()
  if (Get-Process -Name Photoshop -ErrorAction SilentlyContinue) {
    $ps = New-Object -ComObject Photoshop.Application.190
    $open = $ps.DoJavaScript('var a=[];for(var i=0;i<app.documents.length;i++){try{a.push(app.documents[i].fullName.fsName);}catch(e){}}a.join("\n");')
    $openPaths = @($open -split '\r?\n' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  }
  # Validate the COMPLETE selection before removing the first file.
  foreach ($entry in $plan.Deletions) {
    $file = SafeFile $entry.Path
    if ((Reason $entry.Path) -ne $entry.Reason) { throw "Policy mismatch: $($entry.Path)" }
    if ($openPaths -contains $file.FullName) { throw "PSD currently open: $($file.FullName)" }
    if ($file.Length -ne $entry.Bytes -or (Hash $file.FullName) -ne $entry.SHA256) { throw "File changed since audit: $($entry.Path)" }
  }
  $deleted = [Collections.Generic.List[object]]::new()
  try {
    foreach ($entry in $plan.Deletions) {
      $file = SafeFile $entry.Path
      # File-only deletion, exact literal path; never recursive and never shell-expanded.
      Remove-Item -LiteralPath $file.FullName -Force -ErrorAction Stop
      $deleted.Add($entry)
    }
  } finally { WriteJson (Join-Path $PSScriptRoot 'deleted-files.json') @($deleted.ToArray()) }
  [pscustomobject]@{DeletedFiles=$deleted.Count;FreedGB=[math]::Round(($deleted | Measure-Object Bytes -Sum).Sum/1e9,3)} | ConvertTo-Json
}
$issues = @()
foreach ($entry in $plan.Protected) {
  $file = SafeFile $entry.Path
  if ($file.Length -ne $entry.Bytes -or (Hash $file.FullName) -ne $entry.SHA256) { $issues += $entry.Path }
}
$remaining = @($plan.Deletions | Where-Object { Test-Path -LiteralPath (Join-Path $root $_.Path) })
$current = Inventory
$result = [pscustomobject]@{VerifiedAt=(Get-Date).ToUniversalTime().ToString('o');BeforeBytes=$plan.BeforeBytes;AfterBytes=($current | Measure-Object Length -Sum).Sum;DeletedBytes=$plan.DeleteBytes;DeletedFiles=$plan.Deletions.Count;ProtectedFiles=$plan.Protected.Count;ChangedProtectedFiles=$issues;RemainingCandidates=@($remaining.Path);Passed=($issues.Count -eq 0 -and $remaining.Count -eq 0)}
WriteJson (Join-Path $PSScriptRoot 'verification.json') $result
$result | ConvertTo-Json -Depth 4
if (-not $result.Passed) { throw 'Cleanup verification failed.' }
