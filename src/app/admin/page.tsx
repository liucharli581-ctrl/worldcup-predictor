"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Swords, RefreshCw, Database, BarChart3, Clock, Activity } from "lucide-react"

interface DataStatus {
  teams: number
  matches: { total: number; scheduled: number; completed: number }
  oddsRecords: number
  predictions: number
  reviews: number
  lastPredictionAt: string | null
  lastOddsUpdateAt: string | null
}

export default function AdminPage() {
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState("")

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/admin/data-status")
      const json = await res.json()
      if (json.success) setStatus(json.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    setMessage("同步中...")
    try {
      const res = await fetch("/api/admin/refresh-data", { method: "POST" })
      const json = await res.json()
      if (json.success) {
        setMessage(`同步完成 (${json.duration})`)
        await loadStatus()
      } else {
        setMessage(`失败: ${json.error}`)
      }
    } catch {
      setMessage("请求失败")
    } finally {
      setRefreshing(false)
    }
  }

  const fmt = (iso: string | null) => {
    if (!iso) return "从未"
    return new Date(iso).toLocaleString("zh-CN")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">管理后台</h1>
          <p className="text-sm text-muted-foreground">管理球队、比赛、数据同步</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "同步中..." : "立即同步数据"}
        </Button>
      </div>

      {message && (
        <div className={`rounded-lg p-3 text-sm ${message.includes("失败") ? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400" : "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"}`}>
          {message}
        </div>
      )}

      {/* 数据概览 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">球队</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.teams ?? "—"}</div>
            <p className="text-xs text-muted-foreground">48 支 / 12 组</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">比赛</CardTitle>
            <Swords className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.matches.total ?? "—"}</div>
            <p className="text-xs text-muted-foreground">
              未开始 {status?.matches.scheduled ?? 0} / 已结束 {status?.matches.completed ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">赔率数据</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.oddsRecords ?? "—"}</div>
            <p className="text-xs text-muted-foreground">
              最后更新: {fmt(status?.lastOddsUpdateAt ?? null)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">预测</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.predictions ?? "—"}</div>
            <p className="text-xs text-muted-foreground">
              最后生成: {fmt(status?.lastPredictionAt ?? null)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 数据管理入口 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/teams">
          <Card className="transition-colors hover:border-amber-300 hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-amber-500" />
                球队管理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">查看和编辑参赛球队信息</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/matches">
          <Card className="transition-colors hover:border-amber-300 hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Swords className="h-4 w-4 text-amber-500" />
                比赛管理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">管理赛程、录入比分、设置比赛状态</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/data">
          <Card className="transition-colors hover:border-amber-300 hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4 text-amber-500" />
                数据管理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">查看同步状态、手动触发数据更新</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
