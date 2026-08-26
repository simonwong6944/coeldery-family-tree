/**
 * @coeldery/upload-panel
 * CoEldery 85 家庭樹 — 上傳相片/短片面板組件（UI 殼，靜態）
 *
 * 功能範圍（細步 3a，靜態 UI only）：
 *   - 「＋ 上傳相片／短片」觸發按鈕（CTA，≥ 56px 高，pill 圓角 28px，綠底白字）
 *   - isOpen=true 時顯示選擇面板（底部彈起 sheet 樣式）
 *   - 面板選項：拍攝相片 / 拍攝短片 / 從相簿選取 / 取消
 *   - 唔做真實上傳、唔整合 R2、唔做狀態機邏輯（interface 已預留，見 module.json docs）
 *
 * 上傳狀態機（預留 interface，實作在未來細步）：
 *   pending_upload → uploading → verified(200) → db_write → completed
 *   每次必須攞到成功上傳 URL/key（200 response）先寫入資料庫。
 *
 * 顏色：只用 CSS var，禁止 hardcode hex。
 * 文字：全部 via i18n t('key')。
 * 字級 ≥ 18px，觸控熱區 ≥ 44×44px，CTA ≥ 56px。
 */

import { useTranslation } from 'react-i18next'

/* ── Upload State Machine Type（預留，未來接真實上傳時實作） ─── */
export type UploadState =
  | 'idle'
  | 'pending_upload'
  | 'uploading'
  | 'verified'
  | 'db_write'
  | 'completed'
  | 'error'

export type UploadSource = 'camera_photo' | 'camera_video' | 'gallery'

export interface UploadPanelProps {
  /** 面板是否開啟（靜態 UI 由父層用 state 控制，若此組件純靜態則傳 false） */
  isOpen?: boolean
  /** 觸發按鈕點擊 handler */
  onOpen?: () => void
  /** 面板關閉 handler */
  onClose?: () => void
  /** 選擇來源 handler（靜態 UI 可不傳） */
  onSelectSource?: (source: UploadSource) => void
  /** 是否顯示 CTA 按鈕（預設 true） */
  showTrigger?: boolean
}

/* ── Option Button ─── */

interface OptionButtonProps {
  label: string
  onClick?: () => void
  isCancel?: boolean
}

function OptionButton({ label, onClick, isCancel = false }: OptionButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        minHeight: '56px',
        padding: '16px 24px',
        border: 'none',
        borderRadius: '12px',
        background: isCancel ? 'var(--color-divider)' : 'var(--color-card)',
        color: isCancel ? 'var(--color-text-secondary)' : 'var(--color-text)',
        fontSize: '18px',
        fontWeight: isCancel ? 'normal' : 'bold',
        fontFamily: 'inherit',
        cursor: 'pointer',
        textAlign: 'center',
        boxShadow: isCancel ? 'none' : 'var(--shadow-subtle)',
        transition: 'background 0.15s ease',
        outline: 'none',
      }}
      onFocus={(e) => { e.currentTarget.style.outline = '3px solid var(--color-primary)'; e.currentTarget.style.outlineOffset = '2px' }}
      onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
    >
      {label}
    </button>
  )
}

/* ── Main Component ─── */

export default function UploadPanel({
  isOpen = false,
  onOpen,
  onClose,
  onSelectSource,
  showTrigger = true,
}: UploadPanelProps) {
  const { t } = useTranslation()

  return (
    <>
      {/* ── CTA 觸發按鈕 ── */}
      {showTrigger && (
        <button
          onClick={onOpen}
          aria-label={t('upload_panel.button_label')}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '56px',
            padding: '0 32px',
            borderRadius: '28px',
            border: 'none',
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-card)',
            fontSize: '18px',
            fontWeight: 'bold',
            fontFamily: 'inherit',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-cta)',
            whiteSpace: 'nowrap',
            outline: 'none',
          }}
          onFocus={(e) => { e.currentTarget.style.outline = '3px solid var(--color-primary)'; e.currentTarget.style.outlineOffset = '4px' }}
          onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
        >
          {t('upload_panel.button_label')}
        </button>
      )}

      {/* ── 選擇面板（底部 sheet，isOpen=true 才顯示）── */}
      {isOpen && (
        <>
          {/* 背景蒙層 */}
          <div
            role="presentation"
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'var(--overlay-scrim)',
              zIndex: 200,
            }}
          />

          {/* 面板本體 */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('upload_panel.panel_title')}
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 201,
              backgroundColor: 'var(--color-bg)',
              borderRadius: '20px 20px 0 0',
              padding: '24px 16px calc(24px + env(safe-area-inset-bottom, 0px))',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* 面板標題 */}
            <h2
              style={{
                margin: '0 0 8px',
                fontSize: '20px',
                fontWeight: 'bold',
                color: 'var(--color-text)',
                textAlign: 'center',
                fontFamily: 'inherit',
              }}
            >
              {t('upload_panel.panel_title')}
            </h2>

            {/* 拍攝相片 */}
            <OptionButton
              label={t('upload_panel.option_camera')}
              onClick={() => onSelectSource?.('camera_photo')}
            />

            {/* 拍攝短片 */}
            <OptionButton
              label={t('upload_panel.option_video')}
              onClick={() => onSelectSource?.('camera_video')}
            />

            {/* 從相簿選取 */}
            <OptionButton
              label={t('upload_panel.option_gallery')}
              onClick={() => onSelectSource?.('gallery')}
            />

            {/* 分隔 */}
            <div style={{ height: '1px', backgroundColor: 'var(--color-divider)', margin: '4px 0' }} />

            {/* 取消 */}
            <OptionButton
              label={t('upload_panel.cancel')}
              onClick={onClose}
              isCancel
            />
          </div>
        </>
      )}
    </>
  )
}
