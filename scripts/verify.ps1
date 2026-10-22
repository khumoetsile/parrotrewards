$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$flutterCommand = Get-Command flutter -ErrorAction SilentlyContinue
$flutterPath = if($flutterCommand) {$flutterCommand.Source} else {'C:\FlutterSDK\flutter\bin\flutter.bat'}
function Run-Check([scriptblock]$Check) { & $Check; if($LASTEXITCODE -ne 0) { throw "Validation failed with exit code $LASTEXITCODE" } }
Push-Location (Join-Path $projectRoot 'backend')
try { Run-Check { npm.cmd run db:validate }; Run-Check { npm.cmd run build }; Run-Check { npm.cmd test } } finally { Pop-Location }
Push-Location (Join-Path $projectRoot 'portals\merchant-admin')
try { Run-Check { npm.cmd run build }; Run-Check { npm.cmd test } } finally { Pop-Location }
Push-Location $projectRoot
try { Run-Check { & $flutterPath analyze }; Run-Check { & $flutterPath test } } finally { Pop-Location }
