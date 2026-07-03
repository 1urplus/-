import { useState, useEffect } from 'react'
import { Modal, Form, InputNumber, Select, DatePicker, Input, message, Segmented } from 'antd'
import dayjs from 'dayjs'

interface AddExpenseModalProps {
  open: boolean
  expense: any | null
  onCancel: () => void
  onSaved: () => void
}

export default function AddExpenseModal({ open, expense, onCancel, onSaved }: AddExpenseModalProps) {
  const [form] = Form.useForm()
  const [transType, setTransType] = useState<string>('expense')
  const [categoryTree, setCategoryTree] = useState<any[]>([])
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const isEdit = !!expense

  useEffect(() => {
    if (open) {
      if (expense) {
        setTransType(expense.type || 'expense')
        form.setFieldsValue({
          amount: expense.amount,
          categoryId: expense.category_id,
          subcategoryId: expense.subcategory_id || undefined,
          date: dayjs(expense.date),
          note: expense.note || '',
        })
        setSelectedParentId(expense.category_id)
      } else {
        setTransType('expense')
        form.resetFields()
        form.setFieldsValue({ date: dayjs() })
        setSelectedParentId(null)
      }
    }
  }, [open, expense])

  // 当交易类型变化时重新加载分类
  useEffect(() => {
    if (open) loadCategories(transType)
  }, [transType, open])

  const loadCategories = async (type: string) => {
    setLoading(true)
    try {
      if (!window.electronAPI) {
        message.error('⚠️ 请在 Electron 桌面应用中运行', 8)
        return
      }
      const tree = await window.electronAPI.getCategoryTree(type)
      setCategoryTree(tree)
      // 切换类型时清空已选分类
      form.setFieldValue('categoryId', undefined)
      form.setFieldValue('subcategoryId', undefined)
      setSelectedParentId(null)
    } catch (err: any) {
      console.error('加载分类失败:', err)
      message.error('加载分类失败：' + (err.message || '未知错误'))
    } finally {
      setLoading(false)
    }
  }

  const handleParentChange = (value: number) => {
    setSelectedParentId(value)
    form.setFieldValue('subcategoryId', undefined)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const data = {
        amount: values.amount,
        type: transType,
        categoryId: values.categoryId,
        subcategoryId: values.subcategoryId || null,
        date: values.date.format('YYYY-MM-DD'),
        note: values.note || '',
      }

      if (isEdit) {
        await window.electronAPI.updateTransaction(expense.id, data)
      } else {
        await window.electronAPI.addTransaction(data)
      }
      onSaved()
    } catch (err: any) {
      if (err?.errorFields) return
      message.error('保存失败：' + (err.message || '未知错误'))
    } finally {
      setSaving(false)
    }
  }

  const subCategories = categoryTree.find(c => c.id === selectedParentId)?.children || []
  const isIncome = transType === 'income'

  return (
    <Modal
      title={isEdit ? '✏️ 编辑记录' : (isIncome ? '💰 记收入' : '💸 记支出')}
      open={open}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={saving}
      okText={isEdit ? '保存修改' : '确认添加'}
      cancelText="取消"
      width={480}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }} initialValues={{ date: dayjs() }}>

        {/* 收入/支出切换 */}
        {!isEdit && (
          <Form.Item label="类型">
            <Segmented
              block
              size="large"
              value={transType}
              onChange={(val) => setTransType(val as string)}
              options={[
                { value: 'expense', label: '💸 支出' },
                { value: 'income', label: '💰 收入' },
              ]}
              style={{ marginBottom: 8 }}
            />
          </Form.Item>
        )}

        <Form.Item
          name="amount"
          label={isIncome ? '金额（元）' : '金额（元）'}
          rules={[
            { required: true, message: '请输入金额' },
            { type: 'number', min: 0.01, message: '金额必须大于 0' },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder={isIncome ? '收入了多少？' : '花了多少钱？'}
            prefix="¥"
            precision={2}
            size="large"
            autoFocus
            controls={false}
          />
        </Form.Item>

        <Form.Item
          name="categoryId"
          label={isIncome ? '收入分类' : '支出分类'}
          rules={[{ required: true, message: '请选择分类' }]}
        >
          <Select
            placeholder={isIncome ? '选择收入类别' : '选择消费类别'}
            size="large"
            loading={loading}
            onChange={handleParentChange}
            options={categoryTree.map(c => ({
              value: c.id,
              label: `${c.icon} ${c.name}`,
            }))}
          />
        </Form.Item>

        {subCategories.length > 0 && (
          <Form.Item name="subcategoryId" label="二级分类（可选）">
            <Select placeholder="选择具体分类" size="large" allowClear
              options={subCategories.map((c: any) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
        )}

        <Form.Item name="date" label="日期" rules={[{ required: true, message: '请选择日期' }]}>
          <DatePicker style={{ width: '100%' }} size="large" allowClear={false} />
        </Form.Item>

        <Form.Item name="note" label="备注（可选）">
          <Input.TextArea placeholder={isIncome ? '钱从哪来的？' : '买什么了？'} rows={2} maxLength={200} showCount />
        </Form.Item>
      </Form>
    </Modal>
  )
}
