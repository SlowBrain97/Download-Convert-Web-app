# ダウンロード・コンバーターアプリ

メディアファイルのダウンロードと変換を行うWebアプリケーションです。動画・音声のダウンロード、形式変換、ドキュメントの変換機能を備えています。

## 主な機能

### メディア変換
- 動画・音声ファイルの形式変換
- 複数のフォーマットに対応
- 高品質な変換処理

### 動画・音声ダウンロード
- YouTube動画のダウンロード（ytdl-core使用）
- 直接URLからのダウンロード
- 動画・音声の選択可能な形式

### ドキュメント変換
- ドキュメントファイルの形式変換
- 対応形式: docx, xlsx, pdf など
- LibreOffice連携による幅広い形式対応

### リアルタイム進捗表示
- サーバーサイドイベント(SSE)を使用した進捗状況の表示
- タスク管理と進捗追跡

## 技術スタック

### フロントエンド
- React + TypeScript
- Vite
- TailwindCSS
- Shadcn/ui

### バックエンド
- Node.js + Express
- TypeScript
- FFmpeg (メディア処理)
- ytdl-core (YouTubeダウンロード)

## セットアップ手順

### バックエンド

1. 依存関係をインストール
```bash
cd backend
npm install
```

2. 環境変数を設定
```bash
cp .env.example .env
# .envファイルを必要に応じて編集
```

3. 開発サーバーを起動
```bash
npm run dev
```

### フロントエンド

1. 依存関係をインストール
```bash
cd frontend
npm install
```

2. 開発サーバーを起動
```bash
npm run dev
```

## デプロイ

### Railway または Render へデプロイ
- バックエンド: `render.yaml` を使用してワンクリックデプロイが可能
- フロントエンド: Viteのビルド後、静的ファイルをホスティング

### Vercel
- サーバーレス関数としてデプロイ可能
- 無料枠ではSSEの制限に注意

## API エンドポイント

- `POST /api/media/convert` - メディアファイルの変換
- `POST /api/download` - 動画・音声のダウンロード
- `POST /api/docs/convert` - ドキュメントファイルの変換
- `GET /api/progress/:taskId` - タスク進捗の取得（SSE）

## 注意事項

- メディア処理にはFFmpegを使用しています
- 一部のドキュメント変換にはLibreOfficeが必要です
- 一時ファイルは自動的にクリーンアップされます

## ライセンス

このプロジェクトは [MITライセンス](LICENSE) の下で公開されています。
