import { NextRequest } from "next/server"
import { apiSuccess, apiError } from "@/lib/api-response"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    const type = formData.get("type") // "odds" | "correct-score"

    if (!file) {
      return apiError("请上传图片", 400)
    }

    // MVP: return mock OCR data
    // Future: integrate PaddleOCR or cloud OCR API

    if (type === "correct-score") {
      const correctScoreResult = [
        { score: "1-0", odds: 5.0, bookmaker: "Bet365" },
        { score: "2-0", odds: 6.5, bookmaker: "Bet365" },
        { score: "2-1", odds: 7.0, bookmaker: "Bet365" },
        { score: "1-1", odds: 6.5, bookmaker: "Bet365" },
        { score: "0-0", odds: 9.0, bookmaker: "Bet365" },
        { score: "3-0", odds: 8.0, bookmaker: "William Hill" },
        { score: "3-1", odds: 10.0, bookmaker: "William Hill" },
        { score: "0-1", odds: 13.0, bookmaker: "Bet365" },
        { score: "1-2", odds: 15.0, bookmaker: "Bet365" },
        { score: "0-2", odds: 22.0, bookmaker: "William Hill" },
        { score: "2-2", odds: 14.0, bookmaker: "Bet365" },
        { score: "3-2", odds: 26.0, bookmaker: "William Hill" },
      ]

      return apiSuccess({
        type: "correct-score",
        recognizedRows: correctScoreResult,
        confidence: 0.82,
      })
    }

    // Default: odds mode
    const mockResult = [
      {
        bookmaker: "Bet365",
        initialHomeWin: 1.36,
        initialDraw: 4.5,
        initialAwayWin: 7.0,
        currentHomeWin: 1.33,
        currentDraw: 4.75,
        currentAwayWin: 8.0,
      },
      {
        bookmaker: "William Hill",
        initialHomeWin: 1.36,
        initialDraw: 4.2,
        initialAwayWin: 8.5,
        currentHomeWin: 1.35,
        currentDraw: 4.4,
        currentAwayWin: 8.5,
      },
      {
        bookmaker: "Unibet",
        initialHomeWin: 1.33,
        initialDraw: 4.35,
        initialAwayWin: 8.5,
        currentHomeWin: 1.37,
        currentDraw: 4.75,
        currentAwayWin: 9.0,
      },
    ]

    return apiSuccess({
      type: "odds",
      recognizedRows: mockResult,
      confidence: 0.86,
    })
  } catch {
    return apiError("OCR 识别失败", 500)
  }
}
