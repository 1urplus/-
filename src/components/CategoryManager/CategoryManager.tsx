import { useState, useEffect } from 'react'
import { Card, Table, Button, Tag, Space, Modal, Form, Select, Input, Typography, Popconfirm, message, Empty, Segmented } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

const EMOJI_OPTIONS = ['🍜','🚗','🛒','🏠','💊','📚','🎮','🎁','💰','📦','💼','💻','📈','🧧','📥','☕','🍰','🎬','✈️','🏥','📱','👗','💄','🐱','🎵','💻','📷','🎂','⚽','🎓','🏃','📌']

interface CategoryManagerProps { refreshKey: number }

export default function CategoryManager({ refreshKey }: CategoryManagerProps) {
  const [catType, setCatType] = useState<string>('expense')
  const [categoryTree, setCategoryTree] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [form] = Form.useForm()

  useEffect(() => { loadCategories() }, [refreshKey, catType])

  const loadCategories = async () => {
    setLoading(true)
    try {
      const tree = await window.electronAPI.getCategoryTree(catType)
      setCategoryTree(tree)
    } catch (err) { message.error('加载分类失败') } finally { setLoading(false) }
  }

  const handleAddParent = () => {
    setEditingCategory(null)
    form.resetFields()
    form.setFieldsValue({ icon: '📌' })
    setModalOpen(true)
  }

  const handleAddChild = (parentId: number) => {
    setEditingCategory(null)
    form.resetFields()
    form.setFieldsValue({ parentId, icon: '📌' })
    setModalOpen(true)
  }

  const handleEdit = (category: any) => {
    setEditingCategory(category)
    form.setFieldsValue({ name: category.name, icon: category.icon, parentId: category.parent_id })
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    await window.electronAPI.deleteCategory(id)
    message.success('删除成功')
    loadCategories()
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingCategory) {
        await window.electronAPI.updateCategory(editingCategory.id, { name: values.name, icon: values.icon })
        message.success('修改成功')
      } else {
        await window.electronAPI.addCategory({ name: values.name, parentId: values.parentId || null, icon: values.icon, type: catType })
        message.success('添加成功')
      }
      setModalOpen(false)
      loadCategories()
    } catch (err: any) { if (err?.errorFields) return; message.error('操作失败') }
  }

  const tableData = categoryTree.flatMap(parent => {
    const rows: any[] = [{ ...parent, key: `p-${parent.id}`, isParent: true, children: undefined }]
    parent.children?.forEach((child: any) => {
      rows.push({ ...child, key: `c-${child.id}`, isParent: false, parentName: parent.name })
    })
    return rows
  })

  const columns = [
    {
      title: '名称', key: 'name',
      render: (_: any, r: any) => (
        <Space>
          <span style={{ fontSize: 20 }}>{r.icon}</span>
          <Text strong={r.isParent}>{r.name}</Text>
          {r.isParent && <Tag color={catType === 'expense' ? 'pink' : 'green'}>{catType === 'expense' ? '支出' : '收入'}</Tag>}
          {!r.isParent && <Tag>二级</Tag>}
          {r.is_builtin === 1 && <Tag color="blue">内置</Tag>}
        </Space>
      ),
    },
    {
      title: '所属分类', key: 'parent',
      render: (_: any, r: any) => r.isParent ? <Text type="secondary">-</Text> : <Text type="secondary">{r.parentName}</Text>,
    },
    {
      title: '操作', width: 180,
      render: (_: any, r: any) => {
        if (r.is_builtin === 1) return <Text type="secondary" style={{ fontSize: 12 }}>内置分类不可操作</Text>
        return (
          <Space>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>编辑</Button>
            <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)} okText="确定" cancelText="取消">
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>📂 分类管理</Title>
        <Space>
          <Segmented
            value={catType}
            onChange={(v) => setCatType(v as string)}
            options={[
              { value: 'expense', label: '💸 支出分类' },
              { value: 'income', label: '💰 收入分类' },
            ]}
          />
          <Button icon={<PlusOutlined />} onClick={handleAddParent}>添加一级分类</Button>
        </Space>
      </div>

      <Card>
        {tableData.length > 0 ? (
          <Table dataSource={tableData} columns={columns} rowKey="key" loading={loading} size="middle" pagination={false} />
        ) : (<Empty description="暂无分类" />)}
      </Card>

      <Modal title={editingCategory ? '✏️ 编辑分类' : '➕ 添加分类'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => setModalOpen(false)} okText={editingCategory ? '保存' : '添加'} cancelText="取消" width={420} destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
            <Input placeholder="例如：零食、网购" maxLength={20} />
          </Form.Item>
          <Form.Item name="parentId" label="所属一级分类">
            <Select placeholder="留空则创建一级分类" allowClear disabled={!!editingCategory?.parent_id}
              options={categoryTree.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))} />
          </Form.Item>
          <Form.Item name="icon" label="图标" rules={[{ required: true, message: '请选择图标' }]}>
            <Select options={EMOJI_OPTIONS.map(e => ({ value: e, label: e }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
