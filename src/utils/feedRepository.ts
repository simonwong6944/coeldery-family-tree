/**
 * feedRepository — 家庭圈 (B4) 資料層 (data layer)
 *
 * 目的:把「資料存喺邊」同「組件點顯示」分開。
 * 現階段:內部用 localStorage 讀寫 (前端持久化,無需後端)。
 * 將來 make it real:只需改本檔內部實作 (改成 fetch 後端 API),
 *   所有組件/頁面 call 同樣函數,一行都唔使改 (rules.md 第 9 條:接口/資料結構預留)。
 *
 * 注意:本檔只負責資料存取,不含任何 UI 文字 (UI 文字一律 i18n)。
 *   種子資料 (seed) 內的中文屬 UGC 示例 (rules.md 第 15.2 條),可保留自然口語。
 */

/* ── 型別定義 (對齊 packages/post-card 的 PostCardProps / CommentItem) ── */
export interface FeedComment {
  id: string
  authorName: string
  avatarUrl: string
  body: string
}

export interface FeedPost {
  id: string
  authorName: string
  authorAvatarUrl: string
  timeText: string
  aboutText: string
  photoUrl: string
  bodyText: string
  likers: string[]
  comments: FeedComment[]
}

/* ── localStorage key (統一前綴,避免撞其他 app) ── */
const STORAGE_KEY_POSTS = 'coeldery.b4.posts.v1'
const STORAGE_KEY_DISMISSED_RECO = 'coeldery.b4.dismissedReco.v1'

/* ── 目前登入者 (localStorage 階段先寫死本人,將來由 auth 提供) ── */
export const CURRENT_USER_NAME = '陳大文'

/* ── 種子資料 (首次開啟時寫入;文字屬 UGC 示例,依 15.2 可自然口語) ── */
function seedPosts(): FeedPost[] {
  return [
    {
      id: 'p1',
      authorName: '陳美玲',
      authorAvatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
      timeText: '2 小時前',
      aboutText: 'Lucky',
      photoUrl: 'https://images.dog.ceo/breeds/retriever-golden/n02099601_7771.jpg',
      bodyText: '今日帶 Lucky 去公園散步 🐾',
      likers: ['陳大文'],
      comments: [
        { id: 'c1', authorName: '陳大文', avatarUrl: 'https://randomuser.me/api/portraits/men/68.jpg', body: '好得意！' },
      ],
    },
    {
      id: 'p2',
      authorName: '陳志明',
      authorAvatarUrl: 'https://randomuser.me/api/portraits/men/22.jpg',
      timeText: '今日',
      aboutText: '陳嘉俊',
      photoUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
      bodyText: '兒子今日考試取得 A 🎉',
      likers: ['陳大文', '陳美玲'],
      comments: [],
    },
    {
      id: 'p3',
      authorName: '陳大文',
      authorAvatarUrl: 'https://randomuser.me/api/portraits/men/68.jpg',
      timeText: '昨日',
      aboutText: '本人',
      photoUrl: 'https://randomuser.me/api/portraits/men/41.jpg',
      bodyText: '一家人飲茶，好開心',
      likers: ['陳美玲'],
      comments: [
        { id: 'c2', authorName: '陳志明', avatarUrl: 'https://randomuser.me/api/portraits/men/22.jpg', body: '下次一齊去！' },
      ],
    },
  ]
}

/* ── 內部:讀取 (若無資料則寫入種子) ── */
function loadPosts(): FeedPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POSTS)
    if (raw) return JSON.parse(raw) as FeedPost[]
  } catch {
    /* 解析失敗則重設為種子 */
  }
  const seeded = seedPosts()
  savePosts(seeded)
  return seeded
}

/* ── 內部:寫入 ── */
function savePosts(posts: FeedPost[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(posts))
  } catch {
    /* 寫入失敗 (如私隱模式) 靜默處理,不阻斷 UI */
  }
}

/* ── 對外 API (組件只 call 呢啲,唔直接掂 localStorage) ── */

/** 取得全部貼文 */
export function getPosts(): FeedPost[] {
  return loadPosts()
}

/** 切換讚好 (以目前登入者名);回傳更新後全部貼文 */
export function toggleLike(postId: string): FeedPost[] {
  const posts = loadPosts()
  const next = posts.map(p => {
    if (p.id !== postId) return p
    const has = p.likers.includes(CURRENT_USER_NAME)
    return {
      ...p,
      likers: has
        ? p.likers.filter(n => n !== CURRENT_USER_NAME)
        : [...p.likers, CURRENT_USER_NAME],
    }
  })
  savePosts(next)
  return next
}

/** 新增留言;回傳更新後全部貼文 */
export function addComment(postId: string, body: string): FeedPost[] {
  const posts = loadPosts()
  const next = posts.map(p => {
    if (p.id !== postId) return p
    const comment: FeedComment = {
      id: 'c' + Date.now(),
      authorName: CURRENT_USER_NAME,
      avatarUrl: 'https://randomuser.me/api/portraits/men/68.jpg',
      body,
    }
    return { ...p, comments: [...p.comments, comment] }
  })
  savePosts(next)
  return next
}

/** 新增貼文 (插最前);回傳更新後全部貼文 */
export function addPost(bodyText: string, photoUrl: string, aboutText: string): FeedPost[] {
  const posts = loadPosts()
  const post: FeedPost = {
    id: 'p' + Date.now(),
    authorName: CURRENT_USER_NAME,
    authorAvatarUrl: 'https://randomuser.me/api/portraits/men/68.jpg',
    timeText: '剛剛',
    aboutText,
    photoUrl,
    bodyText,
    likers: [],
    comments: [],
  }
  const next = [post, ...posts]
  savePosts(next)
  return next
}

/** 目前登入者是否已讚某貼文 */
export function isLikedByMe(post: FeedPost): boolean {
  return post.likers.includes(CURRENT_USER_NAME)
}

/* ── 推薦卡 dismiss 狀態 (refresh 後仍記得) ── */

/** 是否已關閉某推薦卡 */
export function isRecoDismissed(recoId: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISMISSED_RECO)
    const list = raw ? (JSON.parse(raw) as string[]) : []
    return list.includes(recoId)
  } catch {
    return false
  }
}

/** 記錄關閉某推薦卡 */
export function dismissReco(recoId: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISMISSED_RECO)
    const list = raw ? (JSON.parse(raw) as string[]) : []
    if (!list.includes(recoId)) {
      list.push(recoId)
      localStorage.setItem(STORAGE_KEY_DISMISSED_RECO, JSON.stringify(list))
    }
  } catch {
    /* 靜默處理 */
  }
}
