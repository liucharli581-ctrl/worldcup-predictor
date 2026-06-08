import { NextRequest } from "next/server"
import { apiSuccess, apiError } from "@/lib/api-response"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!file) {
      return apiError("请上传图片", 400)
    }

    // MVP: return mock OCR data
    // Future: integrate PaddleOCR or cloud OCR API
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
      recognizedRows: mockResult,
      confidence: 0.86,
    })
  } catch {
    return apiError("OCR 识别失败", 500)
  }
}
