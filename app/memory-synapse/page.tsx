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
  const d3NeuralRef = useRef<HTMLDivElement>(null)
  const visNetworkRef = useRef<HTMLDivElement>(null)
  const cytoscapeNeuralRef = useRef<HTMLDivElement>(null)
  const cyNeuralRef = useRef<cytoscape.Core | null>(null)

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

  // D3.js + カスタムニューラル表現
  useEffect(() => {
    if (!d3NeuralRef.current || synapseData.nodes.length === 0) return

    const container = d3.select(d3NeuralRef.current)
    container.selectAll("*").remove()

    const width = 600
    const height = 400

    const svg = container.append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("background", "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)")

    // ニューラルネットワーク風のグラデーション定義
    const defs = svg.append("defs")
    
    // ニューロン用グラデーション
    const neuronGradient = defs.append("radialGradient")
      .attr("id", "neuronGradient")
      .attr("cx", "30%")
      .attr("cy", "30%")
    neuronGradient.append("stop").attr("offset", "0%").attr("stop-color", "#ff6b6b")
    neuronGradient.append("stop").attr("offset", "70%").attr("stop-color", "#4ecdc4")
    neuronGradient.append("stop").attr("offset", "100%").attr("stop-color", "#45b7d1")

    // シナプス用グラデーション
    const synapseGradient = defs.append("linearGradient")
      .attr("id", "synapseGradient")
    synapseGradient.append("stop").attr("offset", "0%").attr("stop-color", "#ff9ff3")
    synapseGradient.append("stop").attr("offset", "100%").attr("stop-color", "#54a0ff")

    const d3Nodes = synapseData.nodes.map(node => ({ ...node }))
    const d3Edges = synapseData.edges.map(edge => ({ ...edge }))

    const simulation = d3.forceSimulation(d3Nodes)
      .force("link", d3.forceLink(d3Edges).id((d: any) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30))

    // シナプス（エッジ）描画
    const synapses = svg.append("g")
      .selectAll("path")
      .data(d3Edges)
      .enter().append("path")
      .attr("fill", "none")
      .attr("stroke", "url(#synapseGradient)")
      .attr("stroke-width", (d: any) => Math.sqrt(d.weight) * 3 + 2)
      .attr("opacity", 0.8)
      .style("filter", "drop-shadow(0px 0px 6px #54a0ff)")

    // ニューロン（ノード）描画
    const neurons = svg.append("g")
      .selectAll("g")
      .data(d3Nodes)
      .enter().append("g")
      .style("cursor", "pointer")
      .call(d3.drag<any, any>()
        .on("start", (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on("drag", (event, d: any) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on("end", (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null
          d.fy = null
        }))

    // ニューロン本体
    neurons.append("circle")
      .attr("r", (d: any) => Math.sqrt(d.freq) * 8 + 15)
      .attr("fill", "url(#neuronGradient)")
      .attr("stroke", "#fff")
      .attr("stroke-width", 3)
      .style("filter", "drop-shadow(0px 0px 10px #ff6b6b)")

    // 樹状突起（dendrites）
    neurons.each(function(d: any) {
      const neuron = d3.select(this)
      const dendriteCount = Math.min(d.freq * 2 + 3, 8)
      
      for (let i = 0; i < dendriteCount; i++) {
        const angle = (i / dendriteCount) * 2 * Math.PI
        const length = 20 + Math.random() * 15
        
        neuron.append("line")
          .attr("x1", 0)
          .attr("y1", 0)
          .attr("x2", Math.cos(angle) * length)
          .attr("y2", Math.sin(angle) * length)
          .attr("stroke", "#ff9ff3")
          .attr("stroke-width", 2)
          .attr("opacity", 0.7)
      }
    })

    // ニューロンラベル
    neurons.append("text")
      .text((d: any) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", 5)
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .attr("fill", "#fff")
      .style("text-shadow", "2px 2px 4px rgba(0,0,0,0.8)")

    // 活性化パルスアニメーション
    const addPulse = () => {
      neurons.append("circle")
        .attr("r", (d: any) => Math.sqrt(d.freq) * 8 + 15)
        .attr("fill", "none")
        .attr("stroke", "#ff6b6b")
        .attr("stroke-width", 3)
        .attr("opacity", 1)
        .transition()
        .duration(2000)
        .attr("r", (d: any) => Math.sqrt(d.freq) * 12 + 25)
        .attr("opacity", 0)
        .remove()
    }

    const pulseInterval = setInterval(addPulse, 3000)

    // シミュレーション更新
    simulation.on("tick", () => {
      synapses.attr("d", (d: any) => {
        const dx = d.target.x - d.source.x
        const dy = d.target.y - d.source.y
        const dr = Math.sqrt(dx * dx + dy * dy) * 0.3
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`
      })

      neurons.attr("transform", (d: any) => `translate(${d.x},${d.y})`)
    })

    return () => {
      clearInterval(pulseInterval)
    }

  }, [synapseData])

  // Vis.js Network (脳科学向け)
  useEffect(() => {
    if (!visNetworkRef.current || synapseData.nodes.length === 0) return

    const initVisNetwork = async () => {
      try {
        const { Network } = await import('vis-network/standalone')
        const { DataSet } = await import('vis-data/standalone')

        // ニューロン風ノードデータ
        const nodes = new DataSet(synapseData.nodes.map(node => ({
          id: node.id,
          label: node.label,
          size: node.freq * 15 + 20,
          color: {
            background: `hsl(${(node.freq * 60) % 360}, 80%, 60%)`,
            border: '#ffffff',
            highlight: {
              background: `hsl(${(node.freq * 60) % 360}, 90%, 70%)`,
              border: '#ff6b6b'
            }
          },
          font: {
            color: '#ffffff',
            size: 14,
            face: 'Arial',
            strokeWidth: 2,
            strokeColor: '#000000'
          },
          shadow: {
            enabled: true,
            color: 'rgba(0,0,0,0.5)',
            size: 10,
            x: 3,
            y: 3
          },
          shape: 'dot'
        })))

        // シナプス風エッジデータ
        const edges = new DataSet(synapseData.edges.map((edge, index) => ({
          id: index,
          from: typeof edge.source === 'string' ? edge.source : String(edge.source),
          to: typeof edge.target === 'string' ? edge.target : String(edge.target),
          width: edge.weight * 3 + 2,
          color: {
            color: `hsl(${(edge.weight * 90) % 360}, 70%, 50%)`,
            highlight: '#ff6b6b',
            opacity: 0.8
          },
          smooth: {
            enabled: true,
            type: 'curvedCW',
            roundness: 0.2
          },
          arrows: {
            to: {
              enabled: true,
              scaleFactor: 0.8
            }
          },
          shadow: {
            enabled: true,
            color: 'rgba(0,0,0,0.3)',
            size: 5,
            x: 2,
            y: 2
          }
        })))

        const data = { nodes, edges }

        const options = {
          physics: {
            enabled: true,
            solver: 'forceAtlas2Based',
            forceAtlas2Based: {
              gravitationalConstant: -50,
              centralGravity: 0.01,
              springLength: 200,
              springConstant: 0.08,
              damping: 0.4,
              avoidOverlap: 1
            },
            maxVelocity: 50,
            minVelocity: 0.1,
            timestep: 0.35,
            adaptiveTimestep: true,
            stabilization: {
              enabled: true,
              iterations: 1000,
              updateInterval: 25
            }
          },
          interaction: {
            dragNodes: true,
            dragView: true,
            zoomView: true,
            selectConnectedEdges: true,
            hover: true,
            hoverConnectedEdges: true,
            tooltipDelay: 200
          },
          layout: {
            improvedLayout: true,
            clusterThreshold: 150
          }
        }

        if (visNetworkRef.current) {
          visNetworkRef.current.innerHTML = ''
          const network = new Network(visNetworkRef.current, data, options)

          // ニューロン活性化エフェクト
          network.on("click", (params) => {
            if (params.nodes.length > 0) {
              const nodeId = params.nodes[0]
              const connectedEdges = network.getConnectedEdges(nodeId)
              
              // 一時的にエッジを光らせる
              const edgeUpdates = connectedEdges.map(edgeId => ({
                id: Number(edgeId),
                color: { color: '#ff6b6b', opacity: 1.0 }
              }))
              edges.update(edgeUpdates)

              setTimeout(() => {
                const originalUpdates = connectedEdges.map(edgeId => {
                  const originalEdge = synapseData.edges[Number(edgeId)]
                  return {
                    id: Number(edgeId),
                    color: {
                      color: `hsl(${(originalEdge.weight * 90) % 360}, 70%, 50%)`,
                      opacity: 0.8
                    }
                  }
                })
                edges.update(originalUpdates)
              }, 1000)
            }
          })
        }

      } catch (error) {
        console.error('Vis.js Network initialization error:', error)
        if (visNetworkRef.current) {
          visNetworkRef.current.innerHTML = `
            <div class="flex items-center justify-center h-96 text-gray-500">
              <div class="text-center">
                <p>🧠 Vis.js Network</p>
                <p class="text-sm mt-2">ライブラリ読み込み中...</p>
              </div>
            </div>
          `
        }
      }
    }

    initVisNetwork()

  }, [synapseData])

  // Cytoscape.js + 神経科学エクステンション
  useEffect(() => {
    if (!cytoscapeNeuralRef.current || synapseData.nodes.length === 0) return

    if (cyNeuralRef.current) {
      cyNeuralRef.current.destroy()
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
          weight: edge.weight
        }
      }))
    ]

    cyNeuralRef.current = cytoscape({
      container: cytoscapeNeuralRef.current,
      elements: cytoscapeElements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'mapData(freq, 1, 10, #4ecdc4, #ff6b6b)',
            'label': 'data(label)',
            'width': 'mapData(freq, 1, 10, 40, 100)',
            'height': 'mapData(freq, 1, 10, 40, 100)',
            'font-size': '14px',
            'font-weight': 'bold',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#ffffff',
            'text-outline-width': 2,
            'text-outline-color': '#000000',
            'border-width': 4,
            'border-color': '#ffffff',
            'shape': 'ellipse'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 'mapData(weight, 1, 10, 4, 20)',
            'line-color': 'mapData(weight, 1, 10, #54a0ff, #ff6b6b)',
            'target-arrow-color': 'mapData(weight, 1, 10, #54a0ff, #ff6b6b)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'control-point-step-size': 40,
            'opacity': 0.9
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#ff6b6b',
            'border-width': 6
          }
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#ff6b6b',
            'target-arrow-color': '#ff6b6b',
            'width': 'mapData(weight, 1, 10, 6, 25)',
            'opacity': 1.0
          }
        }
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 2000,
        nodeRepulsion: 8000,
        nodeOverlap: 20,
        idealEdgeLength: 150,
        edgeElasticity: 200,
        nestingFactor: 1.2,
        gravity: 0.25,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0
      } as any
    })

    // ニューロン活性化エフェクト
    cyNeuralRef.current.on('tap', 'node', function(evt) {
      const node = evt.target
      const connectedEdges = node.connectedEdges()
      
      // パルス効果
      node.animate({
        style: {
          'width': node.style('width') * 1.5,
          'height': node.style('height') * 1.5
        }
      }, {
        duration: 500,
        complete: () => {
          node.animate({
            style: {
              'width': 'mapData(freq, 1, 10, 40, 100)',
              'height': 'mapData(freq, 1, 10, 40, 100)'
            }
          }, { duration: 500 })
        }
      })

      // 接続エッジの活性化
      connectedEdges.animate({
        style: {
          'line-color': '#ff6b6b',
          'target-arrow-color': '#ff6b6b',
          'opacity': 1.0,
          'width': 'mapData(weight, 1, 10, 8, 30)'
        }
      }, {
        duration: 1000,
        complete: () => {
          connectedEdges.animate({
            style: {
              'line-color': 'mapData(weight, 1, 10, #54a0ff, #ff6b6b)',
              'target-arrow-color': 'mapData(weight, 1, 10, #54a0ff, #ff6b6b)',
              'opacity': 0.9,
              'width': 'mapData(weight, 1, 10, 4, 20)'
            }
          }, { duration: 1000 })
        }
      })

      console.log('ニューロン活性化:', node.data())
    })

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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>🧠 D3.js ニューラルネットワーク</CardTitle>
            <p className="text-sm text-gray-600">
              ニューロン風ノード + 樹状突起 + 活性化パルス
            </p>
          </CardHeader>
          <CardContent>
            <div 
              ref={d3NeuralRef}
              className="w-full h-96 border rounded-lg"
              style={{ minHeight: '400px' }}
            />
            <p className="text-sm text-gray-600 mt-2">
              🔬 ドラッグ可能、パルスアニメーション、曲線シナプス
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🌐 Vis.js 脳科学ネットワーク</CardTitle>
            <p className="text-sm text-gray-600">
              物理エンジン + インタラクティブ操作 + 神経活性化
            </p>
          </CardHeader>
          <CardContent>
            <div 
              ref={visNetworkRef}
              className="w-full h-96 border rounded-lg bg-gray-900"
              style={{ minHeight: '400px' }}
            />
            <p className="text-sm text-gray-600 mt-2">
              ⚡ クリックで神経活性化、ズーム・パン対応
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🔬 Cytoscape.js 神経科学</CardTitle>
            <p className="text-sm text-gray-600">
              グラデーション + シャドウ + アニメーション効果
            </p>
          </CardHeader>
          <CardContent>
            <div 
              ref={cytoscapeNeuralRef}
              className="w-full h-96 border rounded-lg bg-gray-800"
              style={{ minHeight: '400px' }}
            />
            <p className="text-sm text-gray-600 mt-2">
              🎭 ニューロン活性化アニメーション、高品質レンダリング
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 