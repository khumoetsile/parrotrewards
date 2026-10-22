import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canOpen } from '../src/access';
test('customer and anonymous users cannot open portals',()=>{assert.equal(canOpen('CUSTOMER','merchant'),false);assert.equal(canOpen(undefined,'admin'),false);assert.equal(canOpen('MERCHANT','admin'),false);assert.equal(canOpen('ADMIN','admin'),true);assert.equal(canOpen('MERCHANT','merchant'),true);});
