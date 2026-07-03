import { useState, useEffect, useCallback } from 'react'
import { Row, Col, Card, Statistic, Table, Typography, Button, Empty, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { formatAmount } from '../../utils/format'
import SmartInput from '../SmartInput/SmartInput'

const { Title, Text } = Typography

interface DashboardProps {
  refreshKey: number
  onAddExpense: () => void
}

export default function Dashboard({ refreshKey, onAddExpense }: DashboardProps) {
  const [transactions, setTransactions] = useState<any[]>([])
  const [stats, setStats] = useState({ todayExpense: 0, todayIncome: 0, monthExpense: 0, monthIncome: 0, monthCount: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [refreshKey])

  const loadData = async () => {
    setLoading(true)
    try {
      const today = dayjs().format('YYYY-MM-DD')
      const monthStart = dayjs().startOf('month').format('YYYY-MM-DD')
      const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD')

      const all = await window.electronAPI.getTransactions({ startDate: monthStart, endDate: monthEnd })

      const todayData = all.filter((e: any) => e.date === today)
      setTransactions(all.slice(0, 10))
      setStats({
        todayExpense: todayData.filter((e: any) => e.type === 'expense').reduce((s: number, e: any) => s + e.amount, 0),
        todayIncome: todayData.filter((e: any) => e.type === 'income').reduce((s: number, e: any) => s + e.amount, 0),
        monthExpense: all.filter((e: any) => e.type === 'expense').reduce((s: number, e: any) => s + e.amount, 0),
        monthIncome: all.filter((e: any) => e.type === 'income').reduce((s: number, e: any) => s + e.amount, 0),
        monthCount: all.length,
      })
    } catch (err) { console.error('加载数据失败:', err) } finally { setLoading(false) }
  }

  const columns = [
    { title: '日期', dataIndex: 'date', width: 100, render: (d: string) => dayjs(d).format('MM-DD ddd') },
    {
      title: '类型', dataIndex: 'type', width: 60,
      render: (t: string) => t === 'income' ? <Tag color="green">收入</Tag> : <Tag color="pink">支出</Tag>,
    },
    {
      title: '分类', key: 'cat',
      render: (_: any, r: any) => <span>{r.category_icon} {r.category_name}{r.subcategory_name ? ` › ${r.subcategory_name}` : ''}</span>,
    },
    {
      title: '金额', dataIndex: 'amount', align: 'right' as const, width: 110,
      render: (v: number, r: any) => (
        <Text strong style={{ color: r.type === 'income' ? '#52c41a' : '#FF6B81', fontFamily: '"SF Mono","Consolas",monospace' }}>
          {r.type === 'income' ? '+' : '-'}{formatAmount(v)}
        </Text>
      ),
    },
    { title: '备注', dataIndex: 'note', ellipsis: true },
  ]

  const balance = stats.monthIncome - stats.monthExpense

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>📊 首页概览</Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card hoverable loading={loading}>
            <Statistic title="本月收入" value={stats.monthIncome} precision={2} prefix="¥" valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable loading={loading}>
            <Statistic title="本月支出" value={stats.monthExpense} precision={2} prefix="¥" valueStyle={{ color: '#FF6B81' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable loading={loading}>
            <Statistic title="本月结余" value={balance} precision={2} prefix="¥"
              valueStyle={{ color: balance >= 0 ? '#1677ff' : '#FF6B81' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable loading={loading}>
            <Statistic title="今日支出" value={stats.todayExpense} precision={2} prefix="¥" valueStyle={{ color: '#FF6B81' }} />
          </Card>
        </Col>
      </Row>

      <SmartInput onSaved={loadData} />

      <Card title="📋 最近记录" extra={<Button type="primary" icon={<PlusOutlined />} onClick={onAddExpense}>记一笔</Button>}>
        {transactions.length > 0 ? (
          <Table dataSource={transactions} columns={columns} rowKey="id" size="small" pagination={false} loading={loading} />
        ) : (
          <Empty description="还没有记录，点击上方按钮开始吧！">
            <Button type="primary" icon={<PlusOutlined />} onClick={onAddExpense}>记第一笔</Button>
          </Empty>
        )}
      </Card>
    </div>
  )
}
