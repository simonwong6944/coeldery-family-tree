/**
 * FocusTree — 焦點式家庭樹主體（細步 4h）
 *
 * 4h 改動：
 *   - childLayer 改用 groups 結構，下層每房各自展開
 *   - 中層 SiblingBar（整代橫線）移除；每房子女由 ChildGroupRow 各自畫橫線
 *   - FocusCarousel：移除 selectedIdx 對下層影響；scroll 純視覺置中 + snap
 *   - 外層容器：overflow-y: auto（任務四）
 *   - 三層均傳 focusedMemberId 供半邊高亮
 *
 * module ≤ 250 行。
 */

import { useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { FocusView, Household } from '../../packages/family-tree-engine'
import {
  HouseholdChip, VerticalConnector, ChildGroupRow, ParentRow,
} from './FocusTreeParts'

/* ── FocusCarousel ── 中層 scroll-snap carousel ── */
function FocusCarousel({
  households, selectedIdx, focusedMemberId, onSelect, setFocusId,
}: {
  households: Household[]
  selectedIdx: number
  focusedMemberId?: string
  onSelect: (idx: number) => void
  setFocusId: (id: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const settling = useRef(false)

  // selectedIdx 變化時滾動到對應卡
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !el.children[selectedIdx]) return
    ;(el.children[selectedIdx] as HTMLElement).scrollIntoView({
      behavior: 'smooth', inline: 'center', block: 'nearest',
    })
  }, [selectedIdx])

  // scroll 停止後更新 selectedIdx（純視覺置中，不影響下層資料）
  const onScroll = useCallback(() => {
    if (settling.current) return
    settling.current = true
    setTimeout(() => {
      settling.current = false
      const el = scrollRef.current
      if (!el) return
      const center = el.getBoundingClientRect().left + el.clientWidth / 2
      let bestIdx = 0, bestDist = Infinity
      Array.from(el.children).forEach((child, i) => {
        const r = (child as HTMLElement).getBoundingClientRect()
        const d = Math.abs(r.left + r.width / 2 - center)
        if (d < bestDist) { bestDist = d; bestIdx = i }
      })
      if (bestIdx !== selectedIdx) onSelect(bestIdx)
    }, 150)
  }, [selectedIdx, onSelect])

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      style={{
        display: 'flex', flexDirection: 'row', gap: '12px',
        overflowX: 'auto', width: '100%',
        scrollSnapType: 'x mandatory',
        padding: '4px calc(50% - 90px)',
        boxSizing: 'border-box',
        msOverflowStyle: 'none',
        position: 'relative', zIndex: 1,
      }}
    >
      {households.map((hh, i) => (
        <div key={hh.primary.id} style={{ scrollSnapAlign: 'center', flexShrink: 0 }}>
          <HouseholdChip
            hh={hh} size={80}
            isFocus={i === selectedIdx}
            focusedMemberId={focusedMemberId}
            onClickPrimary={setFocusId}
            onClickSpouse={setFocusId}
          />
        </div>
      ))}
    </div>
  )
}

/* ── FocusTree（主組件）── */

export interface FocusTreeProps {
  focusView: FocusView
  /** 中層目前選中的 household index（carousel snap 位置用） */
  selectedIdx: number
  /** is_self=1 成員 id（返回本人掣用） */
  selfId: string | null
  setFocusId: (id: string) => void
  setSelectedIdx: (idx: number) => void
}

export default function FocusTree({
  focusView, selectedIdx, selfId, setFocusId, setSelectedIdx,
}: FocusTreeProps) {
  const { t } = useTranslation()
  const { parentLayer, focusLayer, childLayer } = focusView
  const focusedMemberId = focusView.focusId

  const hasParents = parentLayer.households.length > 0
  // 有任何一組子女（非空）才顯示下層標籤
  const hasAnyChildren = childLayer.groups.some(g => g.households.length > 0)
  const safeIdx = selectedIdx < focusLayer.households.length ? selectedIdx : 0

  return (
    /* 外層：overflow-y: auto（任務四：三層 viewport 上下 scroll） */
    <div style={{
      width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 0, position: 'relative', paddingTop: '8px',
      overflowY: 'auto',
    }}>

      {/* 返回本人掣 */}
      {selfId && selfId !== focusView.focusId && (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingBottom: '8px' }}>
          <button
            onClick={() => setFocusId(selfId)}
            style={{
              padding: '0 20px', minHeight: '40px', borderRadius: '20px',
              fontSize: '15px', fontWeight: 'bold', fontFamily: 'inherit', cursor: 'pointer',
              border: '2px solid var(--color-primary)',
              backgroundColor: 'var(--color-card)', color: 'var(--color-primary)',
            }}
          >{t('gen.back_to_self')}</button>
        </div>
      )}

      {/* 上層（父母代） */}
      {hasParents && (
        <>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', padding: '4px 0', fontWeight: 'bold' }}>
            {t('gen.parent_layer_label')}
          </div>
          <ParentRow
            households={parentLayer.households}
            focusedMemberId={focusedMemberId}
            setFocusId={setFocusId}
          />
          <VerticalConnector height={24} />
        </>
      )}

      {/* 中層（焦點代 carousel）— 4h 移除 SiblingBar */}
      <div style={{ fontSize: '13px', color: 'var(--color-primary)', padding: '2px 0 4px', fontWeight: 'bold' }}>
        {t('gen.focus_layer_label')}
      </div>
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <FocusCarousel
          households={focusLayer.households}
          selectedIdx={safeIdx}
          focusedMemberId={focusedMemberId}
          onSelect={setSelectedIdx}
          setFocusId={setFocusId}
        />
      </div>

      {/* 下層（仔女代）— 4h：每房獨立橫線，對正各自父母 */}
      {hasAnyChildren && (
        <>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', padding: '2px 0 4px', fontWeight: 'bold' }}>
            {t('gen.child_layer_label')}
          </div>
          {/* 下層橫向佈局：每組子女對正上面中層的 household */}
          <div style={{
            display: 'flex', flexDirection: 'row', gap: '12px',
            overflowX: 'auto', width: '100%',
            padding: '0 calc(50% - 90px)',
            boxSizing: 'border-box',
            alignItems: 'flex-start',
          }}>
            {childLayer.groups.map((group) => (
              <ChildGroupRow
                key={group.parentHouseholdId}
                group={group}
                focusedMemberId={focusedMemberId}
                setFocusId={setFocusId}
              />
            ))}
          </div>
        </>
      )}

      <div style={{ height: '16px' }} />
    </div>
  )
}
