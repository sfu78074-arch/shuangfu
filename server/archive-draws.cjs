'use strict';

const fs = require('node:fs');
const crypto = require('node:crypto');

const YEAR = 2026;
const OUT = `data/draw-archive-${YEAR}.json`;
const JSONL = `data/zodiac-learning-${YEAR}.jsonl`;
const HISTORY_URL = `https://history.macaumarksix.com/history/macaujc2/y/${YEAR}`;
const LATEST_URL = 'https://macaumarksix.com/api/macaujc2.com';

function splitCsv(v) {
  return String(v ?? '').split(',').map(s => s.trim()).filter(Boolean);
}

function normalizeRow(r) {
  const expect = String(r.expect ?? '');
  if (!/^2026\d{3}$/.test(expect)) return null;

  const numbers = splitCsv(r.openCode).map(Number);
  const zodiac = splitCsv(r.zodiac);
  const wave = splitCsv(r.wave);

  if (numbers.length !== 7 || new Set(numbers).size !== 7 || numbers.some(n => !Number.isInteger(n) || n < 1 || n > 49)) {
    throw new Error(`开奖号码异常: ${expect}`);
  }
  if (zodiac.length !== 7 || zodiac.some(x => !x)) {
    throw new Error(`生肖数据异常: ${expect}`);
  }
  if (wave.length && wave.length !== 7) {
    throw new Error(`波色数据异常: ${expect}`);
  }

  const openTimeRaw = String(r.openTime ?? '').trim();
  const parsed = Date.parse(openTimeRaw.replace(' ', 'T') + '+08:00');
  if (!Number.isFinite(parsed)) throw new Error(`开奖时间异常: ${expect}`);

  return {
    schema: 1,
    year: YEAR,
    expect,
    period: Number(expect.slice(4)),
    openTime: new Date(parsed).toISOString(),
    openTimeLocal: openTimeRaw,
    regular: numbers.slice(0, 6),
    special: numbers[6],
    regularZodiac: zodiac.slice(0, 6),
    specialZodiac: zodiac[6],
    zodiac,
    wave: wave.length ? wave : null
  };
}

function normalizePayload(payload) {
  const list = Array.isArray(payload) ? payload : payload?.data;
  if (!Array.isArray(list)) throw new Error('开奖接口格式异常');
  const map = new Map();
  for (const raw of list) {
    const row = normalizeRow(raw);
    if (!row) continue;
    const prev = map.get(row.expect);
    if (prev && stableCore(prev) !== stableCore(row)) throw new Error(`同期开奖冲突: ${row.expect}`);
    map.set(row.expect, row);
  }
  return [...map.values()].sort((a, b) => a.period - b.period);
}

function stableCore(r) {
  return JSON.stringify({
    expect: r.expect,
    openTime: r.openTime,
    regular: r.regular,
    special: r.special,
    regularZodiac: r.regularZodiac,
    specialZodiac: r.specialZodiac,
    zodiac: r.zodiac,
    wave: r.wave
  });
}

async function json(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(25000)
  });
  if (!res.ok) throw new Error(`读取开奖接口失败 HTTP ${res.status}: ${url}`);
  return res.json();
}

function loadArchive() {
  if (!fs.existsSync(OUT)) {
    return { schema: 1, year: YEAR, source: 'macaujc.com', createdAt: null, checkedAt: null, latestExpect: null, draws: [] };
  }
  const a = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  if (a.schema !== 1 || a.year !== YEAR || !Array.isArray(a.draws)) throw new Error('现有开奖存档格式异常，拒绝覆盖');
  return a;
}

function mergeImmutable(oldArchive, incoming, nowIso) {
  const oldMap = new Map(oldArchive.draws.map(d => [String(d.expect), d]));
  let added = 0;

  for (const row of incoming) {
    const existing = oldMap.get(row.expect);
    if (existing) {
      if (stableCore(existing) !== stableCore(row)) {
        throw new Error(`历史期开奖发生变化，已停止自动覆盖: ${row.expect}`);
      }
      continue;
    }
    oldMap.set(row.expect, { ...row, archivedAt: nowIso });
    added++;
  }

  const draws = [...oldMap.values()].sort((a, b) => a.period - b.period);
  const latest = draws.at(-1) ?? null;
  const signature = crypto.createHash('sha256')
    .update(JSON.stringify(draws.map(d => [d.expect, ...d.regular, d.special, d.specialZodiac])))
    .digest('hex');

  return {
    schema: 1,
    year: YEAR,
    source: 'macaujc.com',
    sourceHistory: HISTORY_URL,
    sourceLatest: LATEST_URL,
    createdAt: oldArchive.createdAt || nowIso,
    checkedAt: nowIso,
    latestExpect: latest?.expect || null,
    count: draws.length,
    sha256: signature,
    draws,
    added
  };
}

function writeLearningJsonl(draws) {
  const lines = draws.map(d => JSON.stringify({
    schema: 1,
    year: d.year,
    expect: d.expect,
    period: d.period,
    openTime: d.openTime,
    regular: d.regular,
    special: d.special,
    regularZodiac: d.regularZodiac,
    specialZodiac: d.specialZodiac,
    zodiac: d.zodiac,
    wave: d.wave
  }));
  fs.writeFileSync(JSONL, lines.join('\n') + (lines.length ? '\n' : ''));
}

async function main() {
  if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('正式期开奖存档只允许 GitHub Actions 后台执行');

  const [historyPayload, latestPayload] = await Promise.all([json(HISTORY_URL), json(LATEST_URL)]);
  const history = normalizePayload(historyPayload);
  const latest = normalizePayload(latestPayload);
  if (!history.length) throw new Error('2026 历史开奖为空');
  if (!latest.length) throw new Error('最新开奖为空');

  const hLast = history.at(-1);
  const lLast = latest.at(-1);
  if (hLast.expect !== lLast.expect || stableCore(hLast) !== stableCore(lLast)) {
    throw new Error(`历史接口与最新接口尚未同步: history=${hLast.expect}, latest=${lLast.expect}`);
  }

  const oldArchive = loadArchive();
  const nowIso = new Date().toISOString();
  const merged = mergeImmutable(oldArchive, history, nowIso);

  fs.mkdirSync('data', { recursive: true });
  const output = { ...merged };
  delete output.added;
  fs.writeFileSync(OUT, JSON.stringify(output, null, 2) + '\n');
  writeLearningJsonl(output.draws);

  console.log(JSON.stringify({
    status: 'ok',
    added: merged.added,
    count: output.count,
    latestExpect: output.latestExpect,
    sha256: output.sha256
  }));
}

if (require.main === module) {
  main().catch(err => {
    console.error(err && err.stack ? err.stack : String(err));
    process.exitCode = 1;
  });
}

module.exports = { normalizeRow, normalizePayload, mergeImmutable, stableCore };
