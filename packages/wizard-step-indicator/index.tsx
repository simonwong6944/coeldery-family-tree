/**
 * @coeldery/wizard-step-indicator
 * CoEldery 85 家庭樹 — 精靈步驟指示器
 *
 * 規格（B2_B3.md §3.0 / §4）：
 *   - 橫排圓點：當前 = var(--color-primary) 實心，其餘 = var(--color-divider) 空心
 *   - 下方 muted 文字「第 X 步 / 共 N 步」
 *   - 長者友善：圓點 12px，間距充足，文字 18px
 * 顏色：只用 CSS var，禁止 hardcode hex / rgba
 * 文字：全部 via i18n t('key')
 */

import { useTranslation } from 'react-i18next'

export interface WizardStepIndicatorProps {
  /** 總步驟數 */
  totalSteps: number
  /** 當前步驟（1-based） */
  currentStep: number
}

export default function WizardStepIndicator({ totalSteps, currentStep }: WizardStepIndicatorProps) {
  const { t } = useTranslation()

  return (
    <div
      aria-label={t('b3.step_indicator_label', { current: currentStep, total: totalSteps })}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        backgroundColor: 'var(--color-card)',
        borderBottom: '1px solid var(--color-divider)',
      }}
    >
      {/* 橫排圓點 */}
      <div
        role="list"
        aria-label={t('b3.step_dots_label')}
        style={{ display: 'flex', gap: '12px', alignItems: 'center' }}
      >
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNum = i + 1
          const isCurrent = stepNum === currentStep
          const isPast = stepNum < currentStep
          return (
            <span
              key={stepNum}
              role="listitem"
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={t('b3.step_dot_label', { step: stepNum })}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                flexShrink: 0,
                /* 當前步驟：實心綠色；過去步驟：實心綠色（較深表示完成）；
                   未來步驟：空心（只有邊框） */
                backgroundColor: isCurrent || isPast
                  ? 'var(--color-primary)'
                  : 'transparent',
                border: isCurrent || isPast
                  ? 'none'
                  : '2px solid var(--color-divider)',
                /* 當前步驟稍大以突顯 */
                transform: isCurrent ? 'scale(1.25)' : 'none',
                transition: 'transform 0.2s ease, background-color 0.2s ease',
              }}
            />
          )
        })}
      </div>

      {/* 步驟文字「第 X 步 / 共 N 步」 */}
      <p
        aria-live="polite"
        style={{
          margin: 0,
          fontSize: '18px',
          color: 'var(--color-text-secondary)',
          fontFamily: 'inherit',
        }}
      >
        {t('b3.step_text', { current: currentStep, total: totalSteps })}
      </p>
    </div>
  )
}
