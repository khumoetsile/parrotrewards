import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),backend=path.join(root,'backend');
const name='parrot-shop-qr-test-'+process.pid,password=randomBytes(24).toString('hex');
let started=false;
const docker=args=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
try {
 docker(['run','--rm','-d','--name',name,'-e','MYSQL_ROOT_PASSWORD='+password,'-e','MYSQL_DATABASE=pula_mvp_test','-p','127.0.0.1::3306','mysql:8.0']);started=true;
 const port=docker(['port',name,'3306/tcp']).split(':').at(-1);
 const env={...process.env,DATABASE_URL:`mysql://root:${password}@127.0.0.1:${port}/pula_mvp_test`,JWT_SECRET:randomBytes(32).toString('hex'),NODE_ENV:'test',RUN_DB_TESTS:'1',UPLOAD_DIR:path.join(backend,'test-artifacts/receipts'),OFFER_IMAGE_DIR:path.join(backend,'test-artifacts/offer-images')};
 let ready=false;
 for(let i=0;i<90;i++){try{docker(['exec',name,'sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -h127.0.0.1 -uroot -e "SELECT 1"']);ready=true;break;}catch{await new Promise(r=>setTimeout(r,1000));}}
 if(!ready)throw Error('Isolated test database did not become ready.');
 const run=args=>execFileSync(process.execPath,args,{cwd:backend,env,stdio:'inherit'});
 run(['node_modules/prisma/build/index.js','migrate','deploy']);
 const tests=['test/shop-discounts.integration.test.ts'];
 if(process.argv.includes('--regression')){
  run(['node_modules/tsx/dist/cli.mjs','prisma/seed-offers.ts']);
  tests.push('test/claims.integration.test.ts');
 }
 run(['node_modules/tsx/dist/cli.mjs','--test',...tests]);
} finally {
 if(started)docker(['stop','--time','5',name]);
}
