import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiSuccess, apiError } from "@/lib/api-response"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { actualHomeScore, actualAwayScore } = await request.json()

    if (actualHomeScore === undefined || actualAwayScore === undefined) {
      return apiError("请提供实际比分", 400)
    }

    let actualResult: string
    if (actualHomeScore > actualAwayScore) actualResult = "home_win"
    else if (actualHomeScore < actualAwayScore) actualResult = "away_win"
    else actualResult = "draw"

    await prisma.match.update({
      where: { id },
      data: {
        actualHomeScore,
        actualAwayScore,
        actualResult,
        status: "completed",
      },
    })

    const prediction = await prisma.prediction.findFirst({
      where: { matchId: id },
      orderBy: { createdAt: "desc" },
    })

    if (!prediction) {
      return apiError("未找到预测数据，请先生成预测", 400)
    }

    const predictedResult = prediction.mainDirection
    const predictionHit = predictedResult === actualResult

    const probError =
      actualResult === "home_win"
        ? Math.abs(prediction.homeWinProbability - 100)
        : actualResult === "away_win"
          ? Math.abs(prediction.awayWinProbability - 100)
          : Math.abs(prediction.drawProbability - 100)

    const reviewSummary = predictionHit
      ? "模型方向正确，预测与实际结果一致。"
      : `模型预测为${predictedResult}，实际结果为${actualResult}，方向未命中。`

    const review = await prisma.modelReview.create({
      data: {
        matchId: id,
        predictionId: prediction.id,
        actualResult,
        predictedResult: predictedResult ?? "",
        predictionHit,
        probabilityError: +probError.toFixed(2),
        reviewSummary,
      },
    })

    return apiSuccess(review)
  } catch (error) {
    const message = error instanceof Error ? error.message : "复盘失败"
    return apiError(message, 500)
  }
}
