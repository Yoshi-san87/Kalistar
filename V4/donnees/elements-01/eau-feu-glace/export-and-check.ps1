param()

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$project = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../../../..')).Path
$artDir = Join-Path $project 'V4/assets/illustrations/elements-01/eau-feu-glace'
$qaDir = Join-Path $PSScriptRoot 'qa'
$generatedDir = 'C:/Users/guill/.codex/generated_images/01a0af75-4ebb-7150-a425-551a144bd81a'
$items = @(
    @{ Name = 'RUBY'; Generated = 'exec-fb2b046a-33d2-4661-9164-ddfca682bb3f.png'; Source = 'V3/assets/illustrations/39_HYDRO_RUBY.png'; UseCase = 'illustration-story' },
    @{ Name = 'DARNAKO'; Generated = 'exec-5070c1fc-6813-40d1-90c6-a2458fc98108.png'; Source = 'V3/assets/illustrations/04_PYRO_DARNAKO.png'; UseCase = 'illustration-story' },
    @{ Name = 'MALINIA'; Generated = 'exec-a4f74cdc-5880-47e1-ba49-eb4f460b05f9.png'; Source = 'V3/assets/illustrations/05_CRYO_MALINIA.png'; UseCase = 'precise-object-edit' }
)
$cardsPath = Join-Path $project 'V3/donnees/cartes.json'
$cards = Get-Content -Raw -LiteralPath $cardsPath | ConvertFrom-Json
$stylePaths = @('V3/assets/illustrations/01_ELECTRO_MOMO.png', 'V3/assets/illustrations/34_NECRO_VALAZAR.png')

# Reject any collision before creating this delivery's outputs.
$targets = @((Join-Path $PSScriptRoot 'provenance.json'), (Join-Path $qaDir 'contact-240.png'), (Join-Path $qaDir 'malinia-stone-before-after.png'))
foreach ($item in $items) {
    $targets += Join-Path $artDir ($item.Name + '_V4_01.png')
    $targets += Join-Path $qaDir ($item.Name + '-window-737x921.png')
    if (-not (Test-Path -LiteralPath (Join-Path $generatedDir $item.Generated))) { throw ('Missing generated source: ' + $item.Generated) }
}
foreach ($target in $targets) {
    if (Test-Path -LiteralPath $target) { throw ('Refusing to overwrite: ' + $target) }
}
New-Item -ItemType Directory -Path $artDir -Force | Out-Null
New-Item -ItemType Directory -Path $qaDir -Force | Out-Null

function Write-Preview {
    param([System.Drawing.Image]$Image, [int]$Width, [int]$Height, [string]$Path)
    $bitmap = [System.Drawing.Bitmap]::new($Width, $Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.DrawImage($Image, 0, 0, $Width, $Height)
        $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $graphics.Dispose(); $bitmap.Dispose() }
}

$records = @()
$contact = [System.Drawing.Bitmap]::new(720, 300)
$contactGraphics = [System.Drawing.Graphics]::FromImage($contact)
$contactGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
try {
    for ($index = 0; $index -lt $items.Count; $index++) {
        $item = $items[$index]
        $origin = Join-Path $generatedDir $item.Generated
        $final = Join-Path $artDir ($item.Name + '_V4_01.png')
        Copy-Item -LiteralPath $origin -Destination $final -ErrorAction Stop
        $originalHash = (Get-FileHash -LiteralPath $origin -Algorithm SHA256).Hash
        $finalHash = (Get-FileHash -LiteralPath $final -Algorithm SHA256).Hash
        if ($originalHash -ne $finalHash) { throw ('Copy hash mismatch: ' + $item.Name) }
        $image = [System.Drawing.Image]::FromFile($final)
        try {
            $width = $image.Width
            $height = $image.Height
            Write-Preview -Image $image -Width 737 -Height 921 -Path (Join-Path $qaDir ($item.Name + '-window-737x921.png'))
            $contactGraphics.DrawImage($image, ($index * 240), 0, 240, 300)
        } finally { $image.Dispose() }
        $card = $cards | Where-Object { $_.name -eq $item.Name }
        $references = @([ordered]@{
            path = $item.Source
            role = $(if ($item.Name -eq 'MALINIA') { 'edit_target' } else { 'identity_clothing_equipment_reference' })
            sha256 = (Get-FileHash -LiteralPath (Join-Path $project $item.Source) -Algorithm SHA256).Hash
            viewed_before_generation = $true
        })
        if ($item.Name -ne 'MALINIA') {
            foreach ($style in $stylePaths) {
                $references += [ordered]@{ path = $style; role = 'painterly_style_reference'; sha256 = (Get-FileHash -LiteralPath (Join-Path $project $style) -Algorithm SHA256).Hash; viewed_before_generation = $true }
            }
        }
        $promptName = $item.Name + '_V4_01.prompt.txt'
        $records += [ordered]@{
            name = $item.Name
            final_path = $final
            relative_path = 'V4/assets/illustrations/elements-01/eau-feu-glace/' + $item.Name + '_V4_01.png'
            generated_source = $origin
            sha256 = $finalHash
            copy_byte_identical = $true
            width = $width
            height = $height
            window = @{ width = 737; height = 921 }
            aspect_ratio_difference_percent = [Math]::Round([Math]::Abs(($width / $height) / (737.0 / 921.0) - 1) * 100, 6)
            final_resampled_or_cropped = $false
            generator = 'builtin image_gen'
            generation_calls = 1
            use_case = $item.UseCase
            prompt = 'V4/donnees/elements-01/eau-feu-glace/' + $promptName
            prompt_sha256 = (Get-FileHash -LiteralPath (Join-Path $PSScriptRoot $promptName) -Algorithm SHA256).Hash
            references = $references
            source_card = [ordered]@{ id = $card.id; name = $card.name; art = $card.art; race = $card.race; faction = $card.faction; job = $card.job; weapon = $card.weapon; text = $card.text; story_scene = $card.story_scene }
            qa_observations = 'V4/donnees/elements-01/eau-feu-glace/QA.md'
            approval_status = 'illustration_reviewed_pending_parent_card_integration'
        }
    }
    $contact.Save((Join-Path $qaDir 'contact-240.png'), [System.Drawing.Imaging.ImageFormat]::Png)
} finally { $contactGraphics.Dispose(); $contact.Dispose() }

# This QA detail is not a deliverable edit: compare the same source-image region.
$comparison = [System.Drawing.Bitmap]::new(600, 370)
$comparisonGraphics = [System.Drawing.Graphics]::FromImage($comparison)
$comparisonGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$sourceMalinia = [System.Drawing.Image]::FromFile((Join-Path $project $items[2].Source))
$finalMalinia = [System.Drawing.Image]::FromFile((Join-Path $artDir 'MALINIA_V4_01.png'))
try {
    $rectangle = [System.Drawing.Rectangle]::new(330, 325, 300, 370)
    $comparisonGraphics.DrawImage($sourceMalinia, [System.Drawing.Rectangle]::new(0, 0, 300, 370), $rectangle, [System.Drawing.GraphicsUnit]::Pixel)
    $comparisonGraphics.DrawImage($finalMalinia, [System.Drawing.Rectangle]::new(300, 0, 300, 370), $rectangle, [System.Drawing.GraphicsUnit]::Pixel)
    $comparison.Save((Join-Path $qaDir 'malinia-stone-before-after.png'), [System.Drawing.Imaging.ImageFormat]::Png)
} finally { $sourceMalinia.Dispose(); $finalMalinia.Dispose(); $comparisonGraphics.Dispose(); $comparison.Dispose() }

$provenance = [ordered]@{
    schema_version = 1
    created_at = [DateTimeOffset]::Now.ToString('o')
    project_root = $project
    tool_mode = 'builtin image_gen; one generation per illustration; no CLI; no Photoshop'
    source_database = @{ path = 'V3/donnees/cartes.json'; sha256 = (Get-FileHash -LiteralPath $cardsPath -Algorithm SHA256).Hash; modified = $false }
    instructions_read = @('V4/AGENTS.md', 'V4/DIRECTION_ARTISTIQUE.md', 'C:/Users/guill/.codex/skills/.system/imagegen/SKILL.md')
    allowed_write_scopes = @('V4/assets/illustrations/elements-01/eau-feu-glace/', 'V4/donnees/elements-01/eau-feu-glace/')
    source_modifications = $false
    psd_or_template_work = $false
    notes = @('User directions supersede the old Darnako rescue story for this V4 scene; V3 database is unchanged.', 'Malinia is a generative local-content revision, not a guarantee of pixel-identical pixels outside the stone.', 'QA window previews and contact sheets are derived only for inspection; final PNGs are unmodified generator outputs.')
    illustrations = $records
}
$provenance | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'provenance.json') -Encoding utf8
$records | ForEach-Object { [PSCustomObject]$_ } | Select-Object name, width, height, sha256, aspect_ratio_difference_percent, final_path | ConvertTo-Json -Depth 4
