import { useState, useEffect, useCallback } from 'react'
import { message } from 'antd'
import AppLayout, { PageKey } from './components/Layout/AppLayout'
import Dashboard from './components/Dashboard/Dashboard'
import BillList from './components/BillList/BillList'
import Statistics from './components/Statistics/Statistics'
import AIAnalysis from './components/AIAnalysis/AIAnalysis'
import CategoryManager from './components/CategoryManager/CategoryManager'
import AddExpenseModal from './components/AddExpense/AddExpenseModal'
import SettingsPage from './components/Settings/SettingsPage'
import SnakeGame from './components/SnakeGame/SnakeGame'

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<any>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // 设置编辑支出
  const handleEditExpense = useCallback((expense: any) => {
    setEditingExpense(expense)
    setAddModalOpen(true)
  }, [])

  // 记一笔（新增）
  const handleAddExpense = useCallback(() => {
    setEditingExpense(null)
    setAddModalOpen(true)
  }, [])

  // 记账成功后刷新
  const handleExpenseSaved = useCallback(() => {
    setAddModalOpen(false)
    setEditingExpense(null)
    setRefreshKey(k => k + 1)
    message.success('保存成功！')
  }, [])

  // 监听自动分析完成
  useEffect(() => {
    if (window.electronAPI) {
      const unsubscribe = window.electronAPI.onAutoAnalyze(() => {
        message.info('🤖 每日自动分析已完成，点击「AI 分析」查看结果')
        setRefreshKey(k => k + 1)
      })
      return unsubscribe
    }
  }, [])

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard refreshKey={refreshKey} onAddExpense={handleAddExpense} />
      case 'billList':
        return <BillList refreshKey={refreshKey} onEditExpense={handleEditExpense} />
      case 'statistics':
        return <Statistics refreshKey={refreshKey} />
      case 'aiAnalysis':
        return <AIAnalysis refreshKey={refreshKey} />
      case 'categories':
        return <CategoryManager refreshKey={refreshKey} />
      case 'snakeGame':
        return <SnakeGame />
      case 'settings':
        return <SettingsPage />
      default:
        return <Dashboard refreshKey={refreshKey} onAddExpense={handleAddExpense} />
    }
  }

  return (
    <>
      <AppLayout
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onAddExpense={handleAddExpense}
      >
        {renderPage()}
      </AppLayout>

      <AddExpenseModal
        open={addModalOpen}
        expense={editingExpense}
        onCancel={() => {
          setAddModalOpen(false)
          setEditingExpense(null)
        }}
        onSaved={handleExpenseSaved}
      />
    </>
  )
}
