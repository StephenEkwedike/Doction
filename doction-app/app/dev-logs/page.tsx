'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Loader2, RefreshCw, Trash2, Download } from 'lucide-react'

interface LogEntry {
  timestamp: string
  level: string
  category: string
  message: string
  data?: any
}

interface LogStats {
  [category: string]: {
    fileCount: number
    latestFile: string
    totalSize: number
  }
}

export default function DevLogsPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [stats, setStats] = useState<LogStats>({})
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState('api')
  const [level, setLevel] = useState('')
  const [lines, setLines] = useState('100')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const logCategories = ['api', 'chat', 'providers', 'auth', 'database', 'errors', 'performance']
  const logLevels = ['', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        category,
        date,
        lines,
        ...(level && { level })
      })
      
      const response = await fetch(`/api/logs?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        setLogs(data.logs)
        setStats(data.stats)
      } else {
        console.error('Failed to fetch logs:', data)
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    }
    setLoading(false)
  }

  const cleanupLogs = async (daysToKeep: number = 30) => {
    try {
      const response = await fetch('/api/logs/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysToKeep })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        alert(`Cleanup completed: ${data.message}`)
        fetchLogs() // Refresh logs after cleanup
      } else {
        alert(`Cleanup failed: ${data.error}`)
      }
    } catch (error) {
      alert(`Cleanup failed: ${error}`)
    }
  }

  const downloadLogs = () => {
    const logContent = logs.join('\n')
    const blob = new Blob([logContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${category}-${date}.log`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatLogLine = (line: string) => {
    // Parse log line to extract timestamp, level, category, etc.
    const match = line.match(/\[([^\]]+)\] \[([^\]]+)\] \[([^\]]+)\](.*)/)
    
    if (!match) return { raw: line, level: 'INFO', category: 'unknown' }
    
    const [, timestamp, level, category, message] = match
    return { timestamp, level, category, message: message.trim(), raw: line }
  }

  const getLevelColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'ERROR': return 'bg-red-100 text-red-800'
      case 'WARN': return 'bg-yellow-100 text-yellow-800'
      case 'INFO': return 'bg-blue-100 text-blue-800'
      case 'DEBUG': return 'bg-purple-100 text-purple-800'
      case 'TRACE': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [category, level, lines, date])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Developer Logs Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor application logs and debug issues</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={fetchLogs} disabled={loading} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={downloadLogs} disabled={logs.length === 0} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button 
            onClick={() => cleanupLogs(30)} 
            variant="outline"
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Cleanup (30d+)
          </Button>
        </div>
      </div>

      {/* Log Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(stats).map(([cat, stat]) => (
          <Card key={cat}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium capitalize">{cat}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.fileCount}</div>
              <div className="text-xs text-gray-600">
                Files • {Math.round(stat.totalSize / 1024 / 1024 * 100) / 100} MB
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Log Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {logCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Level</label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  {logLevels.map(lvl => (
                    <SelectItem key={lvl} value={lvl}>
                      {lvl || 'All levels'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Date</label>
              <Input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Lines</label>
              <Select value={lines} onValueChange={setLines}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                  <SelectItem value="1000">1000</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button onClick={fetchLogs} disabled={loading} className="w-full">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Log Entries ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No logs found for the selected criteria
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((line, index) => {
                const parsed = formatLogLine(line)
                return (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg font-mono text-sm">
                    <div className="flex items-start gap-2">
                      <Badge className={getLevelColor(parsed.level)}>
                        {parsed.level}
                      </Badge>
                      {parsed.category !== 'unknown' && (
                        <Badge variant="outline">
                          {parsed.category}
                        </Badge>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 mb-1">
                          {parsed.timestamp}
                        </div>
                        <div className="break-words">
                          {parsed.message || parsed.raw}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}