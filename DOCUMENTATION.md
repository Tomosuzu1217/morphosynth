# MORPHOSYNTH | デジタルマター・シンセシス・エンジン

落合陽一的デジタルネイチャーと坂本龍一・小室哲哉的音楽性を融合させるリアルタイムWebジェネレーティブ・アートシステム

🌐 **公開URL**: https://new-world-75725.web.app

---

## 目次
1. [概要](#概要)
2. [技術スタック](#技術スタック)
3. [機能一覧](#機能一覧)
4. [API仕様](#api仕様)
5. [画像生成の仕組み](#画像生成の仕組み)
6. [音響エンジン](#音響エンジン)
7. [セットアップ](#セットアップ)
8. [使い方](#使い方)
9. [ファイル構成](#ファイル構成)

---

## 概要

MORPHOSYNTHは、ユーザーが入力する詩的なキーワード（例：「胡蝶の夢」「雨」）から、リアルタイムで3Dビジュアルと音楽を生成するWebアプリケーションです。

### コンセプト
- **視覚**: 銀色の液体金属、薄膜干渉（虹色反射）、有機的な変形
- **聴覚**: 坂本龍一的アンビエント ⇔ 小室哲哉的トランス のクロスフェード
- **AI**: Gemini APIによるキーワードの意味解釈とパラメータ生成

---

## 技術スタック

### フロントエンド
| カテゴリ | 技術 | バージョン |
|---------|------|-----------|
| フレームワーク | **React** | 19.2.3 |
| 言語 | **TypeScript** | 5.8.2 |
| ビルドツール | **Vite** | 6.2.0 |
| 3Dエンジン | **Three.js** | 0.182.0 |
| 音響エンジン | **Web Audio API** | ネイティブ |
| スタイリング | **Tailwind CSS** (PostCSS) | - |

### バックエンド / AI
| カテゴリ | 技術 | 用途 |
|---------|------|------|
| AI推論 | **Gemini 3 Flash Preview** | キーワード解析・パラメータ生成 |
| 画像生成 | **Gemini 2.5 Flash Image** | 360度背景画像生成 |
| 認証・DB | **Firebase** (Auth, Firestore, Hosting) | ユーザー管理・ワールド保存 |

### 開発環境
```
Node.js >= 18.0
npm >= 9.0
```

---

## 機能一覧

### 1. AIキーワード解析
ユーザー入力を解析し、視覚・聴覚パラメータをJSON形式で生成

```typescript
// 入力例: "胡蝶の夢"
// 出力:
{
  simulation: {
    shapeType: "LEVITROPE",
    colorPalette: ["#4a4a6a", "#3a3a5a", "#8a6090"],
    iridescenceIntensity: 0.7,  // 虹色反射強め
    // ...
  },
  sound: {
    styleRatio: 0.2,  // 坂本寄り
    bpm: 65,
    gateIntensity: 0.1,
    // ...
  }
}
```

### 2. リアルタイム3Dビジュアライゼーション

| 機能 | 説明 |
|------|------|
| **薄膜干渉（Iridescence）** | 視線角度に応じた虹色反射（シャボン玉・油膜効果） |
| **有機的変形** | 頂点シェーダーによるCPUベースの粘土的変形 |
| **パーティクルシステム** | 2000個の微粒子が空間を漂う |
| **オーディオリアクティブ** | 音の振幅に応じてオブジェクトが脈動 |
| **環境マップ反射** | AI生成背景画像を反射マップとして使用 |

### 3. ジェネレーティブ・サウンド

| スタイル | 特徴 | パラメータ |
|----------|------|-----------|
| **坂本龍一スタイル** | ピアノ風音色、深いリバーブ、アンビエント | `styleRatio: 0.0-0.3` |
| **小室哲哉スタイル** | SuperSaw、4つ打ち、トランスゲート | `styleRatio: 0.7-1.0` |

### 4. 背景画像生成
Gemini Image APIで360度環境マップを生成し、3Dシーンの背景と反射に使用

### 5. ワールド保存・共有（Firebase連携）
- Googleアカウントでログイン
- 生成したワールドを保存・公開
- タイムラインギャラリーで閲覧

---

## API仕様

### Gemini API使用方法

**アプリケーション形式**: Webアプリケーション（ブラウザ上で動作）

**APIキー取得**: https://aistudio.google.com/app/apikey

#### 推論API（gemini-3-flash-preview）
```typescript
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "YOUR_API_KEY" });

const response = await ai.models.generateContent({
  model: "gemini-3-flash-preview",
  contents: `プロンプト: "${userInput}"`,
  config: {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        simulation: { /* 視覚パラメータ */ },
        sound: { /* 音響パラメータ */ },
        description: { type: Type.STRING },
        imagePrompt: { type: Type.STRING }
      }
    }
  }
});
```

#### 画像生成API（Hugging Face Stable Diffusion + Gemini フォールバック）

**優先度1: Hugging Face Stable Diffusion（無料・商用利用可能）**
```typescript
const response = await fetch(
  "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inputs: `360 degree panoramic environment, ${imagePrompt}, highly detailed`,
      parameters: {
        negative_prompt: "text, watermark, blurry",
        num_inference_steps: 25,
        guidance_scale: 7.5,
      }
    })
  }
);

// レスポンスは画像バイナリ（Blob）
const imageBlob = await response.blob();
```

**優先度2: Gemini API（フォールバック）**
```typescript
const imageResponse = await ai.models.generateContent({
  model: 'gemini-2.5-flash-image-preview',
  contents: `Generate a 360-degree background image. Theme: "${imagePrompt}"`,
});
// Base64画像データを取得
const imageData = imageResponse.candidates[0].content.parts[0].inlineData.data;
```

### Firebase API

**認証（Google OAuth）**
```typescript
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
await signInWithPopup(auth, new GoogleAuthProvider());
```

**Firestore（ワールド保存）**
```typescript
import { addDoc, collection } from 'firebase/firestore';
await addDoc(collection(db, 'worlds'), {
  userId: user.uid,
  prompt: "胡蝶の夢",
  params: { simulation: {...}, sound: {...} },
  createdAt: new Date()
});
```

---

## 画像生成の仕組み

### 生成フロー
```
1. ユーザーがキーワード入力（例: "胡蝶の夢"）
       ↓
2. Gemini推論APIがimagePromptを生成
   → "ethereal butterfly dreamscape, purple mist, moonlight reflections"
       ↓
3. Gemini画像生成APIで360度背景画像を生成
       ↓
4. 生成画像をThree.jsのEquirectangularマッピングで適用
       ↓
5. 3Dオブジェクトの環境マップ反射として使用
```

### 画像の使用箇所
1. **シーン背景**: `scene.background = texture`
2. **環境反射**: `material.envMap = texture`
3. **イリデセンス強調**: `material.envMapIntensity = 3.0 + iridescenceValue * 2.0`

### フォールバック
APIが失敗した場合、Canvas 2Dでプロシージャル背景を生成:
- キーワードに基づくグラデーション
- ボケ効果（光の玉）
- ノイズテクスチャ

---

## 音響エンジン

### デュアルバスアーキテクチャ
```
            ┌─────────────────┐
            │  坂本バス       │ ─→ リバーブ(8s) ─→ ┐
ユーザー入力 →│  (ピアノ/アンビエント)           │   ├→ マスター → スピーカー
            ├─────────────────┤                   │
            │  小室バス       │ ─→ ゲート     ─→ ┘
            │  (SuperSaw/トランス)               │
            └─────────────────┘
```

### SuperSaw実装
```typescript
// 7つのデチューンされた鋸波オシレーター
const detuneAmounts = [-30, -20, -10, 0, 10, 20, 30];
detuneAmounts.forEach(detune => {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, startTime);
  osc.detune.setValueAtTime(detune, startTime);
  osc.connect(oscGain);
});
```

---

## セットアップ

### 前提条件
- Node.js 18以上
- npm 9以上
- Google AI Studio APIキー

### インストール
```bash
git clone <repository>
cd levitrope-_-morphosynth
npm install
```

### 環境変数（オプション）
`.env.local`を作成:
```
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
```

### 開発サーバー起動
```bash
npm run dev
# → http://localhost:5173 (または3001)
```

### 本番ビルド & デプロイ
```bash
npm run build
firebase deploy --only hosting
```

---

## 使い方

### 基本操作
1. アプリにアクセス（https://new-world-75725.web.app）
2. Google AI Studio APIキーを入力
3. 「Synchronize_Aether」をクリック
4. テキストボックスにキーワードを入力
5. 「Confirm_Matter」をクリック

### プロンプト例

| キーワード | 生成される雰囲気 | 音楽スタイル |
|-----------|----------------|-------------|
| 胡蝶の夢 | 幻想的、紫色、浮遊感 | 坂本（アンビエント） |
| 静かな雨 | 暗い青、水滴、メランコリック | 坂本（ピアノ） |
| 都市の夜 | ネオン、サイバーパンク | 小室（トランス） |
| 覚醒のダンス | 高速、エネルギッシュ | 小室（SuperSaw） |
| 水面の月 | 銀色、反射、静寂 | ブレンド |

### TUNING_COREパネル
右上の「TUNING_CORE」ボタンで詳細設定:
- **Iridescence**: 虹色反射の強度
- **Fusion_Bias**: オブジェクトの融合度
- **Entropy_Scale**: 変形の激しさ

---

## ファイル構成

```
levitrope-_-morphosynth/
├── index.html              # エントリーポイント
├── index.tsx               # Reactルート
├── App.tsx                 # ルーティング
├── types.ts                # 型定義
│
├── components/
│   ├── Visualizer3D.tsx    # Three.js 3Dレンダラー
│   ├── UIOverlay.tsx       # HUD/コントロールパネル
│   ├── WorldCreator.tsx    # メイン体験画面
│   ├── Gallery.tsx         # タイムラインギャラリー
│   ├── WorldViewer.tsx     # 保存済みワールド閲覧
│   └── AuthButton.tsx      # ログインボタン
│
├── services/
│   ├── audioEngine.ts      # Web Audio API音響エンジン
│   ├── geminiService.ts    # Gemini API連携
│   └── firebase.ts         # Firebase認証・DB
│
├── firebase.json           # Firebaseホスティング設定
├── package.json            # 依存関係
├── vite.config.ts          # Vite設定
└── tsconfig.json           # TypeScript設定
```

---

## ライセンス

MIT License

---

## 参考資料

- [Three.js Documentation](https://threejs.org/docs/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Google AI Studio](https://aistudio.google.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
