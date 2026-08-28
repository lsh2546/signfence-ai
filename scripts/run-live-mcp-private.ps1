$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$clientIdSecure = Read-Host 'Foxit Client ID (hidden)' -AsSecureString
$clientSecretSecure = Read-Host 'Foxit Client Secret (hidden)' -AsSecureString
$clientIdPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($clientIdSecure)
$clientSecretPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($clientSecretSecure)
try {
  $env:FOXIT_CLOUD_API_HOST = 'https://na1.fusion.foxit.com'
  $env:FOXIT_CLOUD_API_CLIENT_ID = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($clientIdPtr)
  $env:FOXIT_CLOUD_API_CLIENT_SECRET = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($clientSecretPtr)
  Write-Host 'Foxit credentials present: True (values hidden)'
  Set-Location -LiteralPath $projectPath
  npm run mcp:proof
  if ($LASTEXITCODE -ne 0) { throw "MCP proof failed with exit code $LASTEXITCODE" }
  Write-Host ''
  Write-Host 'MCP proof completed. You may close this window.' -ForegroundColor Green
} finally {
  $env:FOXIT_CLOUD_API_HOST = $null
  $env:FOXIT_CLOUD_API_CLIENT_ID = $null
  $env:FOXIT_CLOUD_API_CLIENT_SECRET = $null
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($clientIdPtr)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($clientSecretPtr)
  Set-Clipboard -Value ' '
}
Read-Host 'Press Enter to close'
