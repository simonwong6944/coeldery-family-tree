import './utils/i18n'
import './index.css'
import B1HomePage from './pages/B1HomePage'

/**
 * App root — 全域桌面置中限寬容器
 *
 * 桌面（>480px）：最大闊度 480px，水平置中，側邊留白。
 * 手機（≤480px）：滿版（width: 100%），無側邊留白。
 * backgroundColor 與 --color-bg 一致，令側邊留白區域色調融合。
 */
function App() {
  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '0 auto',
        minHeight: '100svh',
        position: 'relative',
        backgroundColor: 'var(--color-bg)',
        /* 桌面下令容器有輕微陰影，令「手機居中」視覺更突出 */
        boxShadow: 'var(--shadow-soft)',
      }}
    >
      <B1HomePage />
    </div>
  )
}

export default App
