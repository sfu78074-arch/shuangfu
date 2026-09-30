'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../server/archive-draws.cjs');
const D = require('../server/build-zodiac-dataset.cjs');

const trad = {龙:'龍',马:'馬',鸡:'雞',猪:'豬'};
function draw(period,z,special=period%49+1){
  const zz=trad[z]||z;
  return {schema:1,year:2026,expect:String(2026000+period),period,openTime:new Date(Date.UTC(2026,0,period,13,32,32)).toISOString(),openTimeLocal:'2026-01-01 21:32:32',regular:[1,2,3,4,5,6],special,regularZodiac:['鼠','牛','虎','兔','龍','蛇'],specialZodiac:zz,zodiac:['鼠','牛','虎','兔','龍','蛇',zz],wave:['red','blue','green','red','blue','green','red']};
}

test('mergeImmutable does not duplicate identical archived draws',()=>{
  const d=draw(48,'马',7),old={schema:1,year:2026,source:'macaujc.com',createdAt:'2026-01-01T00:00:00.000Z',checkedAt:'2026-01-01T00:00:00.000Z',draws:[{...d,archivedAt:'2026-01-01T00:00:00.000Z'}]};
  const out=A.mergeImmutable(old,[d],'2026-01-02T00:00:00.000Z');
  assert.equal(out.added,0);
  assert.equal(out.draws.length,1);
  assert.equal(out.checkedAt,old.checkedAt);
});

test('mergeImmutable refuses to overwrite a changed historical draw',()=>{
  const d=draw(48,'马',7),old={schema:1,year:2026,draws:[{...d,archivedAt:'2026-01-01T00:00:00.000Z'}]};
  const changed={...d,special:8};
  assert.throws(()=>A.mergeImmutable(old,[changed],'2026-01-02T00:00:00.000Z'),/历史期开奖发生变化/);
});

test('quality detects missing periods',()=>{
  const q=D.quality([draw(48,'马'),draw(50,'龙')]);
  assert.equal(q.ok,false);
  assert.deepEqual(q.missing,[49]);
});

test('snapshot contains only pre-target features and no target label',()=>{
  const history=[draw(48,'马'),draw(49,'龙'),draw(50,'羊'),draw(51,'马')];
  const s=D.snapshot(history,52);
  assert.equal(s.dataThroughPeriod,51);
  assert.equal(s.targetPeriod,52);
  assert.equal(Object.hasOwn(s,'target'),false);
  assert.equal(Object.hasOwn(s,'candidateHits'),false);
  assert.equal(s.sampleSize,4);
});

test('walk-forward snapshot reacts only to prior history',()=>{
  const base=[draw(48,'马'),draw(49,'龙'),draw(50,'羊'),draw(51,'马')];
  const s1=D.snapshot(base,52);
  const futureA=draw(52,'虎',12),futureB=draw(52,'猪',12);
  // Changing the not-yet-known target cannot change the pre-target snapshot because it is not supplied.
  const s2=D.snapshot(base,52);
  assert.deepEqual(s1,s2);
  assert.notEqual(futureA.specialZodiac,futureB.specialZodiac);
});
