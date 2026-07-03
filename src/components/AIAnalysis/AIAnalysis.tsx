import { useState, useEffect, ReactNode } from 'react'
import { Card, Button, Typography, Space, Spin, Tag, Timeline, Empty, message, Row, Col } from 'antd'
import { PieChartOutlined, DollarOutlined, HistoryOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { getCurrentMonthRange } from '../../utils/format'

const { Title, Text, Paragraph } = Typography

interface AIAnalysisProps { refreshKey: number }

export default function AIAnalysis({ refreshKey }: AIAnalysisProps) {
  const [analyzing, setAnalyzing] = useState<'expense' | 'saving' | null>(null)
  const [expenseResult, setExpenseResult] = useState<string | null>(null)
  const [savingResult, setSavingResult] = useState<string | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadHistory() }, [refreshKey])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const h = await window.electronAPI.getAnalysisHistory(10)
      setHistory(h)
    } catch (err) { console.error('加载分析历史失败:', err) } finally { setLoading(false) }
  }

  const doAnalyze = async (type: 'expense' | 'saving') => {
    setAnalyzing(type)
    if (type === 'expense') setExpenseResult(null)
    else setSavingResult(null)

    try {
      const { startDate, endDate } = getCurrentMonthRange()
      const [transactions, categories] = await Promise.all([
        window.electronAPI.getTransactions({ startDate, endDate }),
        window.electronAPI.getCategories(),
      ])

      if (transactions.length === 0) {
        const msg = '📭 本月还没有任何记录呢~ 先去记几笔账再来分析吧！'
        if (type === 'expense') setExpenseResult(msg)
        else setSavingResult(msg)
        return
      }

      const result = await window.electronAPI.analyze({ type, mode: 'manual', expenses: transactions, categories })
      if (type === 'expense') setExpenseResult(result)
      else setSavingResult(result)
      message.success(type === 'expense' ? '支出分析完成！' : '省钱建议已生成！')
      loadHistory()
    } catch (err: any) {
      message.error('分析失败：' + (err.message || '未知错误'))
    } finally { setAnalyzing(null) }
  }

  // 将【数字】标记渲染为加粗放大的样式，并清理其他 markdown 符号
  const renderText = (text: string): ReactNode => {
    const cleaned = text
      .replace(/^#{1,4}\s+/gm, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/^-\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')

    // 解析【...】为加粗大号数字
    const parts = cleaned.split(/(【[^】]+】)/g)
    return parts.map((part, i) => {
      if (part.startsWith('【') && part.endsWith('】')) {
        return (
          <Text
            key={i}
            strong
            style={{ fontSize: 20, color: '#FF6B81', margin: '0 2px' }}
          >
            {part.slice(1, -1)}
          </Text>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  // 清理纯文本（给 Timeline 用）
  const cleanPlainText = (text: string) =>
    text.replace(/【/g, '').replace(/】/g, '')
      .replace(/^#{1,4}\s+/gm, '').replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/^-\s+/gm, '').replace(/^\d+\.\s+/gm, '').trim()

  const ResultCard = ({ title, icon, result, type, color }: {
    title: string; icon: React.ReactNode; result: string | null; type: 'expense' | 'saving'; color: string
  }) => (
    <Card
      title={<Space>{icon}<span>{title}</span></Space>}
      extra={<Button icon={<ReloadOutlined />} size="small" onClick={() => doAnalyze(type)} loading={analyzing === type}>重新生成</Button>}
      style={{ height: '100%' }}
    >
      {analyzing === type ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /><div style={{ marginTop: 12 }}><Text type="secondary">AI 分析中...</Text></div></div>
      ) : result ? (
        <div style={{
          fontSize: 17, lineHeight: 2.2, padding: '24px 28px',
          background: `linear-gradient(135deg, ${color}08 0%, ${color}15 100%)`,
          borderRadius: 12, color: '#444', letterSpacing: '0.02em', minHeight: 120,
        }}>
          {renderText(result)}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 40 }}><Text type="secondary">点击下方按钮生成</Text></div>
      )}
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Button type="primary" icon={icon} onClick={() => doAnalyze(type)} loading={analyzing === type}
          style={{ background: color, border: 'none' }}>
          {title}
        </Button>
      </div>
    </Card>
  )

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>🤖 AI 智能分析</Title>

      <Row gutter={16}>
        <Col span={12}>
          <ResultCard title="支出分析" icon={<PieChartOutlined />} result={expenseResult} type="expense" color="#FF6B81" />
        </Col>
        <Col span={12}>
          <ResultCard title="省钱建议" icon={<DollarOutlined />} result={savingResult} type="saving" color="#52c41a" />
        </Col>
      </Row>

      {history.length > 0 && (
        <Card title={<><HistoryOutlined /> 分析历史</>} style={{ marginTop: 16 }}>
          <Timeline items={history.map((h: any) => {
            const isExpense = h.mode?.startsWith('expense_')
            return {
              color: isExpense ? 'pink' : 'green',
              children: (
                <div>
                  <Space>
                    <Tag color={isExpense ? 'pink' : 'green'}>{isExpense ? '📊 支出分析' : '💡 省钱建议'}</Tag>
                    <Text type="secondary">{dayjs(h.created_at).format('MM-DD HH:mm')}</Text>
                  </Space>
                  <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}
                    style={{ marginTop: 4, fontSize: 13, color: '#666' }}>
                    {cleanPlainText(h.result).slice(0, 150)}...
                  </Paragraph>
                </div>
              ),
            }
          })} />
        </Card>
      )}
    </div>
  )
}
