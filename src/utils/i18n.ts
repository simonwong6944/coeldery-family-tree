/**
 * i18n 初始化模組
 * 所有面向用戶嘅文字必須經呢個模組引用，唔准 hardcode
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import zhHant from '../../locales/zh-Hant.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'zh-Hant': {
        translation: zhHant,
      },
    },
    lng: 'zh-Hant',
    fallbackLng: 'zh-Hant',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
