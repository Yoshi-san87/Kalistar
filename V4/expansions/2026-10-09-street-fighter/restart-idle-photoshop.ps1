$ErrorActionPreference = 'Stop'
$photoshop = [System.Runtime.InteropServices.Marshal]::GetActiveObject('Photoshop.Application.190')
if ($photoshop.Documents.Count -ne 0) { throw 'Photoshop has open documents; preserve them.' }
$process = Get-Process Photoshop -ErrorAction Stop
$exe = $process.Path
$photoshop.Quit()
[void]$process.WaitForExit(30000)
if (-not $process.HasExited) { throw 'Photoshop did not exit normally.' }
Start-Process -FilePath $exe -WindowStyle Hidden
'Photoshop restarted normally, no documents were open.'
