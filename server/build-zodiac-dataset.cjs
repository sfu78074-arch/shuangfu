'use strict';

const fs = require('node:fs');
const crypto = require('node:crypto');

const YEAR = 2026;
const ARCHIVE = `data/draw-archive-${YEAR}.json`;
const FEATURES = `data/zodiac-features-${YEAR}.jsonl`;
const LATEST = `data/zodiac-latest-features-${YEAR}.json`;
const STATUS = `data/zodiac-model-status-${YEAR}.json`;

const Z = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
const simp = {鼠:'鼠',牛:'牛',虎:'虎',兔:'兔',龍:'龙',龙:'龙',蛇:'蛇',馬:'马',马:'马',羊:'羊',猴:'猴',雞:'鸡',鸡:'鸡',狗:'狗',豬:'猪',猪:'猪'};

function zname(v) { return simp[String(v)] || String(v); }
function numCount(z, nextPeriod) {
  // 2026001-2026047 use the 2025 Snake-year mapping; 2026048+ use 2026 Horse-year mapping.
  return nextPeriod < 48 ? (z === '蛇' ? 5 : 4) : (z === '马' ? 5 : 4);
}
function specialZ(d) { return zname(d.specialZodiac); }

function omissions(history) {
  const out = {};
  for (const z of Z) {
    let i = history.length - 1;
    while (i >= 0 && specialZ(history[i]) !== z) i--;
    out[z] = i < 0 ? history.length : history.length - 1 - i;
  }
  return out;
}

function frequencies(history, k) {
  const out = Object.fromEntries(Z.map(z => [z, 0]));
  for (const d of history.slice(-k)) out[specialZ(d)]++;
  return out;
}

function previousGap(history, z) {
  let seen = 0;
  let last = null;
  for (let i = history.length - 1; i >= 0; i--) {
    if (specialZ(history[i]) === z) {
      seen++;
      if (seen === 1) last = i;
      else return last - i;
    }
  }
  return null;
}

function currentRun(history) {
  if (!history.length) return { zodiac: null, length: 0 };
  const z = specialZ(history.at(-1));
  let n = 0;
  for (let i = history.length - 1; i >= 0 && specialZ(history[i]) === z; i--) n++;
  return { zodiac: z, length: n };
}

function rank(history, nextPeriod) {
  const om = omissions(history);
  return Z.map((z, i) => ({
    zodiac: z,
    omission: om[z],
    numberCount: numCount(z, nextPeriod),
    score: om[z] * numCount(z, nextPeriod),
    order: i
  })).sort((a,b) => b.score - a.score || b.omission - a.omission || a.order - b.order);
}

function snapshot(history, nextPeriod) {
  if (!history.length) throw new Error('history required');
  const om = omissions(history);
  const f5 = frequencies(history, 5), f10 = frequencies(history, 10), f20 = frequencies(history, 20), f30 = frequencies(history, 30);
  const r = rank(history, nextPeriod);
  const run = currentRun(history);
  const perZodiac = {};
  for (const z of Z) {
    const rr = r.find(x => x.zodiac === z);
    perZodiac[z] = {
      omission: om[z],
      normalizedOmissionScore: rr.score,
      numberCount: rr.numberCount,
      rank: r.findIndex(x => x.zodiac === z) + 1,
      freq5: f5[z], freq10: f10[z], freq20: f20[z], freq30: f30[z],
      previousGap: previousGap(history, z)
    };
  }
  return {
    schema: 2,
    year: YEAR,
    targetPeriod: nextPeriod,
    targetExpect: String(YEAR * 1000 + nextPeriod),
    dataThroughExpect: history.at(-1).expect,
    dataThroughPeriod: history.at(-1).period,
    sampleSize: history.length,
    mappingEra: nextPeriod < 48 ? '2025-snake' : '2026-horse',
    previousSpecial: history.at(-1).special,
    previousSpecialZodiac: specialZ(history.at(-1)),
    currentSameZodiacRun: run,
    perZodiac,
    ranked: r.map(({order, ...x}) => x),
    candidates: Object.fromEntries([2,3,4,5,6].map(n => [String(n), r.slice(0,n).map(x => x.zodiac)]))
  };
}

function maxMiss(bits) {
  let max = 0, cur = 0;
  for (const hit of bits) {
    if (hit) cur = 0;
    else { cur++; if (cur > max) max = cur; }
  }
  return max;
}

function rate(rows, n) {
  const a = n ? rows.slice(-n) : rows;
  return a.length ? a.filter(x => x.hit).length / a.length : null;
}

function backtest(draws) {
  const startIndex = draws.findIndex(d => d.period >= 78);
  const out = [];
  if (startIndex < 1) return out;
  for (let n = 2; n <= 6; n++) {
    const rows = [];
    for (let i = startIndex; i < draws.length; i++) {
      const s = snapshot(draws.slice(0,i), draws[i].period);
      const picks = s.candidates[String(n)];
      const actual = specialZ(draws[i]);
      const coverage = picks.reduce((sum,z) => sum + numCount(z, draws[i].period), 0) / 49;
      rows.push({expect: draws[i].expect, hit: picks.includes(actual), coverage});
    }
    const hits = rows.filter(x => x.hit).length;
    const baseline = rows.reduce((s,x) => s + x.coverage,0) / rows.length;
    out.push({
      n,
      tested: rows.length,
      hits,
      hitRate: hits / rows.length,
      theoreticalBaseline: baseline,
      edge: hits / rows.length - baseline,
      recent100: rate(rows,100),
      recent50: rate(rows,50),
      recent30: rate(rows,30),
      maxConsecutiveMisses: maxMiss(rows.map(x => x.hit))
    });
  }
  return out;
}

function quality(draws) {
  const periods = draws.map(d => d.period);
  const duplicates = periods.filter((p,i) => periods.indexOf(p) !== i);
  const missing = [];
  if (periods.length) for (let p = periods[0]; p <= periods.at(-1); p++) if (!periods.includes(p)) missing.push(p);
  const invalidZodiac = draws.filter(d => !Z.includes(specialZ(d))).map(d => d.expect);
  const invalidNumbers = draws.filter(d => !Array.isArray(d.regular) || d.regular.length !== 6 || !Number.isInteger(d.special)).map(d => d.expect);
  return {duplicates:[...new Set(duplicates)], missing, invalidZodiac, invalidNumbers, ok: !duplicates.length && !missing.length && !invalidZodiac.length && !invalidNumbers.length};
}

function main() {
  if (!fs.existsSync(ARCHIVE)) throw new Error('draw archive missing');
  const archive = JSON.parse(fs.readFileSync(ARCHIVE,'utf8'));
  if (archive.schema !== 1 || archive.year !== YEAR || !Array.isArray(archive.draws) || !archive.draws.length) throw new Error('draw archive invalid');
  const draws = archive.draws.slice().sort((a,b) => a.period-b.period);
  const q = quality(draws);
  if (!q.ok) throw new Error('data quality check failed: ' + JSON.stringify(q));

  const rows = [];
  for (let i = 1; i < draws.length; i++) {
    const d = draws[i];
    const s = snapshot(draws.slice(0,i), d.period);
    rows.push({
      ...s,
      target: {special: d.special, specialZodiac: specialZ(d)},
      candidateHits: Object.fromEntries(Object.entries(s.candidates).map(([n,picks]) => [n, picks.includes(specialZ(d))]))
    });
  }
  fs.writeFileSync(FEATURES, rows.map(x => JSON.stringify(x)).join('\n') + '\n');

  const nextPeriod = draws.at(-1).period + 1;
  const next = snapshot(draws, nextPeriod);
  const builtAt = new Date().toISOString();
  const raw = fs.readFileSync(ARCHIVE);
  const archiveSha256 = crypto.createHash('sha256').update(raw).digest('hex');
  const status = {
    schema: 2,
    year: YEAR,
    builtAt,
    archive: {
      count: draws.length,
      firstExpect: draws[0].expect,
      latestExpect: draws.at(-1).expect,
      latestOpenTime: draws.at(-1).openTime,
      archiveSha256,
      sourceSha256: archive.sha256 || null,
      quality: q
    },
    next,
    walkForwardBacktest: backtest(draws),
    notes: [
      'Every feature row uses only data available before its target draw.',
      'candidateHits and target are labels/evaluation fields and must not be used as input features.',
      'Historical backtest performance is not a guarantee of future results.'
    ]
  };
  fs.writeFileSync(LATEST, JSON.stringify({...next,builtAt,archiveSha256}, null, 2) + '\n');
  fs.writeFileSync(STATUS, JSON.stringify(status, null, 2) + '\n');
  console.log(JSON.stringify({status:'ok',features:rows.length,latest:draws.at(-1).expect,next:next.targetExpect,quality:q.ok}));
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(e && e.stack ? e.stack : String(e)); process.exitCode = 1; }
}

module.exports = {snapshot, backtest, quality, omissions, frequencies, rank};
