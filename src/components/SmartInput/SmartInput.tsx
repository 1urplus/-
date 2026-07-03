import { useState } from 'react'
import { Card, Input, Button, Modal, Descriptions, Tag, Spin, message, Space, Typography } from 'antd'
import { ThunderboltOutlined, SendOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Text } = Typography

interface SmartInputProps {
  onSaved: () => void
}

export default function SmartInput({ onSaved }: SmartInputProps) {
  const [text, setText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleParse = async () => {
    const trimmed = text.trim()
    if (!trimmed) {
      message.warning('请输入内容，比如"今天午饭35元"')
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

      // 用分类信息补全结果
      const data = response.data
      const cat = categories.find((c: any) => c.id === data.category_id)
      const sub = data.subcategory_id ? categories.find((c: any) => c.id === data.subcategory_id) : null
      setResult({
        ...data,
        category_name: cat?.name || '未知',
        category_icon: cat?.icon || '📌',
        subcategory_name: sub?.name || null,
      })
      setConfirmOpen(true)
    } catch (err: any) {
      setError('解析失败：' + (err.message || '网络错误'))
    } finally {
      setParsing(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await window.electronAPI.addTransaction({
        amount: result.amount,
        type: result.type,
        categoryId: result.category_id,
        subcategoryId: result.subcategory_id || null,
        date: result.date,
        note: result.note || '',
      })
      message.success('保存成功！')
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

  return (
    <>
      <Card
        style={{ marginBottom: 16 }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <TextArea
            value={text}
            onChange={e => { setText(e.target.value); setError(null) }}
            onKeyDown={handleKeyDown}
            placeholder={'直接输入就行，比如：\n"今天午饭花了35元"\n"收到工资8000"\n"打车去公司花了25块"'}
            rows={3}
            style={{ flex: 1, fontSize: 15 }}
            disabled={parsing}
            autoFocus
          />
          <Button
            type="primary"
            icon={parsing ? <Spin size="small" /> : <ThunderboltOutlined />}
            onClick={handleParse}
            loading={parsing}
            size="large"
            style={{
              height: 76,
              minWidth: 100,
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              border: 'none',
              fontSize: 16,
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
            💡 提示：输入后按 Enter 快速识别，AI 会自动判断收入/支出并从已有分类中匹配
          </Text>
        </div>
      </Card>

      {/* 确认弹窗 */}
      <Modal
        title="🤖 AI 识别结果"
        open={confirmOpen}
        onOk={handleSave}
        onCancel={() => setConfirmOpen(false)}
        confirmLoading={saving}
        okText="确认并保存"
        cancelText="取消"
        width={440}
      >
        {result && (
          <Descriptions column={1} size="large" bordered style={{ marginTop: 16 }}>
            <Descriptions.Item label="类型">
              <Tag color={result.type === 'income' ? 'green' : 'pink'} style={{ fontSize: 15 }}>
                {result.type === 'income' ? '💰 收入' : '💸 支出'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="金额">
              <Text strong style={{ fontSize: 20, color: result.type === 'income' ? '#52c41a' : '#FF6B81' }}>
                ¥{result.amount?.toFixed(2)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="分类">
              <Space>
                <span style={{ fontSize: 22 }}>{result.category_icon}</span>
                <span>{result.category_name}</span>
                {result.subcategory_name && <Tag>{result.subcategory_name}</Tag>}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="日期">
              {result.date} {dayjs(result.date).format('dddd')}
            </Descriptions.Item>
            {result.note && (
              <Descriptions.Item label="备注">{result.note}</Descriptions.Item>
            )}
          </Descriptions>
        )}
        <div style={{ marginTop: 12, fontSize: 13, color: '#999' }}>
          📌 如有偏差可手动修改后保存
        </div>
      </Modal>
    </>
  )
}
