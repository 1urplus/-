import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

const DB_PATH = path.join(app.getPath('userData'), 'tiantian.db')

let db: Database.Database

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initTables()
    migrateTables()
    seedCategories()
  }
  return db
}

// ====== 建表 ======
function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      icon TEXT DEFAULT '📌',
      type TEXT DEFAULT 'expense',
      is_builtin INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL CHECK(amount > 0),
      type TEXT NOT NULL DEFAULT 'expense',
      category_id INTEGER NOT NULL,
      subcategory_id INTEGER,
      date TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (subcategory_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analysis_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode TEXT NOT NULL,
      result TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
  `)
}

// ====== 迁移旧表（兼容已存在的数据库） ======
function migrateTables() {
  try { db.exec(`ALTER TABLE categories ADD COLUMN type TEXT DEFAULT 'expense'`) } catch (_) {}
  try { db.exec(`ALTER TABLE expenses ADD COLUMN type TEXT NOT NULL DEFAULT 'expense'`) } catch (_) {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(type)`) } catch (_) {}
}

// ====== 内置分类数据 ======
const BUILTIN_EXPENSE_CATEGORIES = [
  { name: '餐饮食品', icon: '🍜', children: ['三餐', '零食水果', '外卖', '饮品甜品', '聚餐请客'] },
  { name: '交通出行', icon: '🚗', children: ['公交地铁', '打车', '加油充电', '停车费', '火车机票'] },
  { name: '购物消费', icon: '🛒', children: ['服饰鞋包', '数码产品', '日用品', '美妆护肤', '家居装饰'] },
  { name: '住房生活', icon: '🏠', children: ['房租', '水电燃气', '物业费', '维修保养', '居家日用'] },
  { name: '医疗健康', icon: '💊', children: ['门诊药费', '体检检查', '健身运动', '保健品', '医疗器械'] },
  { name: '教育学习', icon: '📚', children: ['书籍资料', '培训课程', '考试报名', '文具耗材'] },
  { name: '娱乐休闲', icon: '🎮', children: ['电影演出', '游戏充值', '旅游度假', '运动健身', '宠物开销'] },
  { name: '人情往来', icon: '🎁', children: ['红包礼金', '节日礼物', '孝敬父母', '婚丧嫁娶', '慈善捐助'] },
  { name: '金融保险', icon: '💰', children: ['贷款还款', '保险缴费', '利息手续费', '理财亏损'] },
  { name: '其他支出', icon: '📦', children: ['快递运费', '罚款缴费', '遗失损失', '其他杂项'] },
]

const BUILTIN_INCOME_CATEGORIES = [
  { name: '工资收入', icon: '💼', children: [
    { name: '月薪', icon: '💵' }, { name: '年终奖', icon: '🎊' }, { name: '绩效奖金', icon: '🏆' }, { name: '补贴津贴', icon: '📋' }
  ]},
  { name: '兼职副业', icon: '💻', children: [
    { name: '自由职业', icon: '✍️' }, { name: '咨询费', icon: '🗣️' }, { name: '稿费版税', icon: '📝' }, { name: '零工收入', icon: '🔧' }
  ]},
  { name: '投资理财', icon: '📈', children: [
    { name: '股票基金', icon: '📊' }, { name: '利息收入', icon: '🏦' }, { name: '房租收入', icon: '🏘️' }, { name: '分红', icon: '💎' }
  ]},
  { name: '红包转账', icon: '🧧', children: [
    { name: '节日红包', icon: '🎉' }, { name: '生日红包', icon: '🎂' }, { name: '转账收入', icon: '💳' }, { name: '礼金', icon: '🎁' }
  ]},
  { name: '其他收入', icon: '📥', children: [
    { name: '退款返利', icon: '↩️' }, { name: '报销', icon: '🧾' }, { name: '二手卖出', icon: '♻️' }, { name: '其他', icon: '📌' }
  ]},
]

function seedCategories() {
  try {
    const expenseCount = db.prepare(
      "SELECT COUNT(*) as count FROM categories WHERE type='expense' AND parent_id IS NULL"
    ).get() as { count: number }

    if (expenseCount.count === 0) {
      console.log('[DB] 初始化支出分类...')
      insertCategories(BUILTIN_EXPENSE_CATEGORIES, 'expense', 0)
    }

    const incomeCount = db.prepare(
      "SELECT COUNT(*) as count FROM categories WHERE type='income' AND parent_id IS NULL"
    ).get() as { count: number }

    if (incomeCount.count === 0) {
      console.log('[DB] 初始化收入分类...')
      insertCategories(BUILTIN_INCOME_CATEGORIES, 'income', 1000)
    }

    const total = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }
    console.log(`[DB] 分类就绪，共 ${total.count} 条`)
  } catch (err) {
    console.error('[DB] 分类初始化失败:', err)
  }
}

function insertCategories(cats: { name: string; icon: string; children: (string | { name: string; icon: string })[] }[], type: string, baseSort: number) {
  const insertCat = db.prepare(
    'INSERT INTO categories (name, icon, parent_id, type, is_builtin, sort_order) VALUES (?, ?, ?, ?, 1, ?)'
  )
  const transaction = db.transaction(() => {
    cats.forEach((cat, i) => {
      const result = insertCat.run(cat.name, cat.icon, null, type, baseSort + i)
      const parentId = result.lastInsertRowid as number
      cat.children.forEach((child, j) => {
        const cName = typeof child === 'string' ? child : child.name
        const cIcon = typeof child === 'string' ? '📌' : (child.icon || '📌')
        insertCat.run(cName, cIcon, parentId, type, (baseSort + i) * 100 + j)
      })
    })
  })
  transaction()
}

// ====== 数据库操作：交易记录 ======
export function addTransaction(amount: number, type: string, categoryId: number, subcategoryId: number | null, date: string, note: string) {
  const db = getDatabase()
  return db.prepare(
    'INSERT INTO expenses (amount, type, category_id, subcategory_id, date, note) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(amount, type, categoryId, subcategoryId, date, note)
}

export function getTransactions(filter?: {
  startDate?: string; endDate?: string; categoryId?: number; keyword?: string; type?: string
}) {
  const db = getDatabase()
  let sql = `
    SELECT e.*,
           c.name as category_name, c.icon as category_icon,
           sc.name as subcategory_name
    FROM expenses e
    LEFT JOIN categories c ON e.category_id = c.id
    LEFT JOIN categories sc ON e.subcategory_id = sc.id
    WHERE 1=1
  `
  const params: any[] = []

  if (filter?.startDate) { sql += ' AND e.date >= ?'; params.push(filter.startDate) }
  if (filter?.endDate) { sql += ' AND e.date <= ?'; params.push(filter.endDate) }
  if (filter?.categoryId) { sql += ' AND (e.category_id = ? OR e.subcategory_id = ?)'; params.push(filter.categoryId, filter.categoryId) }
  if (filter?.keyword) { sql += ' AND e.note LIKE ?'; params.push(`%${filter.keyword}%`) }
  if (filter?.type) { sql += ' AND e.type = ?'; params.push(filter.type) }

  sql += ' ORDER BY e.date DESC, e.created_at DESC'
  return db.prepare(sql).all(...params)
}

export function updateTransaction(id: number, data: {
  amount?: number; type?: string; categoryId?: number; subcategoryId?: number | null; date?: string; note?: string
}) {
  const db = getDatabase()
  const sets: string[] = []
  const params: any[] = []

  if (data.amount !== undefined) { sets.push('amount = ?'); params.push(data.amount) }
  if (data.type !== undefined) { sets.push('type = ?'); params.push(data.type) }
  if (data.categoryId !== undefined) { sets.push('category_id = ?'); params.push(data.categoryId) }
  if (data.subcategoryId !== undefined) { sets.push('subcategory_id = ?'); params.push(data.subcategoryId) }
  if (data.date !== undefined) { sets.push('date = ?'); params.push(data.date) }
  if (data.note !== undefined) { sets.push('note = ?'); params.push(data.note) }

  if (sets.length === 0) return
  sets.push("updated_at = datetime('now', 'localtime')")
  params.push(id)
  return db.prepare(`UPDATE expenses SET ${sets.join(', ')} WHERE id = ?`).run(...params)
}

export function deleteTransaction(id: number) {
  const db = getDatabase()
  return db.prepare('DELETE FROM expenses WHERE id = ?').run(id)
}

// ====== 数据库操作：分类 ======
export function getCategories(type?: string) {
  const db = getDatabase()
  if (type) {
    return db.prepare('SELECT * FROM categories WHERE type = ? ORDER BY sort_order').all(type)
  }
  return db.prepare('SELECT * FROM categories ORDER BY sort_order').all()
}

export function getCategoryTree(type?: string) {
  const db = getDatabase()
  let parentQuery = 'SELECT * FROM categories WHERE parent_id IS NULL'
  let childQuery = 'SELECT * FROM categories WHERE parent_id IS NOT NULL'
  const params: any[] = []
  if (type) {
    parentQuery += ' AND type = ?'
    childQuery += ' AND type = ?'
    params.push(type)
  }
  parentQuery += ' ORDER BY sort_order'
  childQuery += ' ORDER BY sort_order'

  const parents = db.prepare(parentQuery).all(...params) as any[]
  const children = db.prepare(childQuery).all(...params) as any[]
  return parents.map(p => ({
    ...p,
    children: children.filter(c => c.parent_id === p.id)
  }))
}

export function addCategory(name: string, parentId: number | null, icon: string, catType: string) {
  const db = getDatabase()
  const maxSort = db.prepare(
    'SELECT MAX(sort_order) as max FROM categories WHERE parent_id IS ?'
  ).get(parentId) as { max: number | null }
  const sortOrder = (maxSort?.max ?? -1) + 1
  return db.prepare(
    'INSERT INTO categories (name, parent_id, icon, type, is_builtin, sort_order) VALUES (?, ?, ?, ?, 0, ?)'
  ).run(name, parentId, icon, catType, sortOrder)
}

export function updateCategory(id: number, data: { name?: string; icon?: string }) {
  const db = getDatabase()
  const sets: string[] = []
  const params: any[] = []
  if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name) }
  if (data.icon !== undefined) { sets.push('icon = ?'); params.push(data.icon) }
  if (sets.length === 0) return
  params.push(id)
  return db.prepare(`UPDATE categories SET ${sets.join(', ')} WHERE id = ? AND is_builtin = 0`).run(...params)
}

export function deleteCategory(id: number) {
  const db = getDatabase()
  return db.prepare('DELETE FROM categories WHERE id = ? AND is_builtin = 0').run(id)
}

// ====== 数据库操作：统计 ======
export function getCategoryStats(startDate: string, endDate: string, type?: string) {
  const db = getDatabase()
  let typeFilter = ''
  const params: any[] = [startDate, endDate]
  if (type) {
    typeFilter = ' AND c.type = ?'
    params.push(type)
  }
  return db.prepare(`
    SELECT c.id as category_id, c.name as category_name, c.icon as category_icon,
           COALESCE(SUM(e.amount), 0) as total, COUNT(e.id) as count
    FROM categories c
    LEFT JOIN expenses e ON e.category_id = c.id AND e.date >= ? AND e.date <= ?
    WHERE c.parent_id IS NULL${typeFilter}
    GROUP BY c.id
    ORDER BY total DESC
  `).all(...params)
}

export function getDailyStats(startDate: string, endDate: string, type?: string) {
  const db = getDatabase()
  let sql = `SELECT date, SUM(amount) as total, COUNT(*) as count FROM expenses WHERE date >= ? AND date <= ?`
  const params: any[] = [startDate, endDate]
  if (type) { sql += ' AND type = ?'; params.push(type) }
  sql += ' GROUP BY date ORDER BY date'
  return db.prepare(sql).all(...params)
}

export function getMonthlySummary(year: string) {
  const db = getDatabase()
  return db.prepare(`
    SELECT substr(date, 1, 7) as month,
           SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
           SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense,
           COUNT(*) as count
    FROM expenses
    WHERE date LIKE ?
    GROUP BY month ORDER BY month
  `).all(`${year}%`)
}

// ====== 数据库操作：设置 ======
export function getSetting(key: string): string | null {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string) {
  const db = getDatabase()
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?').run(key, value, value)
}

// ====== 数据库操作：分析历史 ======
export function saveAnalysisHistory(mode: string, result: string) {
  const db = getDatabase()
  return db.prepare('INSERT INTO analysis_history (mode, result) VALUES (?, ?)').run(mode, result)
}

export function getAnalysisHistory(limit = 10) {
  const db = getDatabase()
  return db.prepare('SELECT * FROM analysis_history ORDER BY created_at DESC LIMIT ?').all(limit)
}

// ====== 导出 ======
export function getTransactionsForExport(startDate?: string, endDate?: string, type?: string) {
  const db = getDatabase()
  let sql = `
    SELECT e.amount, e.type, e.date, e.note,
           c.name as category_name, sc.name as subcategory_name
    FROM expenses e
    LEFT JOIN categories c ON e.category_id = c.id
    LEFT JOIN categories sc ON e.subcategory_id = sc.id
    WHERE 1=1
  `
  const params: any[] = []
  if (startDate) { sql += ' AND e.date >= ?'; params.push(startDate) }
  if (endDate) { sql += ' AND e.date <= ?'; params.push(endDate) }
  if (type) { sql += ' AND e.type = ?'; params.push(type) }
  sql += ' ORDER BY e.date DESC'
  return db.prepare(sql).all(...params)
}
