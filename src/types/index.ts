// ====== 分类 ======
export interface Category {
  id: number
  name: string
  parent_id: number | null
  icon: string
  type: 'expense' | 'income'
  is_builtin: number
  sort_order: number
  created_at: string
}

// ====== 交易记录 ======
export interface Transaction {
  id: number
  amount: number
  type: 'expense' | 'income'
  category_id: number
  subcategory_id: number | null
  date: string
  note: string
  created_at: string
  updated_at: string
  category_name: string
  category_icon: string
  subcategory_name: string | null
}

// ====== 筛选条件 ======
export interface TransactionFilter {
  startDate?: string
  endDate?: string
  categoryId?: number
  keyword?: string
  type?: 'expense' | 'income'
}

// ====== 统计 ======
export interface CategoryStat {
  category_id: number
  category_name: string
  category_icon: string
  total: number
  count: number
}

export interface MonthlySummary {
  month: string
  income: number
  expense: number
  count: number
}

export interface DailyStat {
  date: string
  total: number
  count: number
}

// ====== IPC 通道 ======
export const IPC_CHANNELS = {
  TRANSACTION_ADD: 'transaction:add',
  TRANSACTION_GET_ALL: 'transaction:getAll',
  TRANSACTION_UPDATE: 'transaction:update',
  TRANSACTION_DELETE: 'transaction:delete',
  CATEGORY_GET_ALL: 'category:getAll',
  CATEGORY_GET_TREE: 'category:getTree',
  CATEGORY_ADD: 'category:add',
  CATEGORY_UPDATE: 'category:update',
  CATEGORY_DELETE: 'category:delete',
  STATS_CATEGORY: 'stats:categoryStats',
  STATS_DAILY: 'stats:dailyStats',
  STATS_MONTHLY: 'stats:monthlySummary',
  AI_ANALYZE: 'ai:analyze',
  AI_HISTORY: 'ai:getHistory',
  EXPORT_CSV: 'export:csv',
  EXPORT_EXCEL: 'export:excel',
  SETTING_GET: 'setting:get',
  SETTING_SET: 'setting:set',
} as const
