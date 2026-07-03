import dayjs from 'dayjs'

// 格式化金额
export function formatAmount(amount: number): string {
  return `¥${amount.toFixed(2)}`
}

// 格式化日期
export function formatDate(date: string): string {
  return dayjs(date).format('MM月DD日 dddd')
}

// 获取当月日期范围
export function getCurrentMonthRange() {
  const now = dayjs()
  return {
    startDate: now.startOf('month').format('YYYY-MM-DD'),
    endDate: now.endOf('month').format('YYYY-MM-DD'),
  }
}

// 获取当年
export function getCurrentYear() {
  return dayjs().format('YYYY')
}
