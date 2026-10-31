'use strict';
// Additional research-only regression tests; does not change the live models.
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../audit-zodiac/compare.cjs');

test('archived 001–303 draws are complete and valid',()=>{
 const v=R.validateArchive();
 assert.equal(v.count,303);
 assert.equal(v.mismatches.length,47);
 assert.deepEqual(v.mismatches,Array.from({length:47},(_,i)=>i+1));
});
test('year-boundary zodiac data is read from archived draws, not 2026 fixed map',()=>{
 assert.equal(R.archiveByPeriod[1].special,29);
 assert.equal(R.actualZ[1],'牛');
 assert.equal(R.numToZ[29],'虎');
 assert.equal(R.archiveByPeriod[47].special,39);
 assert.equal(R.actualZ[47],'兔');
 assert.equal(R.numToZ[39],'龙');
 assert.equal(R.archiveByPeriod[48].special,24);
 assert.equal(R.actualZ[48],R.numToZ[24]);
});
test('original vs archive-based research totals can be reproduced',()=>{
 const rep=R.main();
 assert.deepEqual(rep.old,{s45Six:'158/273',s46Four:'113/273',s46Six:'157/273'});
 assert.deepEqual(rep.dateAware,{s45Six:'158/273',s46Four:'111/273',s46Six:'156/273'});
 assert.equal(rep.latestCandidatesUnchanged,true);
});
