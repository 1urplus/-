/// <reference types="vite/client" />

interface ElectronAPI {
  addTransaction: (data: { amount: number; type: string; categoryId: number; subcategoryId: number | null; date: string; note: string }) => Promise<any>
  getTransactions: (filter?: any) => Promise<any[]>
  updateTransaction: (id: number, data: any) => Promise<any>
  deleteTransaction: (id: number) => Promise<any>
  getCategories: (type?: string) => Promise<any[]>
  getCategoryTree: (type?: string) => Promise<any[]>
  addCategory: (data: { name: string; parentId: number | null; icon: string; type: string }) => Promise<any>
  updateCategory: (id: number, data: { name?: string; icon?: string }) => Promise<any>
  deleteCategory: (id: number) => Promise<any>
  getCategoryStats: (startDate: string, endDate: string, type?: string) => Promise<any[]>
  getDailyStats: (startDate: string, endDate: string, type?: string) => Promise<any[]>
  getMonthlySummary: (year: string) => Promise<any[]>
  analyze: (data: { type: string; mode: string; expenses: any[]; categories: any[] }) => Promise<string>
  getAnalysisHistory: (limit?: number) => Promise<any[]>
  exportCSV: (filter?: any) => Promise<{ success: boolean; path?: string }>
  exportExcel: (filter?: any) => Promise<{ success: boolean; path?: string }>
  getSetting: (key: string) => Promise<string | null>
  setSetting: (key: string, value: string) => Promise<void>
  onAutoAnalyze: (callback: () => void) => () => void
}

interface Window {
  electronAPI: ElectronAPI
}
