import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import {
  addTransaction, getTransactions, updateTransaction, deleteTransaction,
  getCategories, getCategoryTree, addCategory, updateCategory, deleteCategory,
  getCategoryStats, getDailyStats, getMonthlySummary,
  getSetting, setSetting, saveAnalysisHistory, getAnalysisHistory,
  getTransactionsForExport
} from './database'
import * as XLSX from 'xlsx'
import * as fs from 'fs'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '甜甜记账',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // 开发模式加载 vite dev server，生产模式加载打包文件
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  registerIpcHandlers()
  startAutoAnalyzeTimer()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ====== 注册 IPC 处理器 ======
function registerIpcHandlers() {
  // ---- 交易记录 ----
  ipcMain.handle('transaction:add', (_e, data) => {
    return addTransaction(data.amount, data.type, data.categoryId, data.subcategoryId, data.date, data.note)
  })

  ipcMain.handle('transaction:getAll', (_e, filter) => {
    return getTransactions(filter)
  })

  ipcMain.handle('transaction:update', (_e, id, data) => {
    return updateTransaction(id, data)
  })

  ipcMain.handle('transaction:delete', (_e, id) => {
    return deleteTransaction(id)
  })

  // ---- 分类 ----
  ipcMain.handle('category:getAll', (_e, type) => getCategories(type))
  ipcMain.handle('category:getTree', (_e, type) => getCategoryTree(type))
  ipcMain.handle('category:add', (_e, data) => {
    return addCategory(data.name, data.parentId, data.icon, data.type)
  })
  ipcMain.handle('category:update', (_e, id, data) => {
    return updateCategory(id, data)
  })
  ipcMain.handle('category:delete', (_e, id) => {
    return deleteCategory(id)
  })

  // ---- 统计 ----
  ipcMain.handle('stats:categoryStats', (_e, startDate, endDate, type) => {
    return getCategoryStats(startDate, endDate, type)
  })
  ipcMain.handle('stats:dailyStats', (_e, startDate, endDate, type) => {
    return getDailyStats(startDate, endDate, type)
  })
  ipcMain.handle('stats:monthlySummary', (_e, year) => {
    return getMonthlySummary(year)
  })

  // ---- AI 分析 ----
  ipcMain.handle('ai:analyze', async (_e, data) => {
    const result = await performAIAnalysis(data.type, data.mode, data.expenses, data.categories)
    saveAnalysisHistory(data.type + '_' + data.mode, result)
    return result
  })

  ipcMain.handle('ai:getHistory', (_e, limit) => {
    return getAnalysisHistory(limit ?? 10)
  })

  // ---- 导出 ----
  ipcMain.handle('export:csv', async (_e, filter) => {
    const data = getTransactionsForExport(filter?.startDate, filter?.endDate, filter?.type) as any[]
    const csvRows = ['类型,金额,日期,一级分类,二级分类,备注']
    data.forEach(row => {
      const typeLabel = row.type === 'income' ? '收入' : '支出'
      csvRows.push(`${typeLabel},${row.amount},${row.date},${row.category_name},${row.subcategory_name || ''},${row.note || ''}`)
    })
    const csvContent = '﻿' + csvRows.join('\n') // BOM for Excel UTF-8

    const { filePath } = await dialog.showSaveDialog(mainWindow!, {
      title: '导出 CSV',
      defaultPath: `甜甜记账_导出_${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV 文件', extensions: ['csv'] }]
    })
    if (filePath) {
      fs.writeFileSync(filePath, csvContent, 'utf-8')
      return { success: true, path: filePath }
    }
    return { success: false }
  })

  ipcMain.handle('export:excel', async (_e, filter) => {
    const data = getTransactionsForExport(filter?.startDate, filter?.endDate, filter?.type) as any[]
    const wsData = [['类型', '金额', '日期', '一级分类', '二级分类', '备注']]
    data.forEach(row => {
      const typeLabel = row.type === 'income' ? '收入' : '支出'
      wsData.push([typeLabel, row.amount, row.date, row.category_name, row.subcategory_name || '', row.note || ''])
    })
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '支出记录')
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer

    const { filePath } = await dialog.showSaveDialog(mainWindow!, {
      title: '导出 Excel',
      defaultPath: `甜甜记账_导出_${new Date().toISOString().slice(0, 10)}.xlsx`,
      filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }]
    })
    if (filePath) {
      fs.writeFileSync(filePath, buffer)
      return { success: true, path: filePath }
    }
    return { success: false }
  })

  // ---- 设置 ----
  ipcMain.handle('setting:get', (_e, key) => getSetting(key))
}

// ====== AI 分析（调用 DeepSeek API） ======
async function performAIAnalysis(analysisType: string, mode: string, transactions: any[], categories: any[]): Promise<string> {
  const apiKey = getSetting('deepseek_api_key')

  if (!apiKey) {
    return '⚠️ 尚未配置 AI 分析密钥。\n\n请在设置页面中填入 DeepSeek API Key（可在 https://platform.deepseek.com 获取）。'
  }

  const expenses = transactions.filter((t: any) => t.type === 'expense')
  const incomes = transactions.filter((t: any) => t.type === 'income')
  const totalExpense = expenses.reduce((s: number, e: any) => s + e.amount, 0)
  const totalIncome = incomes.reduce((s: number, e: any) => s + e.amount, 0)

  const expenseSummary = categories
    .filter((c: any) => c.parent_id === null && c.type === 'expense')
    .map((c: any) => {
      const childTotal = expenses.filter((e: any) => e.category_id === c.id).reduce((s: number, e: any) => s + e.amount, 0)
      return childTotal > 0 ? `${c.icon}${c.name}【${childTotal.toFixed(0)}元】` : null
    }).filter(Boolean).join(' ')

  const incomeSummary = categories
    .filter((c: any) => c.parent_id === null && c.type === 'income')
    .map((c: any) => {
      const childTotal = incomes.filter((e: any) => e.category_id === c.id).reduce((s: number, e: any) => s + e.amount, 0)
      return childTotal > 0 ? `${c.icon}${c.name}【${childTotal.toFixed(0)}元】` : null
    }).filter(Boolean).join(' ')

  let prompt: string
  if (analysisType === 'expense') {
    prompt = `你是"甜甜"记账小助手。请用一段温暖的话（100字内）分析用户财务：

总收入【${totalIncome.toFixed(0)}元】 总支出【${totalExpense.toFixed(0)}元】 结余【${(totalIncome - totalExpense).toFixed(0)}元】
${incomeSummary ? '收入来源：' + incomeSummary : ''}
支出去向：${expenseSummary}

像朋友聊天，一段话概括收支状况、消费是否健康。重要数字用【数字】括起来。不要markdown格式，不要分点。`
  } else {
    prompt = `你是"甜甜"省钱小助手。根据以下数据给省钱建议：

月收入【${totalIncome.toFixed(0)}元】 月支出【${totalExpense.toFixed(0)}元】
${expenseSummary}

像朋友聊天，给2-3条超实用的省钱小技巧，一段话说完。重要数字用【数字】括起来。语气温暖接地气，120字内，不要分点不用markdown。`
  }

  try {
    // 使用 fetch 调用 DeepSeek API（OpenAI 兼容格式）
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errData = await response.text()
      if (response.status === 401) {
        return '❌ API Key 无效，请在设置中检查并更新你的 DeepSeek API Key。'
      }
      return `❌ AI 分析失败 (HTTP ${response.status})：${errData.slice(0, 200)}`
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || 'AI 分析完成，但未获取到有效回复。'
  } catch (err: any) {
    if (err.message?.includes('fetch')) {
      return '❌ 网络连接失败，请检查网络后重试。如果你在中国大陆，可能需要配置网络代理。'
    }
    return `❌ AI 分析出错：${err.message}`
  }
}

// ====== 自动分析定时器 ======
let autoAnalyzeTimer: NodeJS.Timeout | null = null

function startAutoAnalyzeTimer() {
  const mode = getSetting('analysis_mode') || 'manual'
  if (mode !== 'auto') return

  // 每天检查一次（每小时检查一次是否到了设定时间）
  const checkInterval = 60 * 60 * 1000 // 1 小时
  const targetHour = parseInt(getSetting('analysis_auto_hour') || '9')

  function checkAndRun() {
    const now = new Date()
    if (now.getHours() === targetHour && now.getMinutes() < 5) {
      // 触发自动分析
      const transactions = getTransactions({}) as any[]
      const categories = getCategories() as any[]
      if (transactions.length > 0) {
        performAIAnalysis('expense', 'auto', transactions, categories).then(result => {
          saveAnalysisHistory('auto', result)
          mainWindow?.webContents.send('ai:autoAnalyze')
        })
      }
    }
  }

  autoAnalyzeTimer = setInterval(checkAndRun, checkInterval)
}

// 当设置变更时重启定时器
ipcMain.handle('setting:set', (_e, key, value) => {
  setSetting(key, value)
  if (key === 'analysis_mode' || key === 'analysis_auto_hour') {
    if (autoAnalyzeTimer) {
      clearInterval(autoAnalyzeTimer)
      autoAnalyzeTimer = null
    }
    startAutoAnalyzeTimer()
  }
})
