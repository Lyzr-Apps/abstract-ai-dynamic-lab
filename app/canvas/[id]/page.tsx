'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { callAIAgent } from '@/lib/aiAgent'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  Copy,
  Download,
  Loader2,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Settings,
  Info,
} from 'lucide-react'

// Theme colors
const THEME_VARS = {
  '--background': '260 30% 6%',
  '--foreground': '180 100% 70%',
  '--card': '260 25% 9%',
  '--card-foreground': '180 100% 70%',
  '--popover': '260 25% 9%',
  '--popover-foreground': '180 100% 70%',
  '--primary': '180 100% 50%',
  '--primary-foreground': '260 30% 6%',
  '--secondary': '300 80% 50%',
  '--secondary-foreground': '0 0% 100%',
  '--muted': '260 20% 15%',
  '--muted-foreground': '180 50% 45%',
  '--accent': '60 100% 50%',
  '--accent-foreground': '260 30% 6%',
  '--destructive': '0 100% 55%',
  '--destructive-foreground': '0 0% 100%',
  '--border': '180 60% 30%',
  '--input': '260 20% 18%',
  '--ring': '180 100% 50%',
  '--radius': '0.25rem',
} as React.CSSProperties

const AGENT_ID = '698c5fe26b632a1e29d7675e'

interface Layer {
  id: string
  name: string
  visible: boolean
  opacity: number
  blendMode: string
  thumbnail: string
  imageData?: ImageData
  imageUrl?: string
}

interface AIResponse {
  status: string
  result?: {
    artDescription?: string
    styleApplied?: string
    colorPalette?: string[]
    creativeSuggestion?: string
  }
  metadata?: {
    generationTime?: number
    modelUsed?: string
  }
  module_outputs?: {
    artifact_files?: Array<{
      url: string
      file_type: string
      file_name: string
    }>
  }
}

type Tool = 'brush' | 'eraser' | 'rectangle' | 'ellipse' | 'select' | 'eyedropper'

const STYLE_PRESETS = [
  { name: 'Fluid', prompt: 'flowing organic shapes with smooth transitions' },
  { name: 'Geometric', prompt: 'sharp geometric patterns with angular forms' },
  { name: 'Organic', prompt: 'natural organic forms inspired by nature' },
  { name: 'Chaotic', prompt: 'dynamic chaotic energy with explosive patterns' },
]

const STYLE_GALLERY = [
  { name: 'Kandinsky', style: 'Kandinsky-inspired abstract expressionism' },
  { name: 'Pollock', style: 'Pollock-inspired gestural abstraction' },
  { name: 'Rothko', style: 'Rothko-inspired color field painting' },
  { name: 'Geometric', style: 'geometric abstract patterns' },
  { name: 'Fluid', style: 'fluid organic forms' },
]

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-base mt-3 mb-1">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-lg mt-4 mb-2">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

export default function CanvasEditor() {
  const router = useRouter()
  const params = useParams()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [projectName, setProjectName] = useState('Untitled Canvas')
  const [activeTool, setActiveTool] = useState<Tool>('brush')
  const [brushSize, setBrushSize] = useState(10)
  const [brushOpacity, setBrushOpacity] = useState(100)
  const [primaryColor, setPrimaryColor] = useState('#00FFFF')
  const [layers, setLayers] = useState<Layer[]>([
    { id: '1', name: 'Background', visible: true, opacity: 100, blendMode: 'normal', thumbnail: '' },
  ])
  const [activeLayerId, setActiveLayerId] = useState('1')
  const [zoom, setZoom] = useState(100)
  const [isDrawing, setIsDrawing] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)

  // AI Generation State
  const [aiPrompt, setAiPrompt] = useState('')
  const [creativity, setCreativity] = useState(50)
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>('')
  const [imageError, setImageError] = useState(false)

  // Style Transfer State
  const [styleIntensity, setStyleIntensity] = useState(75)
  const [selectedStyle, setSelectedStyle] = useState<string>('')

  // Sample Data Toggle
  const [sampleData, setSampleData] = useState(false)

  useEffect(() => {
    if (sampleData) {
      setProjectName('Cosmic Nebula')
      setLayers([
        { id: '1', name: 'Background', visible: true, opacity: 100, blendMode: 'normal', thumbnail: '' },
        { id: '2', name: 'AI Generated Layer', visible: true, opacity: 85, blendMode: 'normal', thumbnail: '', imageUrl: 'https://example.com/generated-art-kandinsky-cosmic.png' },
        { id: '3', name: 'Overlay', visible: true, opacity: 60, blendMode: 'overlay', thumbnail: '' },
      ])
      setAiResponse({
        status: 'success',
        result: {
          artDescription: 'An expressive abstract artwork inspired by Kandinsky\'s compositional approach, featuring swirling cosmic forms, circular elements, and dynamic curves that evoke nebula-like structures. Rich purples, cosmic blues, and vibrant magentas create a sense of celestial energy.',
          styleApplied: 'Kandinsky-inspired',
          colorPalette: ['#1A1A2E', '#6C5CE7', '#A29BFE', '#FD79A8', '#FDCB6E'],
          creativeSuggestion: 'Incorporate small circular accent elements throughout to echo Kandinsky\'s signature compositional style',
        },
        metadata: {
          generationTime: 3500,
          modelUsed: 'gemini-3-pro-image-preview',
        },
      })
      setGeneratedImageUrl('https://example.com/generated-art-kandinsky-cosmic.png')
    } else {
      setProjectName('Untitled Canvas')
      setLayers([
        { id: '1', name: 'Background', visible: true, opacity: 100, blendMode: 'normal', thumbnail: '' },
      ])
      setAiResponse(null)
      setGeneratedImageUrl('')
    }
  }, [sampleData])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Initialize canvas
    canvas.width = 800
    canvas.height = 600
    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (activeTool === 'brush') {
      ctx.strokeStyle = primaryColor
      ctx.lineWidth = brushSize
      ctx.lineCap = 'round'
      ctx.globalAlpha = brushOpacity / 100
      ctx.lineTo(x, y)
      ctx.stroke()
    } else if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(255,255,255,1)'
      ctx.lineWidth = brushSize
      ctx.lineCap = 'round'
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.globalCompositeOperation = 'source-over'
    }
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
  }

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return

    setIsGenerating(true)
    setImageError(false)

    try {
      const message = `${aiPrompt} with creativity level ${creativity}%`
      const result = await callAIAgent(message, AGENT_ID)

      if (result.success && result.response) {
        setAiResponse(result.response as AIResponse)

        // Extract image URL from module_outputs
        const files = Array.isArray(result.module_outputs?.artifact_files)
          ? result.module_outputs.artifact_files
          : []
        const imageUrl = files[0]?.url ?? ''

        if (imageUrl) {
          setGeneratedImageUrl(imageUrl)

          // Add generated image as new layer
          const newLayer: Layer = {
            id: Date.now().toString(),
            name: 'AI Generated',
            visible: true,
            opacity: 100,
            blendMode: 'normal',
            thumbnail: '',
            imageUrl: imageUrl,
          }
          setLayers(prev => [...prev, newLayer])
          setActiveLayerId(newLayer.id)
        }
      }
    } catch (error) {
      console.error('Generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApplyStyle = async () => {
    if (!selectedStyle) return

    setIsGenerating(true)
    setImageError(false)

    try {
      const styleData = STYLE_GALLERY.find(s => s.name === selectedStyle)
      const message = `Apply ${styleData?.style} with intensity ${styleIntensity}%`
      const result = await callAIAgent(message, AGENT_ID)

      if (result.success && result.response) {
        setAiResponse(result.response as AIResponse)

        const files = Array.isArray(result.module_outputs?.artifact_files)
          ? result.module_outputs.artifact_files
          : []
        const imageUrl = files[0]?.url ?? ''

        if (imageUrl) {
          setGeneratedImageUrl(imageUrl)

          const newLayer: Layer = {
            id: Date.now().toString(),
            name: `${selectedStyle} Style`,
            visible: true,
            opacity: styleIntensity,
            blendMode: 'normal',
            thumbnail: '',
            imageUrl: imageUrl,
          }
          setLayers(prev => [...prev, newLayer])
          setActiveLayerId(newLayer.id)
        }
      }
    } catch (error) {
      console.error('Style transfer failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAddLayer = () => {
    const newLayer: Layer = {
      id: Date.now().toString(),
      name: `Layer ${layers.length + 1}`,
      visible: true,
      opacity: 100,
      blendMode: 'normal',
      thumbnail: '',
    }
    setLayers(prev => [...prev, newLayer])
    setActiveLayerId(newLayer.id)
  }

  const handleDeleteLayer = (id: string) => {
    if (layers.length === 1) return
    setLayers(prev => prev.filter(l => l.id !== id))
    if (activeLayerId === id) {
      setActiveLayerId(layers[0].id)
    }
  }

  const handleToggleLayerVisibility = (id: string) => {
    setLayers(prev =>
      prev.map(l => (l.id === id ? { ...l, visible: !l.visible } : l))
    )
  }

  const handleLayerOpacityChange = (id: string, opacity: number) => {
    setLayers(prev =>
      prev.map(l => (l.id === id ? { ...l, opacity } : l))
    )
  }

  const handleExport = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `${projectName}.png`
    link.href = dataUrl
    link.click()
    setShowExportModal(false)
  }

  return (
    <div style={THEME_VARS} className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Top Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            className="border-border"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-48 bg-input border-border text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Label htmlFor="sample-toggle" className="cursor-pointer">Sample Data</Label>
            <Switch
              id="sample-toggle"
              checked={sampleData}
              onCheckedChange={setSampleData}
            />
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-border">
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-xs font-mono w-12 text-center">{zoom}%</span>
            <Button variant="outline" size="sm" className="border-border">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-border"
            onClick={() => setShowExportModal(!showExportModal)}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar */}
        <div className="w-14 border-r border-border bg-card/50 flex flex-col items-center py-4 gap-2">
          <Button
            variant={activeTool === 'brush' ? 'default' : 'outline'}
            size="icon"
            className={activeTool === 'brush' ? 'bg-primary text-primary-foreground' : 'border-border'}
            onClick={() => setActiveTool('brush')}
          >
            <div className="w-4 h-4 rounded-full bg-current" />
          </Button>
          <Button
            variant={activeTool === 'eraser' ? 'default' : 'outline'}
            size="icon"
            className={activeTool === 'eraser' ? 'bg-primary text-primary-foreground' : 'border-border'}
            onClick={() => setActiveTool('eraser')}
          >
            <div className="w-4 h-4 border-2 border-current" />
          </Button>
          <Button
            variant={activeTool === 'rectangle' ? 'default' : 'outline'}
            size="icon"
            className={activeTool === 'rectangle' ? 'bg-primary text-primary-foreground' : 'border-border'}
            onClick={() => setActiveTool('rectangle')}
          >
            <div className="w-4 h-3 border border-current" />
          </Button>
          <Button
            variant={activeTool === 'select' ? 'default' : 'outline'}
            size="icon"
            className={activeTool === 'select' ? 'bg-primary text-primary-foreground' : 'border-border'}
            onClick={() => setActiveTool('select')}
          >
            <div className="w-4 h-4 border border-dashed border-current" />
          </Button>

          <Separator className="my-2" />

          <div className="relative">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-2 border-border"
            />
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex items-center justify-center bg-muted/20 p-8 overflow-auto">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="border border-border shadow-2xl bg-background cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-80 border-l border-border bg-card/50 backdrop-blur-md flex flex-col">
          <ScrollArea className="flex-1">
            <Tabs defaultValue="layers" className="w-full">
              <TabsList className="w-full grid grid-cols-3 bg-muted/50">
                <TabsTrigger value="layers" className="text-xs">Layers</TabsTrigger>
                <TabsTrigger value="ai" className="text-xs">AI Gen</TabsTrigger>
                <TabsTrigger value="style" className="text-xs">Style</TabsTrigger>
              </TabsList>

              {/* Layers Panel */}
              <TabsContent value="layers" className="p-4 space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Layers</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border h-7"
                    onClick={handleAddLayer}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>

                <div className="space-y-2">
                  {layers.map((layer) => (
                    <Card
                      key={layer.id}
                      className={`border ${activeLayerId === layer.id ? 'border-primary' : 'border-border'} bg-card cursor-pointer`}
                      onClick={() => setActiveLayerId(layer.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-12 h-12 bg-muted rounded border border-border flex items-center justify-center overflow-hidden">
                            {layer.imageUrl ? (
                              <div className="text-xs text-muted-foreground">IMG</div>
                            ) : (
                              <div className="text-xs text-muted-foreground">L</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{layer.name}</div>
                            <div className="text-xs text-muted-foreground">{layer.blendMode}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggleLayerVisibility(layer.id)
                              }}
                            >
                              {layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteLayer(layer.id)
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Opacity</span>
                            <span className="text-xs font-mono">{layer.opacity}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={layer.opacity}
                            onChange={(e) => handleLayerOpacityChange(layer.id, parseInt(e.target.value))}
                            className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Tool Settings */}
                {activeTool === 'brush' && (
                  <Card className="border-border bg-card mt-4">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xs font-semibold">Brush Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Size</span>
                          <span className="text-xs font-mono">{brushSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="50"
                          value={brushSize}
                          onChange={(e) => setBrushSize(parseInt(e.target.value))}
                          className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Opacity</span>
                          <span className="text-xs font-mono">{brushOpacity}%</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={brushOpacity}
                          onChange={(e) => setBrushOpacity(parseInt(e.target.value))}
                          className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* AI Generation Panel */}
              <TabsContent value="ai" className="p-4 space-y-3">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs mb-2 block">Art Description</Label>
                    <Textarea
                      placeholder="Describe the abstract art you want..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="bg-input border-border text-sm h-24 resize-none"
                      maxLength={200}
                    />
                    <div className="text-xs text-muted-foreground mt-1 text-right">
                      {aiPrompt.length}/200
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs mb-2 block">Style Presets</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {STYLE_PRESETS.map((preset) => (
                        <Button
                          key={preset.name}
                          size="sm"
                          variant="outline"
                          className="border-border text-xs"
                          onClick={() => setAiPrompt(preset.prompt)}
                        >
                          {preset.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Creativity</Label>
                      <span className="text-xs font-mono">{creativity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={creativity}
                      onChange={(e) => setCreativity(parseInt(e.target.value))}
                      className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !aiPrompt.trim()}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate Art'
                    )}
                  </Button>

                  {aiResponse && (
                    <Card className="border-border bg-card/80 mt-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold flex items-center justify-between">
                          <span>Result</span>
                          <Badge variant="secondary" className="text-xs">
                            {aiResponse.result?.styleApplied}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {aiResponse.result?.artDescription && (
                          <div className="text-xs text-muted-foreground">
                            {renderMarkdown(aiResponse.result.artDescription)}
                          </div>
                        )}

                        {Array.isArray(aiResponse.result?.colorPalette) && aiResponse.result.colorPalette.length > 0 && (
                          <div>
                            <div className="text-xs font-medium mb-2">Color Palette</div>
                            <div className="flex gap-1">
                              {aiResponse.result.colorPalette.map((color, i) => (
                                <div
                                  key={i}
                                  className="w-8 h-8 rounded border border-border cursor-pointer"
                                  style={{ backgroundColor: color }}
                                  onClick={() => setPrimaryColor(color)}
                                  title={color}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {aiResponse.result?.creativeSuggestion && (
                          <div className="bg-muted/50 p-2 rounded text-xs">
                            <div className="flex items-start gap-2">
                              <Info className="h-3 w-3 mt-0.5 flex-shrink-0 text-accent" />
                              <span className="text-muted-foreground">{aiResponse.result.creativeSuggestion}</span>
                            </div>
                          </div>
                        )}

                        {generatedImageUrl && !imageError && (
                          <div className="rounded overflow-hidden border border-border">
                            <img
                              src={generatedImageUrl}
                              alt="Generated artwork"
                              className="w-full h-auto object-contain max-h-48"
                              onError={() => setImageError(true)}
                            />
                          </div>
                        )}

                        {aiResponse.metadata && (
                          <div className="text-xs text-muted-foreground flex items-center justify-between pt-2 border-t border-border">
                            <span>{aiResponse.metadata.modelUsed}</span>
                            <span>{aiResponse.metadata.generationTime}ms</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Style Transfer Panel */}
              <TabsContent value="style" className="p-4 space-y-3">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs mb-2 block">Style Gallery</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {STYLE_GALLERY.map((style) => (
                        <button
                          key={style.name}
                          className={`aspect-square rounded border-2 ${selectedStyle === style.name ? 'border-primary' : 'border-border'} bg-muted hover:bg-muted/80 flex items-center justify-center text-xs font-medium transition-all`}
                          onClick={() => setSelectedStyle(style.name)}
                        >
                          {style.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Intensity</Label>
                      <span className="text-xs font-mono">{styleIntensity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={styleIntensity}
                      onChange={(e) => setStyleIntensity(parseInt(e.target.value))}
                      className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <Button
                    onClick={handleApplyStyle}
                    disabled={isGenerating || !selectedStyle}
                    className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      'Apply Style'
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>

          {/* Agent Status */}
          <div className="border-t border-border p-3 bg-card/80">
            <div className="flex items-center justify-between text-xs">
              <div>
                <div className="font-medium">AI Art Agent</div>
                <div className="text-muted-foreground font-mono text-[10px]">698c5fe2...</div>
              </div>
              <Badge className={`text-xs ${isGenerating ? 'bg-accent/20 text-accent' : 'bg-primary/20 text-primary'}`}>
                {isGenerating ? 'Generating' : 'Ready'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-96 bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Export Canvas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm mb-2 block">Format</Label>
                <Select defaultValue="png">
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="jpeg">JPEG</SelectItem>
                    <SelectItem value="svg">SVG</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Resolution</Label>
                <Select defaultValue="screen">
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="screen">Screen (800x600)</SelectItem>
                    <SelectItem value="print">Print (3000x2250)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-border"
                  onClick={() => setShowExportModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleExport}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
