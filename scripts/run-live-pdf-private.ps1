$ErrorActionPreference = 'Stop'
$clientIdSecure = $null
$clientSecretSecure = $null
$clientIdPtr = [IntPtr]::Zero
$clientSecretPtr = [IntPtr]::Zero
try {
  $clientIdSecure = Read-Host 'Foxit Client ID (hidden input)' -AsSecureString
  $clientSecretSecure = Read-Host 'Foxit Client Secret (hidden input)' -AsSecureString
  $clientIdPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($clientIdSecure)
  $clientSecretPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($clientSecretSecure)
  $env:FOXIT_CLOUD_API_HOST = 'https://na1.fusion.foxit.com'
  $env:FOXIT_CLOUD_API_CLIENT_ID = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($clientIdPtr)
  $env:FOXIT_CLOUD_API_CLIENT_SECRET = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($clientSecretPtr)
  Write-Host ('Host present: ' + [bool]$env:FOXIT_CLOUD_API_HOST)
  Write-Host ('Client ID present: ' + [bool]$env:FOXIT_CLOUD_API_CLIENT_ID)
  Write-Host ('Client Secret present: ' + [bool]$env:FOXIT_CLOUD_API_CLIENT_SECRET)
  node scripts/verify-live-pdf.ts
  if ($LASTEXITCODE -ne 0) { throw "Verification exited with code $LASTEXITCODE" }
  Write-Host 'Verification complete. This window will close.'
} finally {
  Remove-Item Env:FOXIT_CLOUD_API_HOST -ErrorAction SilentlyContinue
  Remove-Item Env:FOXIT_CLOUD_API_CLIENT_ID -ErrorAction SilentlyContinue
  Remove-Item Env:FOXIT_CLOUD_API_CLIENT_SECRET -ErrorAction SilentlyContinue
  if ($clientIdPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($clientIdPtr) }
  if ($clientSecretPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($clientSecretPtr) }
  $clientIdSecure = $null
  $clientSecretSecure = $null
  Set-Clipboard -Value $null
}
