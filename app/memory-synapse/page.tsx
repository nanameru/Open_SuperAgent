"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import * as d3 from 'd3'
import cytoscape from 'cytoscape'
import * as THREE from 'three'

interface SynapseNode {
  id: string
  label: string
  freq: number
  x?: number
  y?: number
  z?: number
}

interface SynapseEdge {
  source: string | any
  target: string | any
  weight: number
}

interface SynapseData {
  meta: {
    generated_at: string
    description: string
  }
  nodes: SynapseNode[]
  edges: SynapseEdge[]
}

export default function MemorySynapsePage() {
  const [query, setQuery] = useState('')
  const [synapseData, setSynapseData] = useState<SynapseData>({
    meta: {
      generated_at: new Date().toISOString(),
      description: 'Chatbot質問ログから抽出したキーワード同士の脳内シナプス'
    },
    nodes: [],
    edges: []
  })
  const [yamlOutput, setYamlOutput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const cytoscapeRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const forceGraph3DRef = useRef<HTMLDivElement>(null)
  const threeJsRef = useRef<HTMLDivElement>(null)

  // キーワード抽出とシナプス更新
  const processQuery = async () => {
    if (!query.trim()) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/extract-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      const keywords = data.keywords || []
      
      if (keywords.length === 0) {
        const fallbackKeywords = query
          .split(/[\s、。！？\n]+/)
          .filter(word => word.length > 1 && word.length < 10)
          .slice(0, 5)
        updateSynapseData(fallbackKeywords)
      } else {
        updateSynapseData(keywords)
      }
      
      setQuery('')
    } catch (error) {
      console.error('キーワード抽出エラー:', error)
      
      const fallbackKeywords = query
        .split(/[\s、。！？\n]+/)
        .filter(word => word.length > 1 && word.length < 10)
        .slice(0, 5)
      
      if (fallbackKeywords.length > 0) {
        updateSynapseData(fallbackKeywords)
        setQuery('')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // シナプスデータの更新
  const updateSynapseData = (keywords: string[]) => {
    setSynapseData(prev => {
      const newNodes = [...prev.nodes]
      const newEdges = [...prev.edges]

      keywords.forEach(keyword => {
        const existingNode = newNodes.find(n => n.id === keyword)
        if (existingNode) {
          existingNode.freq += 1
        } else {
          newNodes.push({
            id: keyword,
            label: keyword,
            freq: 1
          })
        }
      })

      for (let i = 0; i < keywords.length; i++) {
        for (let j = i + 1; j < keywords.length; j++) {
          const source = keywords[i]
          const target = keywords[j]
          const existingEdge = newEdges.find(e => 
            (e.source === source && e.target === target) ||
            (e.source === target && e.target === source)
          )
          
          if (existingEdge) {
            existingEdge.weight += 1
          } else {
            newEdges.push({ source, target, weight: 1 })
          }
        }
      }

      return {
        ...prev,
        meta: { ...prev.meta, generated_at: new Date().toISOString() },
        nodes: newNodes,
        edges: newEdges
      }
    })
  }

  // YAML生成
  useEffect(() => {
    const yaml = `meta:
  generated_at: ${synapseData.meta.generated_at}
  description: >-
    ${synapseData.meta.description}

nodes:
${synapseData.nodes.map(node => 
  `  - id: ${node.id}
    label: ${node.label}
    freq: ${node.freq}`
).join('\n')}

edges:
${synapseData.edges.map(edge => 
  `  - source: ${edge.source}
    target: ${edge.target}
    weight: ${edge.weight}`
).join('\n')}`
    
    setYamlOutput(yaml)
  }, [synapseData])

  // Cytoscape.js可視化
  useEffect(() => {
    if (!cytoscapeRef.current || synapseData.nodes.length === 0) return

    if (cyRef.current) {
      cyRef.current.destroy()
    }

    const cytoscapeElements = [
      ...synapseData.nodes.map(node => ({
        data: {
          id: node.id,
          label: node.label,
          freq: node.freq
        }
      })),
      ...synapseData.edges.map((edge, index) => ({
        data: {
          id: `edge-${index}`,
          source: typeof edge.source === 'string' ? edge.source : String(edge.source),
          target: typeof edge.target === 'string' ? edge.target : String(edge.target),
          weight: edge.weight,
          label: `${edge.weight}`
        }
      }))
    ]

    cyRef.current = cytoscape({
      container: cytoscapeRef.current,
      elements: cytoscapeElements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#69b3ff',
            'label': 'data(label)',
            'width': 'mapData(freq, 1, 10, 20, 80)',
            'height': 'mapData(freq, 1, 10, 20, 80)',
            'font-size': '12px',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#000',
            'border-width': 2,
            'border-color': '#fff'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 'mapData(weight, 1, 10, 3, 15)',
            'line-color': '#666',
            'target-arrow-color': '#666',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'opacity': 0.8,
            'label': 'data(label)',
            'font-size': 10,
            'text-rotation': 'autorotate',
            'text-margin-y': -10,
            'color': '#666'
          } as any
        }
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 1000
      } as any
    })

    cyRef.current.on('tap', 'node', function(evt) {
      const node = evt.target
      console.log('Clicked node:', node.data())
    })

    cyRef.current.on('tap', 'edge', function(evt) {
      const edge = evt.target
      console.log('Clicked edge:', edge.data())
    })

  }, [synapseData])

  // 3D Force Graph可視化
  useEffect(() => {
    if (!forceGraph3DRef.current || synapseData.nodes.length === 0) return

    const initForceGraph3D = async () => {
      try {
        const ForceGraph3D = (await import('3d-force-graph')).default
        
        const graph3DData = {
          nodes: synapseData.nodes.map(node => ({
            id: node.id,
            name: node.label,
            val: node.freq * 3,
            color: `hsl(${(node.freq * 30) % 360}, 70%, 60%)`
          })),
          links: synapseData.edges.map(edge => ({
            source: typeof edge.source === 'string' ? edge.source : String(edge.source),
            target: typeof edge.target === 'string' ? edge.target : String(edge.target),
            value: edge.weight * 2,
            color: `rgba(${255 - edge.weight * 20}, ${100 + edge.weight * 30}, 255, ${Math.min(edge.weight * 0.4 + 0.3, 1)})`,
            label: `重み: ${edge.weight}`
          }))
        }

        if (forceGraph3DRef.current) {
          forceGraph3DRef.current.innerHTML = ''
        }

        const graphInstance = new ForceGraph3D(forceGraph3DRef.current!)
        graphInstance
          .graphData(graph3DData)
          .nodeLabel('name')
          .nodeVal('val')
          .nodeColor('color')
          .linkWidth('value')
          .linkColor('color')
          .linkOpacity(0.8)
          .linkDirectionalArrowLength(6)
          .linkDirectionalArrowRelPos(1)
          .linkDirectionalArrowColor('color')
          .linkLabel('label')
          .onNodeClick((node: any) => {
            console.log('3D Node clicked:', node)
          })
          .onLinkClick((link: any) => {
            console.log('3D Link clicked:', link)
          })
          .width(600)
          .height(400)

      } catch (error) {
        console.error('3D Force Graph initialization error:', error)
        if (forceGraph3DRef.current) {
          forceGraph3DRef.current.innerHTML = `
            <div class="flex items-center justify-center h-96 text-gray-500">
              <div class="text-center">
                <p>🌌 3D Force Graph</p>
                <p class="text-sm mt-2">ライブラリ読み込み中...</p>
              </div>
            </div>
          `
        }
      }
    }

    initForceGraph3D()

  }, [synapseData])

  // D3.js可視化
  useEffect(() => {
    if (!svgRef.current || synapseData.nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const width = 600
    const height = 400

    const d3Nodes = synapseData.nodes.map(node => ({ ...node }))
    const d3Edges = synapseData.edges.map(edge => ({ ...edge }))

    const simulation = d3.forceSimulation(d3Nodes)
      .force("link", d3.forceLink(d3Edges).id((d: any) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))

    const link = svg.append("g")
      .selectAll("line")
      .data(d3Edges)
      .enter().append("line")
      .attr("stroke", (d: any) => `hsl(${d.weight * 60}, 70%, 50%)`)
      .attr("stroke-opacity", (d: any) => Math.min(d.weight * 0.3 + 0.4, 1))
      .attr("stroke-width", (d: any) => Math.sqrt(d.weight) * 3 + 1)
      .attr("marker-end", "url(#arrowhead)")

    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#666")

    const linkLabel = svg.append("g")
      .selectAll("text")
      .data(d3Edges)
      .enter().append("text")
      .text((d: any) => d.weight)
      .attr("font-size", 10)
      .attr("text-anchor", "middle")
      .attr("fill", "#666")
      .attr("dy", -2)

    const node = svg.append("g")
      .selectAll("circle")
      .data(d3Nodes)
      .enter().append("circle")
      .attr("r", (d: any) => Math.sqrt(d.freq) * 6 + 8)
      .attr("fill", (d: any) => `hsl(${d.freq * 40}, 70%, 60%)`)
      .attr("stroke", "#fff")
      .attr("stroke-width", 3)

    const label = svg.append("g")
      .selectAll("text")
      .data(d3Nodes)
      .enter().append("text")
      .text((d: any) => d.label)
      .attr("font-size", 12)
      .attr("font-weight", "bold")
      .attr("text-anchor", "middle")
      .attr("dy", 4)
      .attr("fill", "#333")

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y)

      linkLabel
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2)

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y)

      label
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y)
    })

  }, [synapseData])

  // Three.js カスタム3D可視化
  useEffect(() => {
    if (!threeJsRef.current || synapseData.nodes.length === 0) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf8f9fa)
    
    const camera = new THREE.PerspectiveCamera(75, 600 / 400, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(600, 400)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    threeJsRef.current.innerHTML = ''
    threeJsRef.current.appendChild(renderer.domElement)

    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    scene.add(ambientLight)
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(50, 50, 50)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    const positions = new Map<string, { x: number, y: number, z: number }>()

    synapseData.nodes.forEach((node, index) => {
      const radius = 60
      const phi = Math.acos(-1 + (2 * index) / synapseData.nodes.length)
      const theta = Math.sqrt(synapseData.nodes.length * Math.PI) * phi

      const x = radius * Math.cos(theta) * Math.sin(phi)
      const y = radius * Math.sin(theta) * Math.sin(phi)
      const z = radius * Math.cos(phi)

      positions.set(node.id, { x, y, z })

      const geometry = new THREE.SphereGeometry(Math.sqrt(node.freq) * 3 + 3, 16, 16)
      const material = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color().setHSL((node.freq * 0.1) % 1, 0.7, 0.6)
      })
      const sphere = new THREE.Mesh(geometry, material)
      sphere.position.set(x, y, z)
      sphere.castShadow = true
      sphere.receiveShadow = true
      scene.add(sphere)

      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!
      canvas.width = 256
      canvas.height = 64
      context.font = '20px Arial'
      context.fillStyle = 'white'
      context.textAlign = 'center'
      context.fillText(node.label, 128, 40)

      const texture = new THREE.CanvasTexture(canvas)
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture })
      const sprite = new THREE.Sprite(spriteMaterial)
      sprite.position.set(x, y + 20, z)
      sprite.scale.set(25, 6, 1)
      scene.add(sprite)
    })

    synapseData.edges.forEach(edge => {
      const sourcePos = positions.get(typeof edge.source === 'string' ? edge.source : String(edge.source))
      const targetPos = positions.get(typeof edge.target === 'string' ? edge.target : String(edge.target))

      if (sourcePos && targetPos) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(sourcePos.x, sourcePos.y, sourcePos.z),
          new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z)
        ])
        const material = new THREE.LineBasicMaterial({ 
          color: new THREE.Color().setHSL((edge.weight * 0.2) % 1, 0.8, 0.5),
          opacity: Math.min(edge.weight * 0.4 + 0.3, 1),
          transparent: true,
          linewidth: edge.weight * 2
        })
        const line = new THREE.Line(geometry, material)
        scene.add(line)

        const midX = (sourcePos.x + targetPos.x) / 2
        const midY = (sourcePos.y + targetPos.y) / 2
        const midZ = (sourcePos.z + targetPos.z) / 2

        const labelCanvas = document.createElement('canvas')
        const labelContext = labelCanvas.getContext('2d')!
        labelCanvas.width = 64
        labelCanvas.height = 32
        labelContext.font = '16px Arial'
        labelContext.fillStyle = 'yellow'
        labelContext.textAlign = 'center'
        labelContext.fillText(String(edge.weight), 32, 20)

        const labelTexture = new THREE.CanvasTexture(labelCanvas)
        const labelMaterial = new THREE.SpriteMaterial({ map: labelTexture })
        const labelSprite = new THREE.Sprite(labelMaterial)
        labelSprite.position.set(midX, midY, midZ)
        labelSprite.scale.set(8, 4, 1)
        scene.add(labelSprite)
      }
    })

    camera.position.set(120, 120, 120)
    camera.lookAt(0, 0, 0)

    let animationId: number
    const animate = () => {
      animationId = requestAnimationFrame(animate)
      scene.rotation.y += 0.003
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
      renderer.dispose()
    }

  }, [synapseData])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">🧠 YAML記憶装置</h1>
        <Badge variant="outline">
          ノード: {synapseData.nodes.length} | エッジ: {synapseData.edges.length}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>💭 思考入力</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="何か文字を入力してください..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && processQuery()}
              />
              <Button 
                onClick={processQuery} 
                disabled={isLoading || !query.trim()}
              >
                {isLoading ? '処理中...' : '分析'}
              </Button>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">最近のキーワード:</h3>
              <div className="flex flex-wrap gap-1">
                {synapseData.nodes
                  .sort((a, b) => b.freq - a.freq)
                  .slice(0, 10)
                  .map(node => (
                    <Badge key={node.id} variant="secondary">
                      {node.label} ({node.freq})
                    </Badge>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📄 YAML出力</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={yamlOutput}
              readOnly
              className="font-mono text-xs h-64"
              placeholder="YAMLデータがここに表示されます..."
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>🕸️ Cytoscape.js COSE Layout (2D)</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              ref={cytoscapeRef}
              className="w-full h-96 border rounded-lg bg-gray-50"
              style={{ minHeight: '400px' }}
            />
            <p className="text-sm text-gray-600 mt-2">
              グラフ理論ベースレイアウト（クリック可能）
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🎯 D3.js Force Layout (2D)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <svg
                ref={svgRef}
                width={600}
                height={400}
                className="border rounded-lg bg-gray-50"
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              物理シミュレーション型レイアウト
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>🌌 3D Force Graph</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              ref={forceGraph3DRef}
              className="w-full h-96 border rounded-lg bg-gray-900"
              style={{ minHeight: '400px' }}
            />
            <p className="text-sm text-gray-600 mt-2">
              3D物理シミュレーション（マウスで回転・ズーム可能）
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🎭 Three.js Custom 3D</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              ref={threeJsRef}
              className="w-full h-96 border rounded-lg bg-gray-100"
              style={{ minHeight: '400px' }}
            />
            <p className="text-sm text-gray-600 mt-2">
              カスタム3Dレンダリング（自動回転）
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 