import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.argv[2]||'build/web';
for(const [name,heading] of [['privacy-policy','Parrot Rewards privacy policy'],['account-deletion','Request deletion of your Parrot Rewards account']]){
 const text=fs.readFileSync(path.join(root,name+'.html'),'utf8');
 assert.ok(text.includes(heading),name+' must be a standalone, readable page');
 assert.ok(text.includes('kmolabi@gmail.com'),name+' must expose the confirmed contact');
 assert.ok(!text.includes('flutter_bootstrap.js'),name+' must not be the Flutter application shell');
}
const rewrite=fs.readFileSync('deploy/web/htaccess','utf8');
assert.ok(rewrite.includes('^privacy-policy/?$ _web/customer/privacy-policy.html'));
assert.ok(rewrite.includes('^account-deletion/?$ _web/customer/account-deletion.html'));
console.log('Standalone privacy and deletion-request pages verified.');
