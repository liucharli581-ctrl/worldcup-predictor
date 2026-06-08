# 2026 世界杯预测工具

基于 Next.js 的世界杯比赛数据分析与预测工具。

## 功能

- **球队数据** — 球队列表/详情页，含基本统计和实力评分
- **赛程与预测** — 比赛列表/详情页，含赔率分析、赛前预测、虚拟投注模拟
- **小组积分** — 小组赛积分榜
- **历史交锋** — 两队历史交锋记录查询
- **赔率截图识别** — OCR 上传识别赔率截图
- **复盘系统** — 预测命中率追踪与分析
- **管理后台** — 球队和比赛 CRUD 管理

## 技术栈

- [Next.js](https://nextjs.org) (App Router)
- [Prisma](https://prisma.io) + SQLite
- [Tailwind CSS v4](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)

## 本地开发

```bash
npm install
npx prisma db push
npm run dev
```

浏览器打开 http://localhost:3000

## 部署

推荐部署到 [Vercel](https://vercel.com/new)。
