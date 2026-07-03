import { useState } from 'react'
import { Card, Input, Button, Modal, Descriptions, Tag, Spin, message, Space, Typography, List } from 'antd'
import { ThunderboltOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Text } = Typography

interface SmartInputProps {
  onSaved: () => void
}

export default function SmartInput({ onSaved }: SmartInputProps) {
  const [text, setText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleParse = async () => {
    const trimmed = text.trim()
    if (!trimmed) {
      message.warning('请输入内容')
      return
    }

    setParsing(true)
    setError(null)
    try {
      const categories = await window.electronAPI.getCategories()
      const response = await window.electronAPI.parseText({ text: trimmed, categories })

      if (response.error) {
        setError(response.error)
        return
      }

      // 用分类信息补全每条结果
      const items = (response.data as any[]).map((item: any) => {
        const cat = categories.find((c: any) => c.id === item.category_id)
        const sub = item.subcategory_id ? categories.find((c: any) => c.id === item.subcategory_id) : null
        return {
          ...item,
          category_name: cat?.name || '未知',
          category_icon: cat?.icon || '📌',
          subcategory_name: sub?.name || null,
        }
      })

      setResults(items)
      setConfirmOpen(true)
    } catch (err: any) {
      setError('解析失败：' + (err.message || '网络错误'))
    } finally {
      setParsing(false)
    }
  }

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      for (const item of results) {
        await window.electronAPI.addTransaction({
          amount: item.amount,
          type: item.type,
          categoryId: item.category_id,
          subcategoryId: item.subcategory_id || null,
          date: item.date,
          note: item.note || '',
        })
      }
      message.success(`已保存 ${results.length} 条记录！`)
      setText('')
      setConfirmOpen(false)
      onSaved()
    } catch (err: any) {
      message.error('保存失败：' + (err.message || ''))
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleParse()
    }
  }

  const totalAmount = results.reduce((s, r) => s + (r.amount || 0), 0)

  return (
    <>
      <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <TextArea
            value={text}
            onChange={e => { setText(e.target.value); setError(null) }}
            onKeyDown={handleKeyDown}
            placeholder={'直接输入，可以一次说多条：\n"午饭35元，打车20，买书花了50"\n"收到工资8000，兼职收入500"\n"聚餐请客花了200块，看电影80"'}
            rows={3}
            style={{ flex: 1, fontSize: 15 }}
            disabled={parsing}
          />
          <Button
            type="primary"
            icon={parsing ? <Spin size="small" /> : <ThunderboltOutlined />}
            onClick={handleParse}
            loading={parsing}
            size="large"
            style={{
              height: 76, minWidth: 100,
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              border: 'none', fontSize: 16,
            }}
          >
            智能识别
          </Button>
        </div>
        {error && (
          <div style={{ marginTop: 8, color: '#ff4d4f', fontSize: 13 }}>⚠️ {error}</div>
        )}
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            💡 一条消息可以包含多条记录，AI 会自动拆分。按 Enter 快速识别
          </Text>
        </div>
      </Card>

      {/* 确认弹窗 */}
      <Modal
        title={`🤖 AI 识别出 ${results.length} 条记录`}
        open={confirmOpen}
        onOk={handleSaveAll}
        onCancel={() => setConfirmOpen(false)}
        confirmLoading={saving}
        okText={`全部保存（共 ¥${totalAmount.toFixed(2)}）`}
        cancelText="取消"
        width={500}
      >
        <List
          dataSource={results}
          style={{ marginTop: 8 }}
          renderItem={(item: any, i: number) => (
            <List.Item
              key={i}
              style={{ padding: '12px 0', borderBottom: '1px solid #f5f5f5' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                <Tag color={item.type === 'income' ? 'green' : 'pink'} style={{ fontSize: 13 }}>
                  {item.type === 'income' ? '💰 收入' : '💸 支出'}
                </Tag>
                <span style={{ fontSize: 22 }}>{item.category_icon}</span>
                <span style={{ flex: 1 }}>
                  {item.category_name}
                  {item.subcategory_name && <Tag style={{ marginLeft: 4 }}>{item.subcategory_name}</Tag>}
                  {item.note && <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>{item.note}</Text>}
                </span>
                <Text strong style={{
                  fontSize: 17, fontFamily: '"SF Mono","Consolas",monospace',
                  color: item.type === 'income' ? '#52c41a' : '#FF6B81', whiteSpace: 'nowrap',
                }}>
                  {item.type === 'income' ? '+' : '-'}¥{item.amount?.toFixed(2)}
                </Text>
              </div>
            </List.Item>
          )}
        />
        <div style={{ marginTop: 12, fontSize: 13, color: '#999' }}>
          📌 如有偏差可取消后手动输入
        </div>
      </Modal>
    </>
  )
}
