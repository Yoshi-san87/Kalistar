$ErrorActionPreference = 'Stop'
$ps = [System.Runtime.InteropServices.Marshal]::GetActiveObject('Photoshop.Application.190')
Write-Output $ps.DoJavaScript("typeof batch + ' / ' + typeof batch.cards")
