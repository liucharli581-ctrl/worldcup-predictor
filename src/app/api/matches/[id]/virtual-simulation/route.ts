import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiSuccess, apiError } from "@/lib/api-response"
import { calculateVirtualSimulation } from "@/lib/prediction"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { virtualBankroll } = await request.json()

    if (!virtualBankroll || virtualBankroll <= 0) {
      return apiError("请输入有效的虚拟本金", 400)
    }

    const prediction = await prisma.prediction.findFirst({
      where: { matchId: id },
      orderBy: { createdAt: "desc" },
    })

    if (!prediction) {
      return apiError("请先生成预测结果", 400)
    }

    const result = calculateVirtualSimulation(
      virtualBankroll,
      prediction.riskLevel ?? "medium"
    )

    const simulation = await prisma.virtualSimulation.create({
      data: {
        matchId: id,
        predictionId: prediction.id,
        virtualBankroll: result.virtualBankroll,
        suggestedMinAmount: result.suggestedMinAmount,
        suggestedMaxAmount: result.suggestedMaxAmount,
        riskLevel: result.riskLevel,
        simulationNote: result.notice,
      },
    })

    return apiSuccess(simulation)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "虚拟模拟失败"
    return apiError(message, 500)
  }
}
