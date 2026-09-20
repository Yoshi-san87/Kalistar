param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
$plan = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'plan.json') | ConvertFrom-Json
if ($root -ne $plan.root) { throw 'Le plan appartient a un autre dossier.' }
$journalPath = Join-Path $PSScriptRoot 'cleanup-journal.json'
if (Test-Path -LiteralPath $journalPath) { throw 'Un journal existe deja. Ne pas rejouer le nettoyage.' }

function Resolve-Safe([string]$relative) {
    if ([IO.Path]::IsPathRooted($relative) -or $relative -match '(^|[/\\])\.\.([/\\]|$)' -or $relative -match ':') { throw "Chemin interdit : $relative" }
    $target = [IO.Path]::GetFullPath((Join-Path $root $relative))
    if (-not $target.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Chemin hors Kalistar.' }
    $part = $target
    while ($part -ne $root) {
        if (Test-Path -LiteralPath $part) {
            $item = Get-Item -Force -LiteralPath $part
            if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Lien interdit : $part" }
        }
        $part = Split-Path -Parent $part
    }
    return $target
}
function Assert-Hash([string]$relative, [string]$expected) {
    $file = Resolve-Safe $relative
    if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) { throw "Empreinte differente : $relative" }
}
if (Test-Path -LiteralPath (Resolve-Safe 'V4/atelier/data/render.lock')) { throw 'Une composition est active.' }
$ref = Get-Content -Raw -LiteralPath (Resolve-Safe 'V4/atelier/data/references.json') | ConvertFrom-Json
if ($ref.id -ne $plan.referenceId) { throw 'Le verrou a change depuis le plan.' }
foreach ($property in $ref.protectedFiles.PSObject.Properties) { Assert-Hash $property.Name $property.Value }
foreach ($property in $plan.packHashes.PSObject.Properties) { Assert-Hash ('V4/atelier/designer-assets/' + $property.Name) $property.Value }

$deletions = @{}
foreach ($row in $plan.duplicates) {
    if ($row.path -notmatch '^V4/revisions/2026-09-18-(balmhyr-icons|branches|voloden)/(staged|transaction)/') { throw 'Suppression hors du lot de copies temporaires.' }
    if ($row.path -notmatch '\.(psd|png|jpg|jpeg|tif|tiff)$') { throw 'Type inattendu.' }
    if ($ref.protectedFiles.PSObject.Properties.Name -contains $row.path) { throw 'Source protegee.' }
    if ($deletions.ContainsKey($row.path)) { throw 'Chemin en double.' }
    $deletions[$row.path] = $true
    Assert-Hash $row.path $row.sha256
    Assert-Hash $row.retained $row.sha256
    if ((Get-Item -LiteralPath (Resolve-Safe $row.path)).Length -ne $row.bytes) { throw 'Taille modifiee.' }
}
foreach ($row in $plan.duplicates) { if ($deletions.ContainsKey($row.retained)) { throw 'La copie conservee serait supprimee.' } }
$allowed = @('export_kalistar_clean_preview.jsx','inspect_kalistar_clean_psd.jsx','inspect_kalistar_psd.jsx','organize_kalistar_psd.jsx','V4/README.md')
if ($plan.moves.Count -ne $allowed.Count) { throw 'Liste de mouvements inattendue.' }
foreach ($move in $plan.moves) {
    if ($move.from -notin $allowed) { throw 'Deplacement non autorise.' }
    $expected = if ($move.from -eq 'V4/README.md') { 'V4/docs/HISTORIQUE_AVANT_2026-09-19.md' } else { 'maintenance/scripts-historiques/' + $move.from }
    if ($move.to -ne $expected) { throw 'Destination inattendue.' }
    Assert-Hash $move.from $move.sha256
    if (Test-Path -LiteralPath (Resolve-Safe $move.to)) { throw 'Destination deja presente.' }
}
foreach ($dir in $plan.removeEmptyDirectories) {
    if ($dir -notin @('Delivery/V1/FR','Delivery/V1','Delivery','Test')) { throw 'Dossier inattendu.' }
    $target = Resolve-Safe $dir
    if (-not (Test-Path -LiteralPath $target -PathType Container)) { throw "Dossier absent : $dir" }
    foreach ($entry in @(Get-ChildItem -Force -Recurse -LiteralPath $target)) {
        $relative = $entry.FullName.Substring($root.Length + 1).Replace('\','/')
        $null = Resolve-Safe $relative
        if (-not $entry.PSIsContainer -or $relative -notin $plan.removeEmptyDirectories) { throw "Dossier non vide : $dir" }
    }
}
if (-not $Apply) {
    [pscustomobject]@{DryRun=$true;Copies=$plan.duplicates.Count;Bytes=$plan.bytesRecoverable;Moves=$plan.moves.Count;ProtectedFiles=@($ref.protectedFiles.PSObject.Properties).Count} | ConvertTo-Json
    exit 0
}
$journal = [ordered]@{root=$root;referenceId=$ref.id;startedAt=[DateTime]::UtcNow.ToString('o');state='applying';deleted=@();moved=@();removedEmptyDirectories=@()}
function Save-Journal {
    $temp = $journalPath + '.tmp'
    $journal | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $temp -Encoding UTF8
    Move-Item -LiteralPath $temp -Destination $journalPath -Force
}
Save-Journal
foreach ($row in $plan.duplicates) {
    Assert-Hash $row.path $row.sha256
    Assert-Hash $row.retained $row.sha256
    Remove-Item -LiteralPath (Resolve-Safe $row.path) -Force
    $journal.deleted += $row
    Save-Journal
}
foreach ($move in $plan.moves) {
    Assert-Hash $move.from $move.sha256
    $destination = Resolve-Safe $move.to
    $null = New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force
    Move-Item -LiteralPath (Resolve-Safe $move.from) -Destination $destination
    Assert-Hash $move.to $move.sha256
    $journal.moved += $move
    Save-Journal
}
foreach ($dir in $plan.removeEmptyDirectories) {
    $target = Resolve-Safe $dir
    if (@(Get-ChildItem -Force -LiteralPath $target).Count -ne 0) { throw 'Le dossier a change.' }
    Remove-Item -LiteralPath $target
    $journal.removedEmptyDirectories += $dir
    Save-Journal
}
foreach ($property in $ref.protectedFiles.PSObject.Properties) { Assert-Hash $property.Name $property.Value }
$journal.state = 'complete'
$journal.completedAt = [DateTime]::UtcNow.ToString('o')
Save-Journal
[pscustomobject]@{DeletedCopies=$journal.deleted.Count;BytesRecovered=$plan.bytesRecoverable;Moved=$journal.moved.Count;State=$journal.state} | ConvertTo-Json
