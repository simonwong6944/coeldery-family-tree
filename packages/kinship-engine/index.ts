/**
 * @coeldery/kinship-engine
 * 以「本人」為中心嘅親屬稱謂推算（原 v2+ 功能，產品負責人拉前實作）
 *
 * 方法：由本人節點出發，沿 parent_child（父母↔子女）＋ marriage（配偶）行 BFS，
 * 取最短「關係步驟」路徑（F=父／M=母／s=子／d=女／S=配偶；P/c = 性別未知），
 * 再由「步驟 + 途經節點 id + 性別 + 生日（長幼）」映射去 i18n key（kin.*）。
 * 推算唔到 → 'kin.relative'（親屬）。
 *
 * 回傳 i18n key（唔回中文字），由 UI 自行 t(key)。
 * module ≤ 250 行。
 */

export interface KinMember {
  id: string
  gender?: string | null
  birth_date?: string | null
  member_kind?: string
}
export interface KinRel {
  from_member: string
  to_member: string
  edge_type: string
}

interface KinIndex {
  byId: Map<string, KinMember>
  parents: Map<string, string[]>
  children: Map<string, string[]>
  spouses: Map<string, string[]>
}

/* ── helpers ── */
function push(map: Map<string, string[]>, k: string, v: string) {
  const a = map.get(k); if (a) a.push(v); else map.set(k, [v])
}
function gOf(idx: KinIndex, id: string): 'm' | 'f' | null {
  const g = idx.byId.get(id)?.gender
  return g === 'male' ? 'm' : g === 'female' ? 'f' : null
}
/** birth(a) 早過 birth(b) → true；缺生日 → null（長幼不明） */
function older(idx: KinIndex, a: string, b: string): boolean | null {
  const ba = idx.byId.get(a)?.birth_date, bb = idx.byId.get(b)?.birth_date
  if (!ba || !bb) return null
  return ba < bb
}

/** 建立關係索引 */
export function buildKinIndex(members: KinMember[], rels: KinRel[]): KinIndex {
  const byId = new Map(members.map(m => [m.id, m]))
  const parents = new Map<string, string[]>(), children = new Map<string, string[]>(), spouses = new Map<string, string[]>()
  for (const r of rels) {
    if (r.edge_type === 'parent_child') {
      push(children, r.from_member, r.to_member)
      push(parents, r.to_member, r.from_member)
    } else if (r.edge_type === 'marriage') {
      push(spouses, r.from_member, r.to_member)
      push(spouses, r.to_member, r.from_member)
    }
  }
  return { byId, parents, children, spouses }
}

/* ── BFS：回傳 steps（F/M/s/d/S） + nodes（self…target）── */
function findPath(selfId: string, targetId: string, idx: KinIndex): { steps: string[]; nodes: string[] } | null {
  const { parents, children, spouses } = idx
  const stepOf = (from: string, to: string): string | null => {
    const g = gOf(idx, to)
    if ((parents.get(from)  ?? []).includes(to)) return g === 'f' ? 'M' : g === 'm' ? 'F' : 'P'
    if ((children.get(from) ?? []).includes(to)) return g === 'f' ? 'd' : g === 'm' ? 's' : 'c'
    if ((spouses.get(from)  ?? []).includes(to)) return 'S'
    return null
  }
  const seen = new Set<string>([selfId])
  const queue: Array<{ id: string; steps: string[]; nodes: string[] }> = [{ id: selfId, steps: [], nodes: [selfId] }]
  while (queue.length) {
    const cur = queue.shift()!
    const nbs = [...(parents.get(cur.id) ?? []), ...(children.get(cur.id) ?? []), ...(spouses.get(cur.id) ?? [])]
    for (const nb of nbs) {
      const st = stepOf(cur.id, nb)
      if (!st) continue
      const steps = [...cur.steps, st]
      const nodes = [...cur.nodes, nb]
      if (nb === targetId) return { steps, nodes }
      if (!seen.has(nb)) { seen.add(nb); queue.push({ id: nb, steps, nodes }) }
    }
  }
  return null
}

/* ── 對外 API：回 i18n key ── */
export function resolveKinship(selfId: string, targetId: string, members: KinMember[], rels: KinRel[]): string {
  if (!selfId || !targetId) return 'kin.relative'
  if (selfId === targetId) return 'kin.self'
  const idx = buildKinIndex(members, rels)
  if (!idx.byId.has(selfId) || !idx.byId.has(targetId)) return 'kin.relative'
  const path = findPath(selfId, targetId, idx)
  if (!path) return 'kin.relative'
  return resolvePath(path.steps, path.nodes, idx)
}

/** 一次過為全部成員算 key（Map<memberId, i18nKey>） */
export function buildKinshipMap(selfId: string, members: KinMember[], rels: KinRel[]): Map<string, string> {
  const out = new Map<string, string>()
  for (const m of members) out.set(m.id, resolveKinship(selfId, m.id, members, rels))
  return out
}

/* ════════════════════════════════════════════════════════════
 * 以下：步驟 pattern → i18n key
 * ════════════════════════════════════════════════════════════ */

function siblingKey(g: 'm' | 'f' | null, ord: boolean | null): string {
  if (g === 'm') return ord === false ? 'kin.younger_brother' : ord === true ? 'kin.elder_brother' : 'kin.brother'
  if (g === 'f') return ord === false ? 'kin.younger_sister'  : ord === true ? 'kin.elder_sister'  : 'kin.sister'
  return 'kin.relative'
}

function ancestorKey(s: string, g: 'm' | 'f' | null): string {
  const n = s.length
  const maternal = s[0] === 'M'
  const male = g === 'm', female = g === 'f'
  if (n === 1) return male ? 'kin.father' : female ? 'kin.mother' : 'kin.parent'
  if (n === 2) {
    if (maternal) return male ? 'kin.grandfather_maternal' : female ? 'kin.grandmother_maternal' : 'kin.relative'
    return male ? 'kin.grandfather_paternal' : female ? 'kin.grandmother_paternal' : 'kin.relative'
  }
  if (n === 3) {
    if (maternal) return male ? 'kin.great_grandfather_maternal' : female ? 'kin.great_grandmother_maternal' : 'kin.relative'
    return male ? 'kin.great_grandfather_paternal' : female ? 'kin.great_grandmother_paternal' : 'kin.relative'
  }
  if (maternal) return male ? 'kin.ancestor_maternal_m' : female ? 'kin.ancestor_maternal_f' : 'kin.relative'
  return male ? 'kin.ancestor_paternal_m' : female ? 'kin.ancestor_paternal_f' : 'kin.relative'
}

function descendantKey(s: string, g: 'm' | 'f' | null): string {
  const n = s.length
  const maternal = s[0] === 'd'   // 經女兒 → 外
  const male = g === 'm', female = g === 'f'
  if (n === 1) return male ? 'kin.son' : female ? 'kin.daughter' : 'kin.child'
  if (n === 2) {
    if (maternal) return male ? 'kin.grandson_maternal' : female ? 'kin.granddaughter_maternal' : 'kin.relative'
    return male ? 'kin.grandson' : female ? 'kin.granddaughter' : 'kin.grandchild'
  }
  return male ? 'kin.great_grandson' : female ? 'kin.great_granddaughter' : 'kin.descendant'
}

/** 某人嘅配偶（base = 該人路徑；nodes 長度 = base.length + 1）*/
function spouseOfRelativeKey(base: string, nodes: string[], idx: KinIndex): string {
  if (base === 's') return 'kin.daughter_in_law'
  if (base === 'd') return 'kin.son_in_law'

  /* 兄弟姊妹嘅配偶：base = [F|M|P][s|d] → nodes[2] 係兄/弟/姊/妹 */
  if (/^[FMP][sd]$/.test(base)) {
    const viaBrother = base[1] === 's'
    const ord = older(idx, nodes[2], nodes[0])
    if (viaBrother) return ord === false ? 'kin.sister_in_law_younger' : 'kin.sister_in_law_elder'
    return ord === false ? 'kin.brother_in_law_younger' : 'kin.brother_in_law_elder'
  }

  /* 父母嘅兄弟姊妹嘅配偶：base = [F|M][F|M][s|d] → nodes[3] */
  if (/^[FM][FM][sd]$/.test(base)) {
    const paternal = base[0] === 'F'
    const viaUncle = base[2] === 's'
    if (paternal && viaUncle) {
      const ord = older(idx, nodes[3], nodes[1])   // 伯/叔 vs 父
      return ord === false ? 'kin.uncle_wife_younger' : 'kin.uncle_wife_elder'
    }
    if (paternal && !viaUncle) return 'kin.aunt_husband'         // 姑丈
    if (!paternal && viaUncle) return 'kin.uncle_wife_maternal'  // 舅母
    return 'kin.aunt_husband_maternal'                           // 姨丈
  }
  return 'kin.relative'
}

function resolvePath(steps: string[], nodes: string[], idx: KinIndex): string {
  const s = steps.join('')
  const g = gOf(idx, nodes[nodes.length - 1])

  /* 1) 配偶 */
  if (s === 'S') return g === 'f' ? 'kin.wife' : g === 'm' ? 'kin.husband' : 'kin.spouse'

  /* 2) 全上（祖先）/ 全下（後代）*/
  if (/^[FMP]+$/.test(s)) return ancestorKey(s, g)
  if (/^[sdc]+$/.test(s)) return descendantKey(s, g)

  /* 3) 末尾係配偶：某人嘅配偶 */
  if (s.length >= 2 && s.endsWith('S')) {
    return spouseOfRelativeKey(s.slice(0, -1), nodes.slice(0, -1), idx)
  }

  /* 4) 開頭係配偶：配偶嘅親屬 */
  if (s.startsWith('S')) {
    const selfG = gOf(idx, nodes[0])
    const base  = s.slice(1)
    if (/^[FM]$/.test(base)) {
      const male = base === 'F'
      if (selfG === 'f') return male ? 'kin.husband_father' : 'kin.husband_mother'
      return male ? 'kin.father_in_law' : 'kin.mother_in_law'
    }
    /* 配偶嘅兄弟姊妹：S + [F|M] + [s|d] → nodes[3]；長幼比配偶 nodes[1] */
    if (/^[FM][sd]$/.test(base)) {
      const tG  = gOf(idx, nodes[3])
      const ord = older(idx, nodes[3], nodes[1])
      if (tG === 'm') return ord === false ? 'kin.spouse_younger_brother' : 'kin.spouse_elder_brother'
      if (tG === 'f') return ord === false ? 'kin.spouse_younger_sister'  : 'kin.spouse_elder_sister'
    }
    return 'kin.relative'
  }

  /* 5) 兄弟姊妹：[P][s|d|c]；長幼比本人 nodes[0] */
  if (steps.length === 2 && /^[FMP]$/.test(steps[0]) && /^[sdc]$/.test(steps[1])) {
    return siblingKey(g, older(idx, nodes[2], nodes[0]))
  }

  /* 6) 父母嘅兄弟姊妹：[F|M][F|M][s|d]；長幼比父母 nodes[1] */
  if (steps.length === 3 && /^[FM]$/.test(steps[0]) && /^[FM]$/.test(steps[1]) && /^[sd]$/.test(steps[2])) {
    const paternal = steps[0] === 'F'
    const ord = older(idx, nodes[3], nodes[1])
    if (g === 'm') {
      if (!paternal) return 'kin.uncle_maternal'
      return ord === false ? 'kin.uncle_younger' : ord === true ? 'kin.uncle_elder' : 'kin.uncle'
    }
    if (g === 'f') return paternal ? 'kin.aunt_paternal' : 'kin.aunt_maternal'
    return 'kin.relative'
  }

  /* 7) 兄弟姊妹嘅仔女：[F|M][s|d][s|d] */
  if (steps.length === 3 && /^[FM]$/.test(steps[0]) && /^[sd]$/.test(steps[1]) && /^[sd]$/.test(steps[2])) {
    const viaBrother = steps[1] === 's'
    if (viaBrother) return g === 'f' ? 'kin.niece' : 'kin.nephew'
    return g === 'f' ? 'kin.niece_sister' : 'kin.nephew_sister'
  }

  /* 8) 堂／表兄弟姊妹：[F|M][F|M][s|d][s|d] */
  if (steps.length === 4 && /^[FM]$/.test(steps[0]) && /^[FM]$/.test(steps[1]) && /^[sd]$/.test(steps[2]) && /^[sd]$/.test(steps[3])) {
    const tang = steps[0] === 'F' && steps[2] === 's'   // 父系伯/叔之子女 = 堂
    if (tang) return g === 'f' ? 'kin.cousin_paternal_f' : 'kin.cousin_paternal_m'
    return g === 'f' ? 'kin.cousin_maternal_f' : 'kin.cousin_maternal_m'
  }

  return 'kin.relative'
}
