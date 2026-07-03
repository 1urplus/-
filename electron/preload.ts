import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 交易记录
  addTransaction: (data: { amount: number; type: string; categoryId: number; subcategoryId: number | null; date: string; note: string }) =>
    ipcRenderer.invoke('transaction:add', data),
  getTransactions: (filter?: any) =>
    ipcRenderer.invoke('transaction:getAll', filter),
  updateTransaction: (id: number, data: any) =>
    ipcRenderer.invoke('transaction:update', id, data),
  deleteTransaction: (id: number) =>
    ipcRenderer.invoke('transaction:delete', id),

  // 分类
  getCategories: (type?: string) =>
    ipcRenderer.invoke('category:getAll', type),
  getCategoryTree: (type?: string) =>
    ipcRenderer.invoke('category:getTree', type),
  addCategory: (data: { name: string; parentId: number | null; icon: string; type: string }) =>
    ipcRenderer.invoke('category:add', data),
  updateCategory: (id: number, data: { name?: string; icon?: string }) =>
    ipcRenderer.invoke('category:update', id, data),
  deleteCategory: (id: number) =>
    ipcRenderer.invoke('category:delete', id),

  // 统计
  getCategoryStats: (startDate: string, endDate: string, type?: string) =>
    ipcRenderer.invoke('stats:categoryStats', startDate, endDate, type),
  getDailyStats: (startDate: string, endDate: string, type?: string) =>
    ipcRenderer.invoke('stats:dailyStats', startDate, endDate, type),
  getMonthlySummary: (year: string) =>
    ipcRenderer.invoke('stats:monthlySummary', year),

  // AI
  analyze: (data: { type: string; mode: string; expenses: any[]; categories: any[] }) =>
    ipcRenderer.invoke('ai:analyze', data),
  parseText: (data: { text: string; categories: any[] }) =>
    ipcRenderer.invoke('ai:parseText', data),
  getAnalysisHistory: (limit?: number) =>
    ipcRenderer.invoke('ai:getHistory', limit),

  // 导出
  exportCSV: (filter?: any) =>
    ipcRenderer.invoke('export:csv', filter),
  exportExcel: (filter?: any) =>
    ipcRenderer.invoke('export:excel', filter),

  // 设置
  getSetting: (key: string) =>
    ipcRenderer.invoke('setting:get', key),
  setSetting: (key: string, value: string) =>
    ipcRenderer.invoke('setting:set', key, value),

  // 自动分析事件
  onAutoAnalyze: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('ai:autoAnalyze', listener)
    return () => ipcRenderer.removeListener('ai:autoAnalyze', listener)
  }
})
