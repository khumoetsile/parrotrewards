import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
if(!process.env.PARROT_SCREENSHOT_OUTPUT)throw Error('Set PARROT_SCREENSHOT_OUTPUT to a local output directory.');
const dotenv=await import(pathToFileURL(path.join(root,'backend/node_modules/dotenv/lib/main.js')).href);
const env=dotenv.parse(fs.readFileSync(path.join(root,'backend/.env')));
if(!env.DEMO_PASSWORD)throw Error('Existing local QA account password is required.');
const encoded=Buffer.from(env.DEMO_PASSWORD).toString('base64');
// Only base64 characters are passed to the Windows batch wrapper. Never print credentials.
const result=spawnSync('C:/FlutterSDK/flutter/bin/flutter.bat',['drive','--driver=test_driver/ux_screenshots.dart','--target=integration_test/ux_screenshots_test.dart','-d','emulator-5554','--dart-define=QA_PASSWORD_B64='+encoded],{cwd:root,shell:true,stdio:'inherit'});
process.exit(result.status??1);
