"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Database, Clock, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface DataStatus {
  teams: number
  matches: { total: number; scheduled: number; completed: number }
  oddsRecords: number
  predictions: number
  reviews: number
  lastPredictionAt: string | null
  lastOddsUpdateAt: string | null
}

export default function AdminDataPage() {
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const load = async () => {
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
    load()
  }, [])

  const handleSync = async (type: "all" | "odds" | "predictions") => {
    setSyncing(true)
    setSyncResult(null)
    try {
      if (type === "all") {
        const res = await fetch("/api/admin/refresh-data", { method: "POST" })
        const json = await res.json()
        setSyncResult(json.success ? `✅ 同步完成 (${json.duration})` : `❌ ${json.error}`)
      } else if (type === "predictions") {
        const res = await fetch("/api/cron/generate-predictions")
        const json = await res.json()
        setSyncResult(json.success ? `✅ 预测生成完成 (${json.duration})` : `❌ ${json.error}`)
      }
      await load()
    } catch {
      setSyncResult("❌ 请求失败")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">数据管理</h1>
          <p className="text-sm text-muted-foreground">查看和同步比赛数据</p>
        </div>
      </div>

      {syncResult && (
        <div className="rounded-lg bg-muted p-3 text-sm">{syncResult}</div>
      )}

      {/* 自动同步配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-amber-500" />
            自动同步
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>赔率数据同步</span>
            <Badge>每日 06:00</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>比赛结果同步</span>
            <Badge>每日 06:00</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>批量预测生成</span>
            <Badge>每日 06:00</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            数据通过 The Odds API 自动同步到数据库，无需手动操作。
            点击下方按钮手动触发。
          </p>
        </CardContent>
      </Card>

      {/* 手动同步 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-amber-500" />
            手动同步
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => handleSync("all")} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
              完整同步
            </Button>
            <Button variant="outline" onClick={() => handleSync("predictions")} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
              仅生成预测
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 数据状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">当前数据</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          ) : status ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">球队</div>
                <div className="text-xl font-bold">{status.teams}</div>
              </div>
              <div>
                <div className="text-muted-foreground">比赛</div>
                <div className="text-xl font-bold">{status.matches.total}</div>
                <div className="text-xs text-muted-foreground">
                  {status.matches.scheduled} 未开始 / {status.matches.completed} 已结束
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">赔率记录</div>
                <div className="text-xl font-bold">{status.oddsRecords}</div>
              </div>
              <div>
                <div className="text-muted-foreground">预测</div>
                <div className="text-xl font-bold">{status.predictions}</div>
              </div>
              <div>
                <div className="text-muted-foreground">复盘</div>
                <div className="text-xl font-bold">{status.reviews}</div>
              </div>
              <div>
                <div className="text-muted-foreground">最后预测生成</div>
                <div className="text-sm">{status.lastPredictionAt ? new Date(status.lastPredictionAt).toLocaleString("zh-CN") : "从未"}</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">加载失败</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
