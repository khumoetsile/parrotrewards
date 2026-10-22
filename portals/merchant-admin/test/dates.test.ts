import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateToInput,dateFromInput } from '../src/dates';
test('editing an offer preserves actual timestamps across local timezones',()=>{
 for(const value of ['2026-10-13T12:30:00.000Z','2027-03-15T08:12:13.456Z'])assert.equal(dateFromInput(dateToInput(value)),value);
 assert.equal(dateToInput(null),'');assert.equal(dateFromInput(''),null);
});
