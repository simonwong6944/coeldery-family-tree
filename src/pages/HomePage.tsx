import { useTranslation } from 'react-i18next'

/**
 * 首頁（骨架版）
 * 只顯示 app_name，確認 i18n 正常運作
 * 唔包含任何真實 UI、頁面結構或示範資料
 */
function HomePage() {
  const { t } = useTranslation()

  return (
    <main className="flex items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
        {t('app_name')}
      </h1>
    </main>
  )
}

export default HomePage
