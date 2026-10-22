$projectRoot = 'C:\Users\KHUMO\Desktop\Projects\App\flutter_application_1'
$logDir = Join-Path $projectRoot 'docs\local-logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$apiProcess = Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList 'dist/server.js' -WorkingDirectory (Join-Path $projectRoot 'backend') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'api.log') -RedirectStandardError (Join-Path $logDir 'api-errors.log') -PassThru
$workerProcess = Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList 'dist/worker.js' -WorkingDirectory (Join-Path $projectRoot 'backend') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'worker.log') -RedirectStandardError (Join-Path $logDir 'worker-errors.log') -PassThru
$portalProcess = Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList 'node_modules/@angular/cli/bin/ng.js','serve','--host','127.0.0.1','--proxy-config','proxy.conf.json' -WorkingDirectory (Join-Path $projectRoot 'portals\merchant-admin') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'portal.log') -RedirectStandardError (Join-Path $logDir 'portal-errors.log') -PassThru
[pscustomobject]@{API=$apiProcess.Id;Worker=$workerProcess.Id;Portal=$portalProcess.Id} | ConvertTo-Json | Set-Content (Join-Path $logDir 'pids.json')
Write-Output 'Local API, OCR worker and portal started; process IDs recorded in docs/local-logs/pids.json.'
