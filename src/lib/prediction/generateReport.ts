import type { Team } from "@/generated/prisma"
import type { MarketAnalysis, TeamScore } from "./types"

export function generateReport(params: {
  homeTeam: Team
  awayTeam: Team
  homeScore: TeamScore
  awayScore: TeamScore
  marketAnalysis: MarketAnalysis
  homeWinProbability: number
  drawProbability: number
  awayWinProbability: number
  mainDirection: string
  riskLevel: string
  riskReasons: string[]
}): string {
  const lines: string[] = []

  lines.push(`比赛：${params.homeTeam.name} vs ${params.awayTeam.name}`)
  lines.push("")

  lines.push("一、球队基本面")
  if (params.homeScore.baseScore > params.awayScore.baseScore) {
    const diff = params.homeScore.baseScore - params.awayScore.baseScore
    lines.push(
      `${params.homeTeam.name}综合实力占优，评分高出${diff}分。`
    )
  } else if (params.awayScore.baseScore > params.homeScore.baseScore) {
    const diff = params.awayScore.baseScore - params.homeScore.baseScore
    lines.push(
      `${params.awayTeam.name}综合实力占优，评分高出${diff}分。`
    )
  } else {
    lines.push("双方综合实力相当。")
  }

  if (
    params.homeTeam.fifaRanking &&
    params.awayTeam.fifaRanking &&
    params.homeTeam.fifaRanking < params.awayTeam.fifaRanking
  ) {
    lines.push(
      `${params.homeTeam.name}FIFA排名第${params.homeTeam.fifaRanking}，高于${params.awayTeam.name}的第${params.awayTeam.fifaRanking}位。`
    )
  }

  lines.push("")

  lines.push("二、赔率市场面")
  const { marketAnalysis: m } = params

  if (m.homeDown > m.homeUp) {
    lines.push(
      `${m.homeDown}家机构主胜赔率下降，${m.homeUp}家上升，市场对主队方向有一定信心。`
    )
  } else if (m.homeUp > m.homeDown) {
    lines.push(
      `${m.homeUp}家机构主胜赔率上升，${m.homeDown}家下降，主队方向热度有所减退。`
    )
  }

  if (m.drawUp > m.drawDown) {
    lines.push(
      `${m.drawUp}家机构平局赔率上升，平局热度下降。`
    )
  } else if (m.drawDown > m.drawUp) {
    lines.push(
      `${m.drawDown}家机构平局赔率下降，平局方向需关注。`
    )
  }

  if (m.awayDown > m.awayUp) {
    lines.push(
      `${m.awayDown}家机构客胜赔率下降，客队方向有资金流入迹象。`
    )
  } else {
    lines.push("客胜赔率整体仍高，冷门信号不明显。")
  }

  lines.push("")

  lines.push("三、综合预测")
  lines.push(`主胜概率：${params.homeWinProbability}%`)
  lines.push(`平局概率：${params.drawProbability}%`)
  lines.push(`客胜概率：${params.awayWinProbability}%`)
  lines.push(
    `综合方向：${params.mainDirection === "home_win" ? "主队占优" : params.mainDirection === "away_win" ? "客队占优" : "倾向于平局"}`
  )
  lines.push("")

  lines.push("四、风险等级")
  const riskLabels: Record<string, string> = {
    low: "低风险",
    medium_low: "中低风险",
    medium: "中等风险",
    medium_high: "中高风险",
    high: "高风险",
    extreme: "极高风险",
  }
  lines.push(riskLabels[params.riskLevel] || params.riskLevel)
  lines.push("")

  lines.push("五、主要风险因素")
  for (const reason of params.riskReasons) {
    lines.push(`- ${reason}`)
  }
  lines.push("")

  lines.push("六、说明")
  lines.push("本分析仅基于历史数据和赔率市场信号，不构成任何建议。")
  lines.push("足球比赛存在不确定性，实际结果可能与分析结果不同。")

  return lines.join("\n")
}
