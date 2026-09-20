$ErrorActionPreference = 'Stop'
$root = 'C:\Users\guill\Documents\Doc\GP-2 inside\Cartes\Kalistar'
$destination = Join-Path $root 'V4\assets\illustrations\elements-01\air'
$generated = 'C:\Users\guill\.codex\generated_images\01a0af75-4daa-7b01-a046-e727c648c1e8'
$items = @(
    @{ Name = 'CANA'; Source = '02_AERO_CANA.png'; Generated = 'exec-3d81a6e8-3c35-4ccf-aafc-f677e2efaaf6.png'; SourceHash = '1F41383C6FD37352685C965E930234E740C2470D812E490AC086A7A77FFA6D79' },
    @{ Name = 'SCROW'; Source = '15_AERO_SCROW.png'; Generated = 'exec-73a7b4e6-dd50-4c35-8a92-326e4f332d4a.png'; SourceHash = 'BE4D74B4C3792DB4437931C03F09922E274BF5192880CC90037E99A1BF939B7A' },
    @{ Name = 'SORYN'; Source = '40_AERO_SORYN.png'; Generated = 'exec-bbf1b481-80a3-4f5d-ace2-df927217dfbe.png'; SourceHash = 'AAE106608F05A77C0A537BA1BC11FD302D87868B9C751B7BEC59E01495138C9D' },
    @{ Name = 'GILMARR'; Source = '38_AERO_GILMARR.png'; Generated = 'exec-b6d21134-bb70-4002-a4d2-e51c0b67617a.png'; SourceHash = '8409EFCAF0CC9C80C4119E4BB11EE6EE6F3C0DBA7A6148733317958C82F38A51' }
)

# Check all inputs and destinations before copying any image.
foreach ($item in $items) {
    $target = Join-Path $destination ($item.Name + '_V4_01.png')
    if (Test-Path -LiteralPath $target) { throw "Refusing to overwrite: $target" }
    $inputPath = Join-Path $generated $item.Generated
    if (-not (Test-Path -LiteralPath $inputPath -PathType Leaf)) { throw "Missing generated image: $inputPath" }
    $sourcePath = Join-Path (Join-Path $root 'V3\assets\illustrations') $item.Source
    if ((Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash -ne $item.SourceHash) {
        throw "Approved source has changed: $sourcePath"
    }
}
New-Item -ItemType Directory -Path $destination -Force | Out-Null
Add-Type -AssemblyName System.Drawing
$report = foreach ($item in $items) {
    $inputPath = Join-Path $generated $item.Generated
    $target = Join-Path $destination ($item.Name + '_V4_01.png')
    Copy-Item -LiteralPath $inputPath -Destination $target -ErrorAction Stop
    $inputHash = (Get-FileHash -LiteralPath $inputPath -Algorithm SHA256).Hash
    $outputHash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
    if ($inputHash -ne $outputHash) { throw "Copy verification failed: $target" }
    $bitmap = [System.Drawing.Image]::FromFile($target)
    try {
        $width = $bitmap.Width
        $height = $bitmap.Height
        $scale = [Math]::Max(737.0 / $width, 921.0 / $height)
        [pscustomobject]@{
            name = $item.Name
            final_path = $target
            generated_path = $inputPath
            sha256 = $outputHash
            prompt_sha256 = (Get-FileHash -LiteralPath (Join-Path $PSScriptRoot ($item.Name + '_V4_01.prompt.txt')) -Algorithm SHA256).Hash
            bytes = (Get-Item -LiteralPath $target).Length
            width = $width
            height = $height
            source_unchanged = $true
            exact_generated_copy = $true
            target_window = @(737, 921)
            cover_crop_target_pixels = @([Math]::Round($width * $scale - 737, 4), [Math]::Round($height * $scale - 921, 4))
        }
    } finally {
        $bitmap.Dispose()
    }
}
$report | ConvertTo-Json -Depth 5
