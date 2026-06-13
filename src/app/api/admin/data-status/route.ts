import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const [teamCount, matchCount, oddsCount, predictionCount, reviewCount] =
    await Promise.all([
      prisma.team.count(),
      prisma.match.count(),
      prisma.oddsRecord.count(),
      prisma.prediction.count(),
      prisma.modelReview.count(),
    ])

  const scheduledCount = await prisma.match.count({
    where: { status: "scheduled" },
  })
  const completedCount = await prisma.match.count({
    where: { status: "completed" },
  })

  const latestPrediction = await prisma.prediction.findFirst({
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  })
  const latestOdds = await prisma.oddsRecord.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  })

  return NextResponse.json({
    success: true,
    data: {
      teams: teamCount,
      matches: { total: matchCount, scheduled: scheduledCount, completed: completedCount },
      oddsRecords: oddsCount,
      predictions: predictionCount,
      reviews: reviewCount,
      lastPredictionAt: latestPrediction?.createdAt ?? null,
      lastOddsUpdateAt: latestOdds?.updatedAt ?? null,
    },
  })
}
