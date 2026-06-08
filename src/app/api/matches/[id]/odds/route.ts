import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiSuccess, apiError } from "@/lib/api-response"
import { calculateOddsChange, isAbnormalMovement, isMajorBookmaker } from "@/lib/prediction"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const odds = await prisma.oddsRecord.findMany({
      where: { matchId: id },
      orderBy: { bookmaker: "asc" },
    })
    return apiSuccess(odds)
  } catch {
    return apiError("获取赔率数据失败", 500)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const records = body.oddsRecords as Array<{
      bookmaker: string
      initialHomeWin: number
      initialDraw: number
      initialAwayWin: number
      currentHomeWin: number
      currentDraw: number
      currentAwayWin: number
    }>

    if (!records || !Array.isArray(records)) {
      return apiError("请提供赔率数据数组", 400)
    }

    await prisma.oddsRecord.deleteMany({ where: { matchId: id } })

    const created = []
    for (const record of records) {
      const change = calculateOddsChange(record)
      const fullRecord = {
        ...record,
        matchId: id,
        ...change,
        isMajorBookmaker: isMajorBookmaker(record.bookmaker),
        isAbnormal: isAbnormalMovement({
          ...record,
          ...change,
        } as never),
      }
      const saved = await prisma.oddsRecord.create({
        data: fullRecord,
      })
      created.push(saved)
    }

    return apiSuccess(created, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存赔率失败"
    return apiError(message, 500)
  }
}
