import React, { useState } from 'react'
import { Layout, Menu, Button, Typography } from 'antd'
import {
  HomeOutlined,
  PlusCircleOutlined,
  UnorderedListOutlined,
  BarChartOutlined,
  RobotOutlined,
  FolderOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'

const { Sider, Content } = Layout
const { Text } = Typography

export type PageKey = 'dashboard' | 'billList' | 'statistics' | 'aiAnalysis' | 'categories' | 'settings'

const menuItems: { key: PageKey; icon: React.ReactNode; label: string }[] = [
  { key: 'dashboard', icon: <HomeOutlined />, label: '首页概览' },
  { key: 'billList', icon: <UnorderedListOutlined />, label: '账单列表' },
  { key: 'statistics', icon: <BarChartOutlined />, label: '统计分析' },
  { key: 'aiAnalysis', icon: <RobotOutlined />, label: 'AI 分析' },
  { key: 'categories', icon: <FolderOutlined />, label: '分类管理' },
  { key: 'settings', icon: <SettingOutlined />, label: '设置' },
]

interface AppLayoutProps {
  currentPage: PageKey
  onNavigate: (page: PageKey) => void
  onAddExpense: () => void
  children: React.ReactNode
}

const AppLayout: React.FC<AppLayoutProps> = ({ currentPage, onNavigate, onAddExpense, children }) => {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={200}
        style={{
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
          boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
        }}
      >
        {/* Logo */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0',
          padding: '0 16px',
        }}>
          <Text
            strong
            style={{
              fontSize: collapsed ? 16 : 20,
              color: '#FF6B81',
              whiteSpace: 'nowrap',
            }}
          >
            {collapsed ? '🍩' : '🍩 甜甜记账'}
          </Text>
        </div>

        {/* 记一笔按钮 */}
        <div style={{ padding: '16px' }}>
          <Button
            type="primary"
            icon={<PlusCircleOutlined />}
            block
            size="large"
            onClick={onAddExpense}
            style={{
              height: 44,
              fontSize: 16,
              background: 'linear-gradient(135deg, #FF6B81, #FF8E9E)',
              border: 'none',
            }}
          >
            {!collapsed && '记一笔'}
          </Button>
        </div>

        {/* 菜单 */}
        <Menu
          mode="inline"
          selectedKeys={[currentPage]}
          items={menuItems.map(item => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
          }))}
          onClick={({ key }) => onNavigate(key as PageKey)}
          style={{
            borderRight: 'none',
            fontSize: 15,
          }}
        />

        {/* 折叠按钮 */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 0,
            right: 0,
            textAlign: 'center',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
        </div>
      </Sider>

      {/* 内容区 */}
      <Content style={{ padding: 24, overflow: 'auto', background: '#f5f5f5' }}>
        {children}
      </Content>
    </Layout>
  )
}

export default AppLayout
