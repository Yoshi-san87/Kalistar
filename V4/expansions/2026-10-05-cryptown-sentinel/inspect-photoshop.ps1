$ErrorActionPreference = 'Stop'
$app = [System.Runtime.InteropServices.Marshal]::GetActiveObject('Photoshop.Application.190')
[pscustomobject]@{Version=$app.Version; Path=$app.Path; Documents=$app.Documents.Count} | ConvertTo-Json
Write-Output $app.DoJavaScript('app.version + " | " + app.path.fsName')
