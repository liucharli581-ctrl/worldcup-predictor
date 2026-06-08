"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClipboardCheck } from "lucide-react"

interface Review {
  id: string
  predictionHit: boolean
  actualResult: string
  predictedResult: string
  probabilityError: number
  reviewSummary: string
  createdAt: string
  match: {
    id: string
    homeTeam: { id: string; name: string }
    awayTeam: { id: string; name: string }
  }
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/reviews")
      .then((r) => r.json())
      .then((res) => setReviews(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const resultLabel = (r: string) => {
    const map: Record<string, string> = {
      home_win: "主胜",
      away_win: "客胜",
      draw: "平局",
    }
    return map[r] ?? r
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">复盘记录</h1>
        <p className="text-muted-foreground">查看历史预测复盘结果</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">加载中...</p>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12">
            <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">暂无复盘记录</p>
            <p className="text-xs text-muted-foreground">
              在比赛详情页提交实际比分后会自动创建复盘
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Link key={r.id} href={`/matches/${r.match.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">
                        {r.match.homeTeam.name} vs {r.match.awayTeam.name}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          预测: {resultLabel(r.predictedResult)} | 实际: {resultLabel(r.actualResult)}
                        </span>
                        <span>概率误差: {r.probabilityError}%</span>
                      </div>
                    </div>
                    <Badge variant={r.predictionHit ? "default" : "destructive"}>
                      {r.predictionHit ? "命中" : "未命中"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
