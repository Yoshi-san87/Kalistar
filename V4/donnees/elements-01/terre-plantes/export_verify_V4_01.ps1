param([switch]$VerifyOnly)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../../../..')).Path
$assetRoot = Join-Path $projectRoot 'V4/assets/illustrations/elements-01/terre-plantes'
$qaRoot = Join-Path $PSScriptRoot 'qa'
$generatedRoot = 'C:/Users/guill/.codex/generated_images/01a0af75-4e28-7b12-a5e0-f940825be69f'
$jobs = @(
    @{ Name = 'LOK'; Source = 'exec-0af98780-49c8-4b32-b857-5438a8a0fb40.png' },
    @{ Name = 'BALMHYR'; Source = 'exec-1fef5174-2f82-4ec9-bc36-02e31e8ce2e2.png' },
    @{ Name = 'MAGNAR'; Source = 'exec-7e4d48f0-cde1-44b8-8470-0d81357734c8.png' },
    @{ Name = 'VICTORVINE'; Source = 'exec-e7ca786c-17b3-45ff-a7fb-ff90283b660f.png' }
)
$qaPath = Join-Path $qaRoot 'CONTACT_V4_01_221x276.png'
if (-not $VerifyOnly) {
    foreach ($job in $jobs) {
        $destination = Join-Path $assetRoot ($job.Name + '_V4_01.png')
        if (Test-Path -LiteralPath $destination) { throw "Refusing to overwrite: $destination" }
        if (-not (Test-Path -LiteralPath (Join-Path $generatedRoot $job.Source))) { throw "Missing source: $($job.Source)" }
    }
    if (Test-Path -LiteralPath $qaPath) { throw "Refusing to overwrite: $qaPath" }
    [IO.Directory]::CreateDirectory($assetRoot) | Out-Null
    [IO.Directory]::CreateDirectory($qaRoot) | Out-Null
}

$sheet = if (-not $VerifyOnly) { [Drawing.Bitmap]::new(884, 276) } else { $null }
$graphics = if ($sheet) { [Drawing.Graphics]::FromImage($sheet) } else { $null }
if ($graphics) {
    $graphics.Clear([Drawing.Color]::FromArgb(32, 32, 32))
    $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
}
$report = @()
try {
    for ($index = 0; $index -lt $jobs.Count; $index++) {
        $job = $jobs[$index]
        $source = Join-Path $generatedRoot $job.Source
        $destination = Join-Path $assetRoot ($job.Name + '_V4_01.png')
        if (-not $VerifyOnly) { [IO.File]::Copy($source, $destination, $false) }
        $sourceHash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
        $finalHash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
        if ($sourceHash -ne $finalHash) { throw "Hash mismatch: $destination" }
        $image = [Drawing.Image]::FromFile($destination)
        try {
            if ($graphics) {
                $graphics.DrawImage($image, [Drawing.Rectangle]::new($index * 221, 0, 221, 276))
            }
            $report += [ordered]@{
                name = $job.Name
                path = $destination
                source = $source
                width = $image.Width
                height = $image.Height
                bytes = (Get-Item -LiteralPath $destination).Length
                sha256 = $finalHash.ToLowerInvariant()
                byte_identical_to_builtin = $true
                window_ratio_relative_error = [math]::Abs(($image.Width / $image.Height) / (737 / 921) - 1)
            }
        } finally { $image.Dispose() }
    }
    if ($sheet) { $sheet.Save($qaPath, [Drawing.Imaging.ImageFormat]::Png) }
} finally {
    if ($graphics) { $graphics.Dispose() }
    if ($sheet) { $sheet.Dispose() }
}
$report | ConvertTo-Json -Depth 5

