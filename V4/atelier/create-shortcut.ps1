$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$launcher = Join-Path $root 'Lancer-Kalistar.cmd'
$icon = Join-Path $root 'V4\site\assets\kalistar.ico'
if (-not (Test-Path -LiteralPath $launcher) -or -not (Test-Path -LiteralPath $icon)) {
    throw 'Le lanceur ou son icone Kalistar est introuvable.'
}
$shell = New-Object -ComObject WScript.Shell
$shortcut = $null
try {
    $shortcut = $shell.CreateShortcut((Join-Path $root 'Kalistar.lnk'))
    $shortcut.TargetPath = $launcher
    $shortcut.WorkingDirectory = $root
    $shortcut.IconLocation = $icon + ',0'
    $shortcut.Description = 'Demarrer Kalistar V4 et ouvrir le jeu'
    $shortcut.WindowStyle = 7
    $shortcut.Save()
} finally {
    if ($shortcut) { $null = [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($shortcut) }
    $null = [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($shell)
}
