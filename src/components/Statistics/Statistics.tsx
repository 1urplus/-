import { useState, useEffect } from 'react'
import { Card, Row, Col, Select, Typography, Spin, Empty, Statistic } from 'antd'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import dayjs from 'dayjs'
import { formatAmount } from '../../utils/format'

const { Title } = Typography
const COLORS = ['#FF6B81', '#FF9F43', '#FECA57', '#54A0FF', '#5F27CD', '#48DBFB', '#1DD1A1', '#FF6B6B', '#C8D6E5', '#A29BFE']
const GREEN_COLORS = ['#52c41a', '#73d13d', '#95de64', '#b7eb8f', '#d9f7be']

interface StatisticsProps { refreshKey: number }

export default function Statistics({ refreshKey }: StatisticsProps) {
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(dayjs().format('YYYY'))
  const [month, setMonth] = useState(dayjs().format('MM'))
  const [expenseStats, setExpenseStats] = useState<any[]>([])
  const [incomeStats, setIncomeStats] = useState<any[]>([])
  const [dailyExpense, setDailyExpense] = useState<any[]>([])
  const [dailyIncome, setDailyIncome] = useState<any[]>([])
  const [monthlySummary, setMonthlySummary] = useState<any[]>([])
  const [totals, setTotals] = useState({ income: 0, expense: 0 })

  useEffect(() => { loadData() }, [refreshKey, year, month])

  const loadData = async () => {
    setLoading(true)
    try {
      const startDate = `${year}-${month}-01`
      const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD')

      const [expCat, incCat, dayExp, dayInc, monSum] = await Promise.all([
        window.electronAPI.getCategoryStats(startDate, endDate, 'expense'),
        window.electronAPI.getCategoryStats(startDate, endDate, 'income'),
        window.electronAPI.getDailyStats(startDate, endDate, 'expense'),
        window.electronAPI.getDailyStats(startDate, endDate, 'income'),
        window.electronAPI.getMonthlySummary(year),
      ])

      const totalExp = expCat.reduce((s: number, c: any) => s + c.total, 0)
      const totalInc = incCat.reduce((s: number, c: any) => s + c.total, 0)
      setExpenseStats(expCat.filter((c: any) => c.total > 0))
      setIncomeStats(incCat.filter((c: any) => c.total > 0))
      setDailyExpense(dayExp)
      setDailyIncome(dayInc)
      setMonthlySummary(monSum)
      setTotals({ income: totalInc, expense: totalExp })
    } catch (err) { console.error('加载统计失败:', err) } finally { setLoading(false) }
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => ({ value: String(dayjs().year() - i), label: `${dayjs().year() - i} 年` }))
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1).padStart(2, '0'), label: `${i + 1} 月` }))

  if (loading && expenseStats.length === 0 && incomeStats.length === 0) {
    return <div style={{ textAlign: 'center', paddingTop: 100 }}><Spin size="large" /></div>
  }

  const hasData = expenseStats.length > 0 || incomeStats.length > 0

  if (!hasData) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Title level={4} style={{ margin: 0 }}>📈 统计分析</Title>
          <div style={{ display: 'flex', gap: 8 }}>
            <Select value={year} onChange={setYear} options={yearOptions} style={{ width: 100 }} />
            <Select value={month} onChange={setMonth} options={monthOptions} style={{ width: 90 }} />
          </div>
        </div>
        <Card><Empty description={`${year}年${parseInt(month)}月还没有记录`} /></Card>
      </div>
    )
  }

  // 合并每日数据用于柱状图
  const dailyMap: Record<string, any> = {}
  dailyExpense.forEach((d: any) => { dailyMap[d.date] = { ...dailyMap[d.date], date: d.date, expense: d.total } })
  dailyIncome.forEach((d: any) => { dailyMap[d.date] = { ...dailyMap[d.date], date: d.date, income: d.total } })
  const dailyData = Object.values(dailyMap).sort((a: any, b: any) => a.date.localeCompare(b.date))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>📈 统计分析</Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <Select value={year} onChange={setYear} options={yearOptions} style={{ width: 100 }} />
          <Select value={month} onChange={setMonth} options={monthOptions} style={{ width: 90 }} />
        </div>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}><Card><Statistic title="月度收入" value={totals.income} precision={2} prefix="¥" valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={8}><Card><Statistic title="月度支出" value={totals.expense} precision={2} prefix="¥" valueStyle={{ color: '#FF6B81' }} /></Card></Col>
        <Col span={8}><Card><Statistic title="月度结余" value={totals.income - totals.expense} precision={2} prefix="¥" valueStyle={{ color: totals.income - totals.expense >= 0 ? '#1677ff' : '#FF6B81' }} /></Card></Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="💸 支出分类占比">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={expenseStats} cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={2} dataKey="total" nameKey="category_name"
                  label={({ category_name, total }) => total > 0 ? `${category_name} ¥${total.toFixed(0)}` : ''}>
                  {expenseStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatAmount(v)} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="💰 收入来源占比">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={incomeStats} cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={2} dataKey="total" nameKey="category_name"
                  label={({ category_name, total }) => total > 0 ? `${category_name} ¥${total.toFixed(0)}` : ''}>
                  {incomeStats.map((_, i) => <Cell key={i} fill={GREEN_COLORS[i % GREEN_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatAmount(v)} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="📊 每日收支对比">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(d: string) => dayjs(d).format('MM-DD')} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `¥${v}`} />
                <Tooltip formatter={(v: number) => formatAmount(v)} labelFormatter={(l: string) => dayjs(l).format('MM月DD日')} />
                <Legend />
                <Bar dataKey="income" name="收入" fill="#52c41a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="支出" fill="#FF6B81" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {monthlySummary.length > 1 && (
        <Card title="📉 月度收支趋势" style={{ marginTop: 16 }}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlySummary}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tickFormatter={(m: string) => dayjs(m + '-01').format('M月')} />
              <YAxis tickFormatter={(v: number) => `¥${v}`} />
              <Tooltip formatter={(v: number) => formatAmount(v)} />
              <Legend />
              <Bar dataKey="income" name="收入" fill="#52c41a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="支出" fill="#FF6B81" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  )
}
