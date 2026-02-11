'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Search, Plus, Trash2, Copy, ExternalLink } from 'lucide-react'

// Theme colors — extracted from Neon Cyberpunk HSL values
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

interface Project {
  id: string
  name: string
  thumbnail: string
  createdAt: string
  lastModified: string
  layers: number
}

const SAMPLE_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'Cosmic Nebula',
    thumbnail: 'https://example.com/generated-art-kandinsky-cosmic.png',
    createdAt: '2026-02-10T14:30:00Z',
    lastModified: '2026-02-11T09:15:00Z',
    layers: 5,
  },
  {
    id: '2',
    name: 'Geometric Dreams',
    thumbnail: 'https://example.com/generated-art-geometric-cool.png',
    createdAt: '2026-02-09T10:20:00Z',
    lastModified: '2026-02-10T16:45:00Z',
    layers: 3,
  },
  {
    id: '3',
    name: 'Sunset Flow',
    thumbnail: 'https://example.com/generated-art-warm-organic.png',
    createdAt: '2026-02-08T08:00:00Z',
    lastModified: '2026-02-09T12:30:00Z',
    layers: 4,
  },
]

export default function Home() {
  const router = useRouter()
  const [sampleData, setSampleData] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [projects, setProjects] = useState<Project[]>([])

  const displayProjects = sampleData ? SAMPLE_PROJECTS : projects
  const filteredProjects = displayProjects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleNewCanvas = () => {
    const newId = Date.now().toString()
    router.push(`/canvas/${newId}`)
  }

  const handleOpenProject = (id: string) => {
    router.push(`/canvas/${id}`)
  }

  const handleDuplicate = (project: Project) => {
    const newProject = {
      ...project,
      id: Date.now().toString(),
      name: `${project.name} (Copy)`,
      lastModified: new Date().toISOString(),
    }
    setProjects(prev => [newProject, ...prev])
  }

  const handleDelete = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div style={THEME_VARS} className="min-h-screen bg-background text-foreground">
      {/* Grid background pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border backdrop-blur-md bg-card/50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight font-mono">
                <span className="text-primary">ABSTRACT</span>
                <span className="text-secondary">CANVAS</span>
                <span className="text-accent ml-2">AI</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-1">AI-Powered Abstract Art Studio</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="sample-data"
                  checked={sampleData}
                  onCheckedChange={setSampleData}
                />
                <Label htmlFor="sample-data" className="text-sm cursor-pointer">Sample Data</Label>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Top Actions */}
          <div className="flex items-center justify-between mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-input border-border focus:ring-primary"
              />
            </div>
            <Button
              onClick={handleNewCanvas}
              className="ml-4 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-lg shadow-primary/25"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Canvas
            </Button>
          </div>

          {/* Projects Grid */}
          {displayProjects.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-muted mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
              <p className="text-muted-foreground mb-6">Create your first abstract canvas to get started</p>
              <Button
                onClick={handleNewCanvas}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create New Canvas
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="bg-card border-border overflow-hidden group hover:border-primary/50 transition-all">
                  <div
                    className="relative aspect-video bg-muted cursor-pointer overflow-hidden"
                    onClick={() => handleOpenProject(project.id)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-muted-foreground text-sm font-mono">Preview</div>
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <ExternalLink className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center justify-between">
                      <span className="truncate">{project.name}</span>
                      <Badge variant="secondary" className="ml-2 text-xs">{project.layers}L</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                      <span>Modified {formatDate(project.lastModified)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-border hover:bg-muted"
                        onClick={() => handleOpenProject(project.id)}
                      >
                        Open
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border hover:bg-muted"
                        onClick={() => handleDuplicate(project)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border hover:bg-destructive/20"
                        onClick={() => handleDelete(project.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Agent Info */}
          <Card className="mt-12 bg-card/50 border-border backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Powered By</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">AI Art Agent</div>
                  <div className="text-xs text-muted-foreground font-mono">698c5fe26b632a1e29d7675e</div>
                </div>
                <Badge className="bg-primary/20 text-primary border-primary/30">Active</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Generate abstract art with fluid organics, geometric patterns, and artistic style transfers
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
