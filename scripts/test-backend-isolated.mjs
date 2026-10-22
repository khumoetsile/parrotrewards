import fs from 'node:fs';import {execFileSync} from 'node:child_process';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));const backend=path.join(root,'backend');
const dotenv=await import(pathToFileURL(path.join(backend,'node_modules/dotenv/lib/main.js')).href);const local=dotenv.parse(fs.readFileSync(path.join(backend,'.env')));const url=new URL(local.DATABASE_URL);if(url.hostname!=='127.0.0.1'||url.pathname!=='/pula_mvp_dev')throw Error('Expected the known loopback development database.');if(!/^[a-z0-9_]+$/.test(url.username))throw Error('Unexpected database user.');
const sql=`CREATE DATABASE IF NOT EXISTS pula_mvp_test; GRANT ALL PRIVILEGES ON pula_mvp_test.* TO '${url.username}'@'%';`;
execFileSync('docker',['compose','-p','pula-mvp-local','exec','-T','mysql','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -e "$1"','sh',sql],{cwd:root,stdio:['ignore','pipe','pipe']});
url.pathname='/pula_mvp_test';const env={...process.env,...local,DATABASE_URL:url.toString().replace(/\/$/,''),NODE_ENV:'test',RUN_DB_TESTS:'1',UPLOAD_DIR:path.join(backend,'test-artifacts/receipts'),OFFER_IMAGE_DIR:path.join(backend,'test-artifacts/offer-images')};
const node=process.execPath;const run=args=>execFileSync(node,args,{cwd:backend,env,stdio:'inherit'});
run(['node_modules/prisma/build/index.js','migrate','deploy']);run(['node_modules/tsx/dist/cli.mjs','prisma/seed.ts']);run(['node_modules/tsx/dist/cli.mjs','prisma/seed-offers.ts']);run(['node_modules/tsx/dist/cli.mjs','--test',...fs.readdirSync(path.join(backend,'test')).filter(n=>n.endsWith('.test.ts')).map(n=>'test/'+n)]);

