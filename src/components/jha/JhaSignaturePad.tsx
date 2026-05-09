'use client'

import { useRef, useState } from 'react'
import { Eraser } from 'lucide-react'

interface Props {
  onChange: (dataUrl: string | null) => void
}

export function JhaSignaturePad({ onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  function coord(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const sx = canvas.width / rect.width
    const sy = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * sx, y: (t.clientY - rect.top) * sy }
    }
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy }
  }

  function down(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    drawing.current = true
    const pt = coord(e)
    last.current = pt
    ctx.beginPath()
    ctx.fillStyle = '#0f172a'
    ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2)
    ctx.fill()
    setIsEmpty(false)
    onChange(canvasRef.current!.toDataURL('image/png'))
  }

  function move(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!drawing.current || !last.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pt = coord(e)
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(pt.x, pt.y)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    last.current = pt
    onChange(canvasRef.current!.toDataURL('image/png'))
  }

  function up() {
    drawing.current = false
    last.current = null
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 touch-none">
        <canvas
          ref={canvasRef}
          width={700}
          height={180}
          className="w-full cursor-crosshair"
          onMouseDown={down}
          onMouseMove={move}
          onMouseUp={up}
          onMouseLeave={up}
          onTouchStart={down}
          onTouchMove={move}
          onTouchEnd={up}
        />
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-slate-300 select-none">Sign here with your finger or mouse</p>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={clear}
        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
      >
        <Eraser className="h-3 w-3" />
        Clear signature
      </button>
    </div>
  )
}
