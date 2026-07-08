import { useEffect, useRef, useState, useCallback } from 'react'
import { Card, Button, Statistic } from 'antd'
import { TrophyOutlined, PlayCircleOutlined } from '@ant-design/icons'

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
interface Position { x: number; y: number }

const GRID_SIZE = 20           // 每格像素
const COLS = 30                // 列数
const ROWS = 20                // 行数
const INITIAL_SPEED = 120      // 初始速度(毫秒)
const SPEED_INCREMENT = 3      // 每吃一个加速(毫秒), 最小60

// 游戏区域大小
const WIDTH = COLS * GRID_SIZE
const HEIGHT = ROWS * GRID_SIZE

// 初始蛇位置
const INITIAL_SNAKE: Position[] = [
  { x: 6, y: 10 }, { x: 5, y: 10 }, { x: 4, y: 10 }
]

function randomFood(snake: Position[]): Position {
  // 尝试随机查找，最多 1000 次后改为线性扫描
  for (let tries = 0; tries < 1000; tries++) {
    const food = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    }
    if (!snake.some(s => s.x === food.x && s.y === food.y)) return food
  }
  // 兜底：线性扫描空位
  const occupied = new Set(snake.map(s => `${s.x},${s.y}`))
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!occupied.has(`${x},${y}`)) return { x, y }
    }
  }
  // 没有空位（棋盘满），返回任意位置
  return { x: 0, y: 0 }
}

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const directionRef = useRef<Direction>('RIGHT')        // 当前方向
  const nextDirectionRef = useRef<Direction>('RIGHT')    // 下一帧方向(防反向)
  const snakeRef = useRef<Position[]>(INITIAL_SNAKE)
  const foodRef = useRef<Position>(randomFood(INITIAL_SNAKE))
  const timerRef = useRef<number | null>(null)
  const speedRef = useRef<number>(INITIAL_SPEED)
  const scoreRef = useRef(0)                             // 分数用 ref 避免闭包过期

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snake_high_score')
    return saved ? parseInt(saved, 10) : 0
  })

  // 绘制函数
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const snake = snakeRef.current
    const food = foodRef.current

    // 背景
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    // 网格线
    ctx.strokeStyle = '#16213e'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * GRID_SIZE, 0); ctx.lineTo(x * GRID_SIZE, HEIGHT); ctx.stroke()
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * GRID_SIZE); ctx.lineTo(WIDTH, y * GRID_SIZE); ctx.stroke()
    }

    // 食物（带光晕）- 粉色
    ctx.shadowColor = '#FF6B81'
    ctx.shadowBlur = 10
    ctx.fillStyle = '#FF6B81'
    ctx.beginPath()
    ctx.arc(
      food.x * GRID_SIZE + GRID_SIZE / 2,
      food.y * GRID_SIZE + GRID_SIZE / 2,
      GRID_SIZE / 2 - 2, 0, Math.PI * 2
    )
    ctx.fill()
    ctx.shadowBlur = 0

    // 蛇身
    snake.forEach((seg, i) => {
      const ratio = 1 - i / (snake.length + 8)  // 头部亮，尾部暗
      const r = Math.floor(100 + 155 * ratio)
      const g = Math.floor(180 + 75 * ratio)
      const b = Math.floor(100 + 155 * ratio)
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(
        seg.x * GRID_SIZE + 2,
        seg.y * GRID_SIZE + 2,
        GRID_SIZE - 4,
        GRID_SIZE - 4
      )
    })

    // 蛇头眼睛
    const head = snake[0]
    ctx.fillStyle = '#fff'
    const cx = head.x * GRID_SIZE + GRID_SIZE / 2
    const cy = head.y * GRID_SIZE + GRID_SIZE / 2
    const dir = directionRef.current
    const eyeOffset = 4
    let e1x = cx, e1y = cy, e2x = cx, e2y = cy
    if (dir === 'RIGHT') { e1x = cx + 3; e1y = cy - eyeOffset; e2x = cx + 3; e2y = cy + eyeOffset }
    if (dir === 'LEFT')  { e1x = cx - 3; e1y = cy - eyeOffset; e2x = cx - 3; e2y = cy + eyeOffset }
    if (dir === 'UP')    { e1x = cx - eyeOffset; e1y = cy - 3; e2x = cx + eyeOffset; e2y = cy - 3 }
    if (dir === 'DOWN')  { e1x = cx - eyeOffset; e1y = cy + 3; e2x = cx + eyeOffset; e2y = cy + 3 }
    ctx.beginPath(); ctx.arc(e1x, e1y, 2, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(e2x, e2y, 2, 0, Math.PI * 2); ctx.fill()
  }, [])

  // 结束游戏（通过 ref 读取分数，避免闭包过期）
  const endGame = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    const actualScore = scoreRef.current
    // 更新最高分
    const saved = localStorage.getItem('snake_high_score')
    const currentHigh = saved ? parseInt(saved, 10) : 0
    if (actualScore > currentHigh) {
      localStorage.setItem('snake_high_score', String(actualScore))
      setHighScore(actualScore)
    }
    setScore(actualScore)
    setGameState('over')
  }, [])

  // 更新分数（同时更新 ref 和 state）
  const addScore = useCallback((points: number) => {
    scoreRef.current += points
    setScore(scoreRef.current)
  }, [])

  // 游戏循环
  const gameLoop = useCallback(() => {
    directionRef.current = nextDirectionRef.current
    const snake = snakeRef.current
    const head = snake[0]
    let newHead: Position

    switch (directionRef.current) {
      case 'UP':    newHead = { x: head.x, y: head.y - 1 }; break
      case 'DOWN':  newHead = { x: head.x, y: head.y + 1 }; break
      case 'LEFT':  newHead = { x: head.x - 1, y: head.y }; break
      case 'RIGHT': newHead = { x: head.x + 1, y: head.y }; break
    }

    // 碰墙 → 游戏结束
    if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
      endGame()
      return
    }

    // 碰自己 → 游戏结束
    if (snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
      endGame()
      return
    }

    const newSnake = [newHead, ...snake]

    // 吃到食物
    if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
      foodRef.current = randomFood(newSnake)
      addScore(10)
      // 加速
      const newSpeed = Math.max(60, speedRef.current - SPEED_INCREMENT)
      if (newSpeed !== speedRef.current) {
        speedRef.current = newSpeed
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = window.setInterval(gameLoop, speedRef.current)
      }
    } else {
      newSnake.pop()
    }

    snakeRef.current = newSnake
    draw()
  }, [draw, endGame, addScore])

  // 开始游戏
  const startGame = useCallback(() => {
    snakeRef.current = INITIAL_SNAKE.map(p => ({ ...p }))
    foodRef.current = randomFood(snakeRef.current)
    directionRef.current = 'RIGHT'
    nextDirectionRef.current = 'RIGHT'
    speedRef.current = INITIAL_SPEED
    scoreRef.current = 0
    setScore(0)
    setGameState('playing')
    draw()
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = window.setInterval(gameLoop, INITIAL_SPEED)
  }, [gameLoop, draw])

  // 键盘控制
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // 阻止方向键和空格滚动页面
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault()
      }

      if (gameState !== 'playing') {
        if (e.key === 'Enter' || e.key === ' ') startGame()
        return
      }
      // 检查 directionRef（已提交方向），防止与当前运动方向相反的输入
      const dir = directionRef.current
      switch (e.key) {
        case 'ArrowUp':    case 'w': case 'W': if (dir !== 'DOWN') nextDirectionRef.current = 'UP'; break
        case 'ArrowDown':  case 's': case 'S': if (dir !== 'UP') nextDirectionRef.current = 'DOWN'; break
        case 'ArrowLeft':  case 'a': case 'A': if (dir !== 'RIGHT') nextDirectionRef.current = 'LEFT'; break
        case 'ArrowRight': case 'd': case 'D': if (dir !== 'LEFT') nextDirectionRef.current = 'RIGHT'; break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [gameState, startGame])

  // 清理定时器
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  return (
    <Card
      title={<span>🐍 贪吃蛇</span>}
      style={{ position: 'relative', maxWidth: WIDTH + 48 + 240, margin: '0 auto' }}
      extra={
        <Button type="primary" icon={<PlayCircleOutlined />} onClick={startGame} disabled={gameState === 'playing'}>
          {gameState === 'idle' ? '开始游戏' : gameState === 'over' ? '再来一局' : '游戏中...'}
        </Button>
      }
    >
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <Statistic title="当前得分" value={score} prefix={<TrophyOutlined />} valueStyle={{ color: '#FF6B81' }} />
        <Statistic title="最高记录" value={highScore} prefix="🏆" />
      </div>
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        style={{
          display: 'block',
          margin: '0 auto',
          border: '2px solid #FF6B81',
          borderRadius: 8,
        }}
      />
      <div style={{
        textAlign: 'center', color: '#999', marginTop: 12, fontSize: 13,
      }}>
        方向键 ↑↓←→ 或 WASD 控制 | 空格键开始
      </div>

      {/* 游戏结束遮罩 */}
      {gameState === 'over' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          borderRadius: 8, zIndex: 10, flexDirection: 'column', gap: 8,
        }}>
          <div style={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}>游戏结束</div>
          <div style={{ color: '#FF6B81', fontSize: 20 }}>得分：{score}</div>
          {score >= highScore && score > 0 && (
            <div style={{ color: '#FFD700', fontSize: 18 }}>🎉 新纪录！</div>
          )}
        </div>
      )}

      {/* 初始状态 */}
      {gameState === 'idle' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          borderRadius: 8, zIndex: 10, flexDirection: 'column', gap: 8,
        }}>
          <div style={{ color: '#FF6B81', fontSize: 36 }}>🐍</div>
          <div style={{ color: '#fff', fontSize: 20 }}>点击按钮或按空格键开始</div>
        </div>
      )}
    </Card>
  )
}
