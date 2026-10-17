param([ValidateSet('Seal','Open')][string]$Mode,[Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
if ($Mode -eq 'Seal') {
  if (Test-Path -LiteralPath $Path) { throw 'Refusing to overwrite a backup.' }
  $data = [Convert]::FromBase64String([Console]::In.ReadToEnd())
  $protected = [Security.Cryptography.ProtectedData]::Protect($data, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
  [IO.File]::WriteAllBytes($Path, $protected)
} else {
  $protected = [IO.File]::ReadAllBytes($Path)
  $data = [Security.Cryptography.ProtectedData]::Unprotect($protected, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
  [Console]::Out.Write([Convert]::ToBase64String($data))
}
