#!/usr/bin/env node
/**
 * generate-merchant-sql — 由 data/merchants.json 產生 D1 SQL（商戶資料錄入）
 *
 * 用法：
 *   node scripts/generate-merchant-sql.mjs                      # 印去 stdout
 *   node scripts/generate-merchant-sql.mjs --out scripts/generated/merchants.sql
 *
 * 產生嘅 SQL 會：
 *   - 用 UPSERT（ON CONFLICT DO UPDATE）→ 可以安全重複執行更新商戶資料
 *   - **唔會**改 `promotion.claimed_count`（保留已領取名額紀錄）
 *   - 標籤對應（merchant_tag_map）用 INSERT OR IGNORE（唔會刪走現有標籤）
 *
 * 套用（remote 由產品負責人執行，rules §19）：
 *   npx wrangler d1 execute coeldery-family-tree-db --local  --file <out>
 *   npx wrangler d1 execute coeldery-family-tree-db --remote --file <out>
 *
 * 驗證規則（錯即中止）：
 *   - id 唯一；merchant 必須有 name + 已知 category_id
 *   - landmark_id / district group_id 必須存在（json 或 migration 既有種子）
 *   - 標籤 id 必須存在（json 或 migration 既有種子）
 *   - promotion **必須綁 festival_id**，且該節日必須存在（唯讀 migration 0016 種子）
 *   - promotion.merchant_id 必須喺（json merchants ∪ migration 既有商戶）
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const JSON_PATH = resolve('data/merchants.json')
const MIG_0016  = resolve('migrations/0016_festival_promotions.sql')

/* ── migration 既有種子（除非改 migration，否則唔使改呢個清單）── */
const KNOWN = {
  districtGroups: ['dg-hk-island', 'dg-kowloon', 'dg-nt'],
  districts:      ['dt-wanchai', 'dt-kwuntong', 'dt-shatin'],
  landmarks:      ['lm-times-sq', 'lm-kwuntong-mtr', 'lm-newtown-plz'],
  categories:     ['cat-food', 'cat-health', 'cat-home', 'cat-gift', 'cat-funeral', 'cat-elderly'],
  tags:           ['tag-cha-chaan', 'tag-yumcha', 'tag-delivery', 'tag-western-dr', 'tag-chinese-dr',
                   'tag-homevisit', 'tag-cleaning', 'tag-nursing', 'tag-flower', 'tag-gift-box',
                   'tag-funeral-svc', 'tag-tribute', 'tag-pharmacy', 'tag-transport'],
  merchants:      ['mc-funeral-shatin', 'mc-clinic-wanchai', 'mc-cha-kwuntong'],
}

/** 由 migration 0016 讀出節日 id（避免同 DB 種子脫節）*/
function readFestivalIds() {
  const sql = readFileSync(MIG_0016, 'utf8')
  const i = sql.indexOf('INSERT OR IGNORE INTO festival')
  if (i < 0) return []
  const block = sql.slice(i)
  return [...block.matchAll(/'([a-z0-9-]+)'\s*,\s*'[^']*'\s*,\s*'\d{4}-\d{2}-\d{2}'/g)].map(m => m[1])
}

const errs = []
const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`)
const n = (v) => (v === null || v === undefined ? 'NULL' : Number(v))

function upsert(table, cols, values, updateCols) {
  const setClause = updateCols.map(c => `${c} = excluded.${c}`).join(', ')
  return `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${values.join(', ')})\n`
    + `  ON CONFLICT(id) DO UPDATE SET ${setClause};`
}

function main() {
  const data = JSON.parse(readFileSync(JSON_PATH, 'utf8'))
  const festivals = readFestivalIds()
  if (festivals.length === 0) errs.push('讀唔到 migration 0016 嘅節日種子（節日推廣需要節日）')

  const districts = data.districts ?? []
  const landmarks = data.landmarks ?? []
  const tags      = data.tags ?? []
  const merchants = data.merchants ?? []
  const promos    = data.promotions ?? []

  const groupIds = new Set([...KNOWN.districtGroups])
  const districtIds = new Set([...KNOWN.districts, ...districts.map(d => d.id)])
  const landmarkIds = new Set([...KNOWN.landmarks, ...landmarks.map(l => l.id)])
  const categoryIds = new Set([...KNOWN.categories])
  const tagIds = new Set([...KNOWN.tags, ...tags.map(t => t.id)])
  const merchantIds = new Set([...KNOWN.merchants, ...merchants.map(m => m.id)])

  const seen = new Set()
  const dup = (kind, id) => { if (seen.has(kind + id)) errs.push(`${kind} id 重複：${id}`); seen.add(kind + id) }

  for (const d of districts) {
    dup('district:', d.id)
    if (!groupIds.has(d.group_id)) errs.push(`district ${d.id} 嘅 group_id 唔存在：${d.group_id}`)
    if (!d.name) errs.push(`district ${d.id} 缺 name`)
  }
  for (const l of landmarks) {
    dup('landmark:', l.id)
    if (!districtIds.has(l.district_id)) errs.push(`landmark ${l.id} 嘅 district_id 唔存在：${l.district_id}`)
    if (!l.name) errs.push(`landmark ${l.id} 缺 name`)
  }
  for (const t of tags) {
    dup('tag:', t.id)
    if (!categoryIds.has(t.category_id)) errs.push(`tag ${t.id} 嘅 category_id 唔存在：${t.category_id}`)
    if (!t.name) errs.push(`tag ${t.id} 缺 name`)
  }
  for (const m of merchants) {
    dup('merchant:', m.id)
    if (!m.name) errs.push(`merchant ${m.id} 缺 name`)
    if (!categoryIds.has(m.category_id)) errs.push(`merchant ${m.id} 嘅 category_id 唔存在：${m.category_id}`)
    if (m.landmark_id && !landmarkIds.has(m.landmark_id)) errs.push(`merchant ${m.id} 嘅 landmark_id 唔存在：${m.landmark_id}`)
    if (m.is_listed !== 0 && m.is_listed !== 1) errs.push(`merchant ${m.id} 嘅 is_listed 必須為 0 或 1`)
    if (m.ad_tier !== undefined && ![0, 1, 2].includes(m.ad_tier)) errs.push(`merchant ${m.id} 嘅 ad_tier 必須為 0/1/2`)
    for (const tid of m.tags ?? []) if (!tagIds.has(tid)) errs.push(`merchant ${m.id} 嘅 tag 唔存在：${tid}`)
  }
  for (const p of promos) {
    dup('promotion:', p.id)
    if (!p.merchant_id || !merchantIds.has(p.merchant_id)) errs.push(`promotion ${p.id} 嘅 merchant_id 唔存在：${p.merchant_id}`)
    if (!p.festival_id) errs.push(`promotion ${p.id} **必須綁節日 festival_id**（唔可以係個人生日等非節日推廣）`)
    else if (!festivals.includes(p.festival_id)) errs.push(`promotion ${p.id} 嘅 festival_id 唔存在於節日曆：${p.festival_id}`)
    if (!p.title) errs.push(`promotion ${p.id} 缺 title`)
    if (p.quota_total !== null && p.quota_total !== undefined && (!Number.isInteger(p.quota_total) || p.quota_total < 0))
      errs.push(`promotion ${p.id} 嘅 quota_total 必須為 null 或 >= 0 嘅整數`)
  }

  if (errs.length) {
    console.error('❌ 資料驗證失敗：')
    for (const e of errs) console.error('   • ' + e)
    process.exit(1)
  }

  /* ── 產生 SQL ── */
  const out = []
  out.push('-- 由 scripts/generate-merchant-sql.mjs 產生 — 請勿手改（改 data/merchants.json 再產生）')
  out.push(`-- 產生時間：${new Date().toISOString()}`)
  out.push(`-- 商戶 ${merchants.length} 間／標籤 ${tags.length} 個／地區 ${districts.length} 個／地標 ${landmarks.length} 個／節日推廣 ${promos.length} 張`)
  out.push('')
  for (const d of districts) {
    out.push(upsert('district', ['id', 'group_id', 'name'], [q(d.id), q(d.group_id), q(d.name)], ['group_id', 'name']))
  }
  for (const l of landmarks) {
    out.push(upsert('landmark', ['id', 'district_id', 'name', 'landmark_type'],
      [q(l.id), q(l.district_id), q(l.name), q(l.landmark_type ?? 'other')], ['district_id', 'name', 'landmark_type']))
  }
  for (const t of tags) {
    out.push(upsert('merchant_tag', ['id', 'category_id', 'name'], [q(t.id), q(t.category_id), q(t.name)], ['category_id', 'name']))
  }
  for (const m of merchants) {
    out.push(upsert('merchant',
      ['id', 'name', 'landmark_id', 'category_id', 'is_listed', 'ad_tier', 'phone', 'whatsapp', 'map_url', 'address', 'description', 'photo_url', 'paid_note'],
      [q(m.id), q(m.name), q(m.landmark_id), q(m.category_id), n(m.is_listed ?? 0), n(m.ad_tier ?? 0),
        q(m.phone), q(m.whatsapp), q(m.map_url), q(m.address), q(m.description), q(m.photo_url), q(m.paid_note)],
      ['name', 'landmark_id', 'category_id', 'is_listed', 'ad_tier', 'phone', 'whatsapp', 'map_url', 'address', 'description', 'photo_url', 'paid_note']))
    for (const tid of m.tags ?? []) {
      out.push(`INSERT OR IGNORE INTO merchant_tag_map (merchant_id, tag_id) VALUES (${q(m.id)}, ${q(tid)});`)
    }
  }
  for (const p of promos) {
    out.push(upsert('promotion',
      ['id', 'merchant_id', 'festival_id', 'title', 'description', 'terms', 'quota_total', 'valid_from', 'valid_to', 'is_active'],
      [q(p.id), q(p.merchant_id), q(p.festival_id), q(p.title), q(p.description), q(p.terms),
        n(p.quota_total ?? null), q(p.valid_from ?? null), q(p.valid_to ?? null), n(p.is_active ?? 1)],
      /* ⚠️ 故意唔更新 claimed_count（保留已領取紀錄）*/
      ['merchant_id', 'festival_id', 'title', 'description', 'terms', 'quota_total', 'valid_from', 'valid_to', 'is_active']))
  }
  const sql = out.join('\n') + '\n'

  const outIdx = process.argv.indexOf('--out')
  if (outIdx > -1 && process.argv[outIdx + 1]) {
    const rel = process.argv[outIdx + 1]
    const path = resolve(rel)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, sql, 'utf8')
    console.log(`✅ 已產生 ${rel}`)
    console.log(`   商戶 ${merchants.length}／標籤 ${tags.length}／地區 ${districts.length}／地標 ${landmarks.length}／節日推廣 ${promos.length}`)
    console.log(`   本機：npx wrangler d1 execute coeldery-family-tree-db --local  --file ${rel}`)
    console.log(`   線上：npx wrangler d1 execute coeldery-family-tree-db --remote --file ${rel}`)
  } else {
    console.log(sql)
  }
}

main()
