"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Upload, ImageUp, CheckCircle2, Pencil, Save, ScanLine } from "lucide-react"
import { cn } from "@/lib/utils"

interface OddsRow {
  bookmaker: string
  initialHomeWin: number
  initialDraw: number
  initialAwayWin: number
  currentHomeWin: number
  currentDraw: number
  currentAwayWin: number
}

interface CorrectScoreRow {
  score: string
  odds: number
  bookmaker: string
}

type ResultData =
  | { type: "odds"; recognizedRows: OddsRow[]; confidence: number }
  | { type: "correct-score"; recognizedRows: CorrectScoreRow[]; confidence: number }

const oddsFields: { key: keyof OddsRow; label: string; align: string }[] = [
  { key: "initialHomeWin", label: "初盘主胜", align: "text-right" },
  { key: "initialDraw", label: "初盘平局", align: "text-right" },
  { key: "initialAwayWin", label: "初盘客胜", align: "text-right" },
  { key: "currentHomeWin", label: "即时主胜", align: "text-right" },
  { key: "currentDraw", label: "即时平局", align: "text-right" },
  { key: "currentAwayWin", label: "即时客胜", align: "text-right" },
]

export default function OddsOcrPage() {
  const [mode, setMode] = useState<"odds" | "correct-score">("odds")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ResultData | null>(null)
  const [editing, setEditing] = useState(false)
  const [editableOddsRows, setEditableOddsRows] = useState<OddsRow[]>([])
  const [editableScoreRows, setEditableScoreRows] = useState<CorrectScoreRow[]>([])
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File | null) => {
    if (!f) return
    setFile(f)
    setResult(null)
    setEditing(false)
    setSaveSuccess(false)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", mode)
      const res = await fetch("/api/odds/ocr", { method: "POST", body: formData })
      const data = await res.json()
      if (data.success) {
        setResult(data.data)
        if (data.data.type === "odds") {
          setEditableOddsRows(data.data.recognizedRows.map((r: OddsRow) => ({ ...r })))
        } else {
          setEditableScoreRows(data.data.recognizedRows.map((r: CorrectScoreRow) => ({ ...r })))
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const updateOddsCell = (idx: number, field: keyof OddsRow, val: string) => {
    setEditableOddsRows((prev) =>
      prev.map((r, i) =>
        i !== idx ? r : { ...r, [field]: field === "bookmaker" ? val : Number(val) || 0 }
      )
    )
  }

  const updateScoreCell = (idx: number, field: keyof CorrectScoreRow, val: string) => {
    setEditableScoreRows((prev) =>
      prev.map((r, i) =>
        i !== idx
          ? r
          : { ...r, [field]: field === "odds" ? Number(val) || 0 : val }
      )
    )
  }

  const handleSave = async () => {
    setSaving(true)
    // Simulate saving — in production would POST to a match's odds
    await new Promise((r) => setTimeout(r, 600))
    setSaving(false)
    setSaveSuccess(true)
    setEditing(false)
  }

  const handleCancel = () => {
    setEditing(false)
    if (result?.type === "odds") {
      setEditableOddsRows(result.recognizedRows.map((r) => ({ ...r })))
    } else if (result?.type === "correct-score") {
      setEditableScoreRows(result.recognizedRows.map((r) => ({ ...r })))
    }
  }

  const handleModeSwitch = (newMode: "odds" | "correct-score") => {
    if (newMode === mode) return
    setMode(newMode)
    setFile(null)
    setPreview(null)
    setResult(null)
    setEditing(false)
    setSaveSuccess(false)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">OCR 双模式识别</h1>
        <p className="text-muted-foreground">上传赔率截图或比分截图，自动识别并录入数据</p>
      </div>

      {/* 模式切换 */}
      <Card>
        <CardContent className="p-1">
          <div className="flex rounded-lg bg-muted p-1">
            <button
              onClick={() => handleModeSwitch("odds")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                mode === "odds"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ScanLine className="h-4 w-4" />
              赔率识别
            </button>
            <button
              onClick={() => handleModeSwitch("correct-score")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                mode === "correct-score"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ScanLine className="h-4 w-4" />
              比分识别
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 上传区 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageUp className="h-4 w-4" />
            {mode === "odds" ? "上传赔率截图" : "上传比分截图"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleFile(e.dataTransfer.files[0])
            }}
            className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors hover:border-primary/50 hover:bg-muted/30"
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">点击或拖拽上传截图</p>
              <p className="text-xs text-muted-foreground">支持 JPG / PNG / WebP</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {preview && (
            <div className="space-y-3">
              <img src={preview} alt="截图预览" className="max-h-80 rounded-lg border object-contain" />
              <div className="flex gap-2">
                <Button onClick={handleUpload} disabled={loading}>
                  {loading ? "识别中..." : "开始识别"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFile(null)
                    setPreview(null)
                    setResult(null)
                    setSaveSuccess(false)
                  }}
                >
                  重新选择
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 识别结果 - 赔率模式 */}
      {result && result.type === "odds" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                赔率识别结果
              </span>
              <Badge variant="outline" className="text-xs">
                置信度 {Math.round(result.confidence * 100)}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">博彩公司</th>
                    {oddsFields.map((f) => (
                      <th key={f.key} className={`pb-2 pr-3 font-medium ${f.align}`}>
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(editing ? editableOddsRows : result.recognizedRows as OddsRow[]).map(
                    (row, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 pr-3">
                          {editing ? (
                            <input
                              value={editableOddsRows[i].bookmaker}
                              onChange={(e) => updateOddsCell(i, "bookmaker", e.target.value)}
                              className="flex h-8 w-24 rounded border border-input bg-background px-2 text-xs"
                            />
                          ) : (
                            <span className="font-medium">{row.bookmaker}</span>
                          )}
                        </td>
                        {oddsFields.map((f) => (
                          <td key={f.key} className="py-2 pr-3 text-right font-mono tabular-nums last:pr-0">
                            {editing ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editableOddsRows[i][f.key]}
                                onChange={(e) => updateOddsCell(i, f.key, e.target.value)}
                                className="flex h-8 w-20 rounded border border-input bg-background px-2 text-right text-xs"
                              />
                            ) : (
                              Number(row[f.key]).toFixed(2)
                            )}
                          </td>
                        ))}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {!editing ? (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> 编辑
                  </Button>
                ) : (
                  <>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      <Save className="mr-1 h-3.5 w-3.5" /> {saving ? "保存中..." : "保存"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCancel}>
                      取消
                    </Button>
                  </>
                )}
              </div>
              {saveSuccess && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> 赔率数据已保存
                </span>
              )}
            </div>

            {!saveSuccess && (
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
                <strong>提示：</strong>当前识别为模拟数据（mock）。如需真实 OCR 识别，请集成 PaddleOCR 或云 OCR API。识别后请手动核对数据准确性。
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 识别结果 - 比分模式 */}
      {result && result.type === "correct-score" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                比分识别结果
              </span>
              <Badge variant="outline" className="text-xs">
                置信度 {Math.round(result.confidence * 100)}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">比分</th>
                    <th className="pb-2 pr-3 font-medium text-right">赔率</th>
                    <th className="pb-2 font-medium text-right">博彩公司</th>
                  </tr>
                </thead>
                <tbody>
                  {(editing ? editableScoreRows : (result.recognizedRows as CorrectScoreRow[])).map(
                    (row, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 pr-3">
                          {editing ? (
                            <input
                              value={editableScoreRows[i].score}
                              onChange={(e) => updateScoreCell(i, "score", e.target.value)}
                              className="flex h-8 w-20 rounded border border-input bg-background px-2 text-xs"
                            />
                          ) : (
                            <span className="font-medium">{row.score}</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums">
                          {editing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editableScoreRows[i].odds}
                              onChange={(e) => updateScoreCell(i, "odds", e.target.value)}
                              className="flex h-8 w-20 rounded border border-input bg-background px-2 text-right text-xs"
                            />
                          ) : (
                            row.odds.toFixed(2)
                          )}
                        </td>
                        <td className="py-2 text-right">
                          {editing ? (
                            <input
                              value={editableScoreRows[i].bookmaker}
                              onChange={(e) => updateScoreCell(i, "bookmaker", e.target.value)}
                              className="flex h-8 w-24 rounded border border-input bg-background px-2 text-xs ml-auto"
                            />
                          ) : (
                            <span className="text-muted-foreground">{row.bookmaker}</span>
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {!editing ? (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> 编辑
                  </Button>
                ) : (
                  <>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      <Save className="mr-1 h-3.5 w-3.5" /> {saving ? "保存中..." : "保存"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCancel}>
                      取消
                    </Button>
                  </>
                )}
              </div>
              {saveSuccess && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> 比分数据已保存
                </span>
              )}
            </div>

            {!saveSuccess && (
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
                <strong>提示：</strong>当前识别为模拟数据（mock）。如需真实 OCR 识别，请集成 PaddleOCR 或云 OCR API。识别后请手动核对数据准确性。
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs text-muted-foreground">
          {mode === "odds" ? (
            <>
              <p>1. 截图应清晰显示博彩公司名称、初盘和即时赔率</p>
              <p>2. 支持主流博彩公司：Bet365、William Hill、Unibet 等</p>
              <p>3. 识别后请务必核对数据准确性，必要时手动修正</p>
              <p>4. 保存后的赔率数据可在相应比赛详情页查看</p>
            </>
          ) : (
            <>
              <p>1. 截图应清晰显示比分选项和对应赔率</p>
              <p>2. 支持多种比分格式识别，如 "1-0"、"2-1" 等</p>
              <p>3. 识别后请务必核对数据准确性，必要时手动修正</p>
              <p>4. 保存后的比分数据可在相应比赛详情页查看</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
