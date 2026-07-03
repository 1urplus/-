import { useState, useEffect } from 'react'
import { Card, Table, Button, Tag, Space, DatePicker, Select, Input, Popconfirm, Typography, Row, Col, Empty, message } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, SearchOutlined, ExportOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { formatAmount } from '../../utils/format'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

interface BillListProps {
  refreshKey: number
  onEditExpense: (expense: any) => void
}

export default function BillList({ refreshKey, onEditExpense }: BillListProps) {
  const [transactions, setTransactions] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<any>({})

  useEffect(() => { loadData() }, [refreshKey, filter])

  const loadData = async () => {
    setLoading(true)
    try {
      const [list, cats] = await Promise.all([
        window.electronAPI.getTransactions(filter),
        window.electronAPI.getCategories(),
      ])
      setTransactions(list)
      setCategories(cats.filter((c: any) => c.parent_id === null))
    } catch (err) { message.error('加载账单失败') } finally { setLoading(false) }
  }

  const handleDelete = async (id: number) => {
    await window.electronAPI.deleteTransaction(id)
    message.success('已删除')
    loadData()
  }

  const handleExportCSV = async () => {
    const result = await window.electronAPI.exportCSV(filter)
    if (result.success) message.success(`已导出到：${result.path}`)
  }

  const handleExportExcel = async () => {
    const result = await window.electronAPI.exportExcel(filter)
    if (result.success) message.success(`已导出到：${result.path}`)
  }

  const totalIncome = transactions.filter(e => e.type === 'income').reduce((s: number, e: any) => s + e.amount, 0)
  const totalExpense = transactions.filter(e => e.type === 'expense').reduce((s: number, e: any) => s + e.amount, 0)

  const columns = [
    { title: '日期', dataIndex: 'date', width: 110, sorter: (a: any, b: any) => a.date.localeCompare(b.date),
      render: (d: string) => dayjs(d).format('YYYY-MM-DD') },
    {
      title: '类型', dataIndex: 'type', width: 70,
      render: (t: string) => t === 'income' ? <Tag color="green">收入</Tag> : <Tag color="pink">支出</Tag>,
    },
    {
      title: '分类', key: 'cat', width: 180,
      render: (_: any, r: any) => (
        <Space size={4}>
          <span style={{ fontSize: 18 }}>{r.category_icon}</span><span>{r.category_name}</span>
          {r.subcategory_name && <><Text type="secondary">›</Text><Tag>{r.subcategory_name}</Tag></>}
        </Space>
      ),
    },
    {
      title: '金额', dataIndex: 'amount', width: 130, align: 'right' as const, sorter: (a: any, b: any) => a.amount - b.amount,
      render: (v: number, r: any) => (
        <Text strong style={{ color: r.type === 'income' ? '#52c41a' : '#FF6B81', fontSize: 16, fontFamily: '"SF Mono","Consolas",monospace' }}>
          {r.type === 'income' ? '+' : '-'}{formatAmount(v)}
        </Text>
      ),
    },
    { title: '备注', dataIndex: 'note', ellipsis: true, render: (v: string) => v || <Text type="secondary">-</Text> },
    {
      title: '操作', width: 120,
      render: (_: any, r: any) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onEditExpense(r)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)} okText="确定" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>📋 账单列表</Title>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={6}>
            <RangePicker style={{ width: '100%' }} placeholder={['开始日期', '结束日期']}
              onChange={(dates) => setFilter({ ...filter, startDate: dates?.[0]?.format('YYYY-MM-DD'), endDate: dates?.[1]?.format('YYYY-MM-DD') })}
              allowClear />
          </Col>
          <Col xs={24} sm={4}>
            <Select style={{ width: '100%' }} placeholder="类型" allowClear
              onChange={(type) => setFilter({ ...filter, type })}
              options={[{ value: 'expense', label: '💸 支出' }, { value: 'income', label: '💰 收入' }]} />
          </Col>
          <Col xs={24} sm={5}>
            <Select style={{ width: '100%' }} placeholder="按分类筛选" allowClear
              onChange={(categoryId) => setFilter({ ...filter, categoryId })}
              options={categories.map((c: any) => ({ value: c.id, label: `${c.icon} ${c.name}` }))} />
          </Col>
          <Col xs={24} sm={5}>
            <Input placeholder="搜索备注..." prefix={<SearchOutlined />} allowClear
              onChange={(e) => setFilter({ ...filter, keyword: e.target.value || undefined })} />
          </Col>
          <Col xs={24} sm={4}>
            <Space>
              <Button icon={<ExportOutlined />} size="small" onClick={handleExportCSV}>CSV</Button>
              <Button icon={<ExportOutlined />} size="small" onClick={handleExportExcel}>Excel</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card title={
        <Space>
          <span>共 {transactions.length} 条</span>
          <Text type="success">收入 {formatAmount(totalIncome)}</Text>
          <Text type="danger">支出 {formatAmount(totalExpense)}</Text>
          <Text strong>结余 {formatAmount(totalIncome - totalExpense)}</Text>
        </Space>
      }>
        {transactions.length > 0 ? (
          <Table dataSource={transactions} columns={columns} rowKey="id" loading={loading} size="middle"
            pagination={{ defaultPageSize: 8, showSizeChanger: true, showTotal: (t) => `共 ${t} 条`, pageSizeOptions: ['8', '20', '50', '100'] }} />
        ) : (<Empty description="没有符合条件的记录" />)}
      </Card>
    </div>
  )
}
