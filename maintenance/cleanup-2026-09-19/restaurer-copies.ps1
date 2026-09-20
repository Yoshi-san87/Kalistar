param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
$journal = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'cleanup-journal.json') | ConvertFrom-Json
function Resolve-Safe([string]$relative) {
    if ([IO.Path]::IsPathRooted($relative) -or $relative -match '(^|[/\\])\.\.([/\\]|$)' -or $relative -match ':') { throw 'Chemin interdit.' }
    $target = [IO.Path]::GetFullPath((Join-Path $root $relative))
    if (-not $target.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Chemin hors Kalistar.' }
    $part = $target
    while ($part -ne $root) {
        if (Test-Path -LiteralPath $part) {
            if ((Get-Item -Force -LiteralPath $part).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Lien interdit.' }
        }
        $part = Split-Path -Parent $part
    }
    return $target
}
$pending = @()
foreach ($row in $journal.deleted) {
    if ($row.path -notmatch '^V4/revisions/2026-09-18-(balmhyr-icons|branches|voloden)/(staged|transaction)/') { throw 'Destination inattendue.' }
    $source = Resolve-Safe $row.retained
    $destination = Resolve-Safe $row.path
    if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -ne $row.sha256) { throw "Source modifiee depuis le nettoyage : $($row.retained). Chercher la revision d'origine, ne pas copier une autre version." }
    if (Test-Path -LiteralPath $destination) {
        if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant() -ne $row.sha256) { throw 'Destination deja presente et differente.' }
    } else { $pending += $row }
}
if (-not $Apply) { Write-Output "$($pending.Count) copies verifiees peuvent etre reconstituees. Utiliser -Apply pour les recreer."; exit 0 }
foreach ($row in $pending) {
    $destination = Resolve-Safe $row.path
    $null = New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force
    $temporary = $destination + '.' + [guid]::NewGuid().ToString() + '.tmp'
    Copy-Item -LiteralPath (Resolve-Safe $row.retained) -Destination $temporary
    if ((Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash.ToLowerInvariant() -ne $row.sha256) { throw 'Copie non conforme : conserver le temporaire pour diagnostic.' }
    Move-Item -LiteralPath $temporary -Destination $destination
}
Write-Output "$($pending.Count) copies restaurees sans remplacer les fichiers actifs."
