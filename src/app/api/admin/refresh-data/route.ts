import { NextResponse } from "next/server"
import { syncOddsData, syncResults, generateAllPredictions } from "@/lib/data-fetcher/sync"

export async function POST() {
  const start = Date.now()
  const results: Record<string, unknown> = {}

  // 诊断：检查关键环境变量是否存在
  results._diagnostics = {
    DASHSCOPE_API_KEY: !!process.env.DASHSCOPE_API_KEY,
    OOKOO_ODDS_API_KEY: !!process.env.OOKOO_ODDS_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
  }

  try {
    const oddsResult = await syncOddsData()
    results.odds = oddsResult
  } catch (e) {
    results.odds = { error: e instanceof Error ? e.message : String(e) }
  }

  try {
    const resultResult = await syncResults()
    results.results = resultResult
  } catch (e) {
    results.results = { error: e instanceof Error ? e.message : String(e) }
  }

  try {
    const predResult = await generateAllPredictions()
    results.predictions = predResult
  } catch (e) {
    results.predictions = { error: e instanceof Error ? e.message : String(e) }
  }

  return NextResponse.json({
    success: true,
    duration: `${Date.now() - start}ms`,
    results,
  })
}
