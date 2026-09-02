import React, { useState, useRef, useEffect } from 'react'
import { X, ZoomIn, ZoomOut, RotateCw, Check, Camera } from 'lucide-react'

export default function ImageCropperModal({ imageSrc, onCancel, onCropComplete, isUploading }) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const canvasRef = useRef(null)
  const imageRef = useRef(new Image())

  useEffect(() => {
    if (!imageSrc) return
    const img = imageRef.current
    img.crossOrigin = 'anonymous'
    img.src = imageSrc
    img.onload = () => {
      setZoom(1)
      setRotation(0)
      setPan({ x: 0, y: 0 })
    }
  }, [imageSrc])

  // Draw image on preview canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageSrc) return
    const ctx = canvas.getContext('2d')
    const img = imageRef.current
    if (!img.complete || img.naturalWidth === 0) return

    const size = 300
    canvas.width = size
    canvas.height = size

    ctx.clearRect(0, 0, size, size)
    ctx.save()

    // Circular clipping mask for WhatsApp style
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.clip()

    // Background fill
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, size, size)

    // Translate to center for rotation and scaling
    ctx.translate(size / 2 + pan.x, size / 2 + pan.y)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(zoom, zoom)

    // Draw centered image
    const aspectRatio = img.naturalWidth / img.naturalHeight
    let drawW = size
    let drawH = size
    if (aspectRatio > 1) {
      drawH = size
      drawW = size * aspectRatio
    } else {
      drawW = size
      drawH = size / aspectRatio
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
    ctx.restore()
  }, [imageSrc, zoom, rotation, pan])

  // Mouse / Touch Drag Handlers
  const handleMouseDown = (e) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Generate high-resolution cropped Blob / File
  const handleApplyCrop = () => {
    const canvas = document.createElement('canvas')
    const outputSize = 512 // 512x512 crisp profile picture
    canvas.width = outputSize
    canvas.height = outputSize
    const ctx = canvas.getContext('2d')
    const img = imageRef.current

    if (!img.complete || img.naturalWidth === 0) return

    // Circular crop on output canvas
    ctx.beginPath()
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2)
    ctx.clip()

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, outputSize, outputSize)

    // Translate & scale
    ctx.translate(outputSize / 2 + (pan.x * outputSize) / 300, outputSize / 2 + (pan.y * outputSize) / 300)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(zoom, zoom)

    const aspectRatio = img.naturalWidth / img.naturalHeight
    let drawW = outputSize
    let drawH = outputSize
    if (aspectRatio > 1) {
      drawH = outputSize
      drawW = outputSize * aspectRatio
    } else {
      drawW = outputSize
      drawH = outputSize / aspectRatio
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)

    canvas.toBlob((blob) => {
      if (!blob) return
      const croppedFile = new File([blob], `profile_${Date.now()}.png`, { type: 'image/png' })
      onCropComplete(croppedFile, canvas.toDataURL('image/png'))
    }, 'image/png', 0.95)
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 flex flex-col items-center">
        
        {/* Header */}
        <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-100">Crop Profile Photo</h3>
              <p className="text-[11px] text-slate-400 font-medium">Adjust & zoom like WhatsApp profile photo</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isUploading}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* WhatsApp-style Circular Crop Area */}
        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="relative w-[300px] h-[300px] rounded-full overflow-hidden border-4 border-blue-500/60 shadow-2xl bg-slate-950 cursor-grab active:cursor-grabbing select-none group"
        >
          <canvas ref={canvasRef} className="w-full h-full object-cover" />
          
          {/* Overlay Grid lines for guide */}
          <div className="absolute inset-0 border border-white/20 rounded-full pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 group-hover:opacity-75 transition">
            <div className="w-full border-t border-dashed border-white/30" />
            <div className="h-full border-l border-dashed border-white/30 absolute" />
          </div>
        </div>

        {/* Controls Bar: Zoom & Rotate */}
        <div className="w-full space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
          
          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <ZoomOut size={16} className="text-slate-400 shrink-0" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <ZoomIn size={16} className="text-slate-400 shrink-0" />
            <span className="text-xs font-mono font-bold text-blue-400 min-w-[36px] text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Rotate Button */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              <RotateCw size={13} /> Rotate 90°
            </button>
            <span className="text-[10px] text-slate-500 font-semibold">Drag image to position</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isUploading}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={isUploading}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition cursor-pointer disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>Crop & Set Photo</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
