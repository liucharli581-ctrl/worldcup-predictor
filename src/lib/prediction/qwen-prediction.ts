interface QwenPredictionResult {
  homeWinProbability: number
  drawProbability: number
  awayWinProbability: number
  predictedHomeScore: number
  predictedAwayScore: number
  confidence: "high" | "medium" | "low"
  analysis: string
}

interface QwenInput {
  homeTeam: { name: string; fifaRanking: number | null; eloRating: number | null }
  awayTeam: { name: string; fifaRanking: number | null; eloRating: number | null }
  matchStage: string | null
}

export async function generateQwenPrediction(
  input: QwenInput
): Promise<QwenPredictionResult | null> {
  const apiKey = process.env.DASHSCOPE_API_KEY
  if (!apiKey) {
    console.warn("[千问] DASHSCOPE_API_KEY 未配置，跳过千问预测")
    return null
  }

  const { homeTeam, awayTeam, matchStage } = input

  const prompt = `你是一个专业的足球比赛预测分析师。请分析以下世界杯比赛并给出预测。

主队: ${homeTeam.name}（FIFA 排名: ${homeTeam.fifaRanking ?? "未知"}, ELO 评分: ${homeTeam.eloRating ?? "未知"}）
客队: ${awayTeam.name}（FIFA 排名: ${awayTeam.fifaRanking ?? "未知"}, ELO 评分: ${awayTeam.eloRating ?? "未知"}）
比赛阶段: ${matchStage ?? "未知"}

请严格按以下 JSON 格式输出，不要包含其他内容：
{
  "homeWinProbability": 整数(0-100),
  "drawProbability": 整数(0-100),
  "awayWinProbability": 整数(0-100),
  "predictedHomeScore": 整数,
  "predictedAwayScore": 整数,
  "confidence": "high" 或 "medium" 或 "low",
  "analysis": "简要分析（50字以内）"
}

注意：三个概率之和必须等于100。`

  try {
    const response = await fetch(
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen-max",
          input: {
            messages: [
              { role: "system", content: "你是一个专业足球比赛预测分析师。只输出JSON，不要额外内容。" },
              { role: "user", content: prompt },
            ],
          },
          parameters: {
            result_format: "message",
            temperature: 0.3,
            max_tokens: 512,
          },
        }),
      }
    )

    if (!response.ok) {
      console.error(`[千问] API 错误: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    const content = data?.output?.choices?.[0]?.message?.content
    if (!content) {
      console.error("[千问] 响应格式异常:", JSON.stringify(data).slice(0, 200))
      return null
    }

    // 从响应中提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error("[千问] 无法解析 JSON 响应:", content.slice(0, 200))
      return null
    }

    const parsed = JSON.parse(jsonMatch[0])

    // 验证概率之和
    const total = parsed.homeWinProbability + parsed.drawProbability + parsed.awayWinProbability
    if (Math.abs(total - 100) > 2) {
      console.warn(`[千问] 概率之和(${total})不为100，重新归一化`)
      const factor = 100 / total
      parsed.homeWinProbability = Math.round(parsed.homeWinProbability * factor)
      parsed.drawProbability = Math.round(parsed.drawProbability * factor)
      parsed.awayWinProbability = 100 - parsed.homeWinProbability - parsed.drawProbability
    }

    return {
      homeWinProbability: parsed.homeWinProbability,
      drawProbability: parsed.drawProbability,
      awayWinProbability: parsed.awayWinProbability,
      predictedHomeScore: parsed.predictedHomeScore ?? 0,
      predictedAwayScore: parsed.predictedAwayScore ?? 0,
      confidence: parsed.confidence ?? "medium",
      analysis: parsed.analysis ?? "",
    }
  } catch (e) {
    console.error("[千问] 调用异常:", e)
    return null
  }
}
