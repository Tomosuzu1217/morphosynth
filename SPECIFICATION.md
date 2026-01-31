# MORPHOSYNTH | 究極技術継承・設計仕様書 (Master Specification)

このドキュメントは、本POC（概念実証）プロジェクト「MORPHOSYNTH / LEVITROPE」を次世代のAIエンジニアや開発チームへ引き継ぎ、商用レベルまで引き上げるための完全な設計図です。

---

## 1. プロジェクトの思想 (Philosophy)
「デジタルマター（電子物質）の生命化」をテーマに、AIが生成した抽象的概念を**3D形状（視覚）**と**サウンドスケープ（聴覚）**へ即座に変換・同期させる実験的プラットフォームです。

---

## 2. 技術スタック & インフラ (Stack & Infrastructure)

### 2.1 コア・テクノロジー
- **Frontend**: React 19 + TypeScript
- **3D Engine**: Three.js (r182+)
- **Audio Engine**: Web Audio API (Vanilla JS/TS)
- **AI (Reasoning)**: Gemini 3 Flash Preview (JSON Mode) ※現状はGemini 2.5 Flashで運用
- **AI (Vision)**: Gemini 2.5 Flash Image
- **Styling**: Tailwind CSS + Custom PostCSS

### 2.2 実行環境のコスト
- **APIコスト**: Google AI Studioの「Free Tier」により、商用利用以前のフェーズでは**完全無料**で運用可能。
- **制限**: 無料枠ではRPM（1分あたりのリクエスト数）に制限があるため、`localStorage`等での結果キャッシュを推奨。

---

## 3. システム・アーキテクチャ (Data Flow)

### 3.1 推論フェーズ (AI Inference)
1. ユーザー入力（プロンプト）を取得。
2. `geminiService.ts` が 推論モデルを叩き、以下のJSONを取得：
   - `simulation`: Three.jsのジオメトリ、マテリアル、物理演算パラメータ。
   - `sound`: 周波数、音階、リズム、エフェクトパラメータ。
   - `imagePrompt`: 背景生成用のプロンプト。
3. 同時に 画像生成モデルで360度環境マップ（Equirectangular）を生成。

### 3.2 視覚化フェーズ (3D Rendering)
- **Vertex Displacement**: CPU側で `BufferAttribute` を毎フレーム書き換え、有機的な「水銀」の動きを再現。
- **Material**: `MeshPhysicalMaterial` を極限までチューニング。屈折（IOR）、透過（Transmission）、クリアコートを使用。
- **Post-Processing**: `EffectComposer` を採用。`SAO`（アンビエントオクルージョン）により形状の立体感を強調。

### 3.3 音響化フェーズ (Generative Audio)
- **Polyphonic Synth**: 同時発音数に制限のないオシレーター管理。
- **Scale Sync**: AIが指定したヘルツ（Hz）の配列に基づき、音楽的に調和した音を選択。
- **Audio Analysis**: `AnalyserNode` からリアルタイムで振幅を取得し、3Dモデルの脈動（Mutation）へフィードバック。

---

## 4. 詳細な設計仕様 (Technical Specs)

### 4.1 3D形状生成 (Geometry Logic)
- `HOUSEHOLD`: 椅子、ランプ、ソファ、本などの抽象的な家具を `BufferGeometryUtils.mergeGeometries` で動的に組み上げ。
- `LEVITROPE`: 高ポリゴンの球体やドーナツ形状に、AIが指定した `mutationScale` でノイズを加える。

### 4.2 カメラ制御
- `ORBIT`: 0,0,0を注視する自動回転。
- `INTERACTIVE`: WASDキーとマウスによる一人称移動。カメラの `Quaternion` と `Vector3` の加算による自由移動。

---

## 5. 最適化ロードマップ (Future Optimizations)

### 5.1 GPGPUへの移行
現在はCPUで数万頂点を計算しているが、これを `ShaderMaterial` (GLSL) の頂点シェーダーに移譲することで、数百万ポリゴンの描画が可能になる。

### 5.2 音響の空間化 (Spatial Audio)
`PannerNode` を導入し、3D空間内の物体の位置に合わせて音が聞こえる方向が変わるように実装する。

### 5.3 状態の永続化
生成された `AISimulationResponse` をハッシュ化し、URLに含めることで、特定の「世界」を他のユーザーと共有可能にする。

---

## 6. 次のエンジニアへのメッセージ

このアプリの魅力は「予測不能な美しさ」にあります。Geminiの出力するパラメータは時として極端ですが、その極端さがデジタルの新物質を作り出します。
コードを修正する際は、`types.ts` のインターフェースを拡張し、AIが制御できる物理パラメータを増やしていくことをお勧めします。

**開発のスローガン:** "CODE AS MATTER, SOUND AS LIGHT."
