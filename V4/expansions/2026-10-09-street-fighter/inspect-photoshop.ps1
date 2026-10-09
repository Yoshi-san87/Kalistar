$ErrorActionPreference = 'Stop'
$photoshop = [System.Runtime.InteropServices.Marshal]::GetActiveObject('Photoshop.Application.190')
Write-Output $photoshop.DoJavaScript("var out=[]; for(var i=0;i<app.documents.length;i++){var d=app.documents[i];out.push(d.name+' | saved='+d.saved)} 'Open documents: '+app.documents.length+'\n'+out.join('\n');")
