import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiSuccess, apiError } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const reviews = await prisma.modelReview.findMany({
      where: where as never,
      include: {
        match: {
          include: {
            homeTeam: { select: { id: true, name: true } },
            awayTeam: { select: { id: true, name: true } },
          },
        },
        prediction: true,
      },
      orderBy: { createdAt: "desc" },
    })
    return apiSuccess(reviews)
  } catch {
    return apiError("获取复盘列表失败", 500)
  }
}
