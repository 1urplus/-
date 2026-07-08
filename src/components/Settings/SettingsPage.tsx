import { useState, useEffect } from 'react'
import {
  Card, Typography, Input, Select, Button, Space, Divider, message,
  Alert, Tag, Descriptions
} from 'antd'
import {
  KeyOutlined, ClockCircleOutlined, SaveOutlined, InfoCircleOutlined
} from '@ant-design/icons'

const { Title, Text, Paragraph, Link } = Typography

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('')
  const [analysisMode, setAnalysisMode] = useState<string>('manual')
  const [autoHour, setAutoHour] = useState('9')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const [key, mode, hour] = await Promise.all([
        window.electronAPI.getSetting('deepseek_api_key'),
        window.electronAPI.getSetting('analysis_mode'),
        window.electronAPI.getSetting('analysis_auto_hour'),
      ])
      if (key) setApiKey(key)
      if (mode) setAnalysisMode(mode)
      if (hour) setAutoHour(hour)
    } catch (err) {
      console.error('加载设置失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await Promise.all([
        window.electronAPI.setSetting('deepseek_api_key', apiKey),
        window.electronAPI.setSetting('analysis_mode', analysisMode),
        window.electronAPI.setSetting('analysis_auto_hour', autoHour),
      ])
      message.success('设置已保存！')
    } catch (err) {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: String(i),
    label: `${i}:00`,
  }))

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>⚙️ 设置</Title>

      {/* AI 分析设置 */}
      <Card
        title={<><KeyOutlined /> AI 分析设置</>}
        style={{ marginBottom: 16 }}
      >
        <Alert
          message="🔒 你的数据安全吗？"
          description="所有消费数据只存储在你的电脑上。AI 分析时仅发送消费分类汇总和金额信息，不包含任何个人身份信息。API Key 也仅保存在你的本地电脑中。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 8 }}>
            <Text strong>DeepSeek API Key</Text>
            <Text type="secondary" style={{ marginLeft: 8 }}>
              用于调用 AI 分析功能
            </Text>
          </div>
          <Input.Password
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="输入你的 DeepSeek API Key（sk-...）"
            size="large"
            style={{ maxWidth: 500 }}
          />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              💡 还没有 API Key？去{' '}
              <Link href="https://platform.deepseek.com" target="_blank">
                DeepSeek 开放平台
              </Link>
              {' '}注册账号即可获取
            </Text>
          </div>
        </div>

        <Divider />

        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 8 }}>
            <Text strong>分析模式</Text>
          </div>
          <Select
            value={analysisMode}
            onChange={setAnalysisMode}
            size="large"
            style={{ width: 300 }}
            options={[
              {
                value: 'manual',
                label: '👆 手动分析 — 点击按钮触发分析',
              },
              {
                value: 'auto',
                label: '⏰ 自动分析 — 每天定时自动分析',
              },
            ]}
          />
        </div>

        {analysisMode === 'auto' && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>自动分析时间</Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>
                每天几点执行自动分析？
              </Text>
            </div>
            <Select
              value={autoHour}
              onChange={setAutoHour}
              size="large"
              style={{ width: 200 }}
              options={hourOptions}
            />
          </div>
        )}

        <Button
          type="primary"
          icon={<SaveOutlined />}
          size="large"
          onClick={handleSave}
          loading={saving}
        >
          保存设置
        </Button>
      </Card>

      {/* 关于 */}
      <Card title={<><InfoCircleOutlined /> 关于</>}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="应用名称">洋洋记账</Descriptions.Item>
          <Descriptions.Item label="版本">1.0.0</Descriptions.Item>
          <Descriptions.Item label="技术栈">Electron + React + TypeScript</Descriptions.Item>
          <Descriptions.Item label="数据存储">本地 SQLite（数据完全存储在你的电脑上）</Descriptions.Item>
          <Descriptions.Item label="AI 引擎">DeepSeek API</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  )
}
