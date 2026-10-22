import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/db.js';
after(async()=>db.$disconnect());
test('health is independent of MySQL and readiness reports unavailable without leaking errors', async()=>{
  const app=createApp();
  const health=await request(app).get('/health');
  assert.equal(health.status,200);
  assert.equal(health.body.data.status,'up');
  const original=db.$queryRaw;
  db.$queryRaw=async()=>{throw new Error('private database connection details');};
  try {
    const ready=await request(app).get('/ready');
    assert.equal(ready.status,503);
    assert.equal(ready.body.error.code,'NOT_READY');
    assert.ok(!ready.text.includes('private database'));
  } finally {db.$queryRaw=original;}
});
