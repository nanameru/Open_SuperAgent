import { tool } from 'ai';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic'; 
import { generateText } from 'ai';

export const graphicRecordingTool = tool({
  description: 'タイムライン付きのグラフィックレコーディング（グラレコ）をHTML/CSSで生成するツール。入力内容を視覚的な図解とテキストの組み合わせで表現します。',
  parameters: z.object({
    content: z.string().describe('グラレコ化する文章や記事の内容。'),
    title: z.string().optional().describe('グラレコのタイトル。'),
    theme: z.enum(['green', 'blue', 'orange', 'purple', 'pink']).optional().default('green').describe('カラーテーマ。'),
    steps: z.number().optional().default(4).describe('タイムラインのステップ数（最大6）。'),
    includeIcons: z.boolean().optional().default(true).describe('Font Awesomeアイコンを含めるかどうか。'),
    additionalNotes: z.string().optional().describe('追加のメモや指示（特定の要素を強調するなど）。'),
    variant: z.number().optional().default(1).describe('生成するバリアント（1, 2, 3のいずれか）。'),
    autoPreview: z.boolean().optional().default(true).describe('生成後に自動的にプレビューを表示するかどうか。'),
  }),
  execute: async ({ content, title, theme, steps, includeIcons, additionalNotes, variant, autoPreview }) => {
    const uniqueId = `grafreco-${Math.random().toString(36).substring(7)}-v${variant || 1}`;
    
    // テーマカラーの設定
    const themeColors = {
      green: {
        primary: '#027333',
        secondary: '#4E7329',
        accent1: '#F2B705',
        accent2: '#F29F05',
        accent3: '#D97904'
      },
      blue: {
        primary: '#1A5D92',
        secondary: '#1B85D9',
        accent1: '#73B8F2',
        accent2: '#0596D9',
        accent3: '#053959'
      },
      orange: {
        primary: '#D95204',
        secondary: '#F27405',
        accent1: '#F29544',
        accent2: '#D97904',
        accent3: '#A62D04'
      },
      purple: {
        primary: '#6747D9',
        secondary: '#4628A6',
        accent1: '#A18BF2',
        accent2: '#8B47F2',
        accent3: '#4B0CD9'
      },
      pink: {
        primary: '#D92A7A',
        secondary: '#A6215F',
        accent1: '#F284B7',
        accent2: '#F2578C',
        accent3: '#F21563'
      }
    };
    
    const selectedTheme = themeColors[theme || 'green'];
    
    // ステップ数の調整（最大6）
    const validSteps = Math.min(Math.max(2, steps || 4), 6);
    
    const promptArgs = {
      content: content,
      title: title || 'グラフィックレコーディング',
      themeColors: selectedTheme,
      steps: validSteps,
      includeIcons: includeIcons !== false,
      additionalNotes: additionalNotes || '',
      uniqueId: uniqueId,
      variant: variant || 1
    };

    const basePrompt = `# タイムライン付のグラフィックレコーディング (グラレコ) HTML 作成プロンプト V1

## 目的
以下の内容を、超一流デザイナーが作成したような、日本語で完璧なグラフィックレコーディング風のHTMLインフォグラフィックに変換してください。情報設計とビジュアルデザインの両面で最高水準を目指します。
手書き風の図形やアイコンを活用して内容を視覚的に表現します。

## 入力内容
【タイトル】 ${promptArgs.title}
【内容】 ${promptArgs.content}
【テーマカラー】 ${theme || 'green'}
【ステップ数】 ${promptArgs.steps}
【アイコン】 ${promptArgs.includeIcons ? '使用する' : '使用しない'}
【追加メモ】 ${promptArgs.additionalNotes}
【バリアント】 ${promptArgs.variant}
【固有ID】 ${promptArgs.uniqueId}

## デザイン仕様
### 1. カラースキーム
\`\`\`
<palette>
<color name='イラスト-1' rgb='${promptArgs.themeColors.primary.replace('#', '')}' />
<color name='イラスト-2' rgb='${promptArgs.themeColors.secondary.replace('#', '')}' />
<color name='イラスト-3' rgb='${promptArgs.themeColors.accent1.replace('#', '')}' />
<color name='イラスト-4' rgb='${promptArgs.themeColors.accent2.replace('#', '')}' />
<color name='イラスト-5' rgb='${promptArgs.themeColors.accent3.replace('#', '')}' />
</palette>
\`\`\`

### 2. グラフィックレコーディング要素
- 左上から右へ、上から下へと情報を順次配置
- 日本語の手書き風フォントの使用（Yomogi, Zen Kurenaido, Kaisei Decol）
- 手描き風の囲み線、矢印、バナー、吹き出し
- テキストと視覚要素（アイコン、シンプルな図形）の組み合わせ
- キーワードの強調（色付き下線、マーカー効果）
- 関連する概念を線や矢印で接続
- Font Awesome アイコンを効果的に配置
- タイムライン表示を使用して情報の流れを視覚化

### 3. タイポグラフィ
- タイトル：32px、グラデーション効果、太字
- サブタイトル：16px、#475569
- セクション見出し：18px、アイコン付き
- 本文：14px、#334155、行間1.4
- フォント指定：
  \`\`\`html
  <style>
  @import url('https://fonts.googleapis.com/css2?family=Kaisei+Decol&family=Yomogi&family=Zen+Kurenaido&display=swap');
  </style>
  \`\`\`

### 4. レイアウト
- ヘッダー：左揃えタイトル＋右揃え日付/出典
- タイムライン構成を使用して手順や段階を表示
- カード型コンポーネント：白背景、角丸12px、微細シャドウ
- セクション間の適切な余白と階層構造
- 適切にグラスモーフィズムを活用
- コンテンツの横幅は100%にして
- **必須**: タイムラインアイテムには必ず「丸とフラップ装飾」を含める

### 5. コードブロック表示
- 背景色を ${promptArgs.themeColors.accent1}（イラスト-3カラー）に設定
- 左側に ${promptArgs.themeColors.primary}（イラスト-1カラー）のアクセントボーダーを追加
- シンタックスハイライトにパレットカラーを使用
- 言語に応じた色分け（JSON、YAML、ENV、BASH等）
- コードブロック右上に言語ラベルを表示
- 日本語手書き風フォントを適用

## グラフィックレコーディング表現技法
- テキストと視覚要素のバランスを重視
- キーワードを囲み線や色で強調
- 簡易的なアイコンや図形で概念を視覚化
- 大きな背景アイコンで視覚的なインパクトを追加
- 接続線や矢印で情報間の関係性を明示
- 余白を効果的に活用して視認性を確保
- アニメーションやホバーエフェクトで動きを表現

## タイムライン表現 (必須要素を含む)
- タイムラインを中央に縦に配置し、左右交互にカードを表示
- 各ステップに数字とアイコンを付与
- ステップごとに異なるアクセントカラーを使用
- 大きな背景アイコンでコンテンツを視覚的に補強
- コンテンツの階層と関連性を視覚的に明確化
- **必須**: 各ステップには日付装飾（フラップ）とサークルアイコンを必ず付ける
- **必須**: サークルは丸型で、内部にFont Awesomeアイコンを配置する

### タイムラインCSSコード例
\`\`\`css
/* タイムライン要素 */
.${promptArgs.uniqueId} ul.timeline {
  --col-gap: 2rem;
  --row-gap: 2rem;
  --line-w: 0.25rem;
  display: grid;
  grid-template-columns: var(--line-w) 1fr;
  grid-auto-columns: max-content;
  column-gap: var(--col-gap);
  list-style: none;
  width: min(60rem, 100%);
  margin-inline: auto;
  margin-bottom: 2rem;
}

/* タイムラインの線 */
.${promptArgs.uniqueId} ul.timeline::before {
  content: "";
  grid-column: 1;
  grid-row: 1 / span 20;
  background: ${promptArgs.themeColors.secondary};
  border-radius: calc(var(--line-w) / 2);
}

/* カード間の余白 */
.${promptArgs.uniqueId} ul.timeline li:not(:last-child) {
  margin-bottom: var(--row-gap);
}

/* タイムラインカード */
.${promptArgs.uniqueId} ul.timeline li {
  grid-column: 2;
  --inlineP: 1.5rem;
  margin-inline: var(--inlineP);
  grid-row: span 2;
  display: grid;
  grid-template-rows: min-content min-content min-content;
}

/* ステップ番号 */
.${promptArgs.uniqueId} ul.timeline li .date {
  --dateH: 3rem;
  height: var(--dateH);
  margin-inline: calc(var(--inlineP) * -1);
  text-align: center;
  background-color: var(--accent-color);
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
  display: grid;
  place-content: center;
  position: relative;
  border-radius: calc(var(--dateH) / 2) 0 0 calc(var(--dateH) / 2);
  font-family: 'Kaisei Decol', serif;
}

/* 日付のフラップ装飾 - 必須要素 */
.${promptArgs.uniqueId} ul.timeline li .date::before {
  content: "";
  width: var(--inlineP);
  aspect-ratio: 1;
  background: var(--accent-color);
  background-image: linear-gradient(rgba(0, 0, 0, 0.2) 100%, transparent);
  position: absolute;
  top: 100%;
  clip-path: polygon(0 0, 100% 0, 0 100%);
  right: 0;
}

/* サークル - 必須要素 */
.${promptArgs.uniqueId} ul.timeline li .date::after {
  content: "";
  position: absolute;
  width: 2.8rem;
  aspect-ratio: 1;
  background: var(--bgColor);
  border: 0.4rem solid var(--accent-color);
  border-radius: 50%;
  top: 50%;
  transform: translate(50%, -50%);
  right: calc(100% + var(--col-gap) + var(--line-w) / 2);
  font-family: "Font Awesome 6 Free";
  font-weight: 900;
  color: var(--accent-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  z-index: 2;
}

/* タイトルと説明 */
.${promptArgs.uniqueId} ul.timeline li .title,
.${promptArgs.uniqueId} ul.timeline li .descr {
  background: white;
  position: relative;
  padding-inline: 1.5rem;
}

.${promptArgs.uniqueId} ul.timeline li .title {
  overflow: hidden;
  padding-block-start: 1.5rem;
  padding-block-end: 1rem;
  font-weight: 500;
  font-family: 'Kaisei Decol', serif;
  font-size: 1.2rem;
  color: ${promptArgs.themeColors.primary};
}

.${promptArgs.uniqueId} ul.timeline li .descr {
  padding-block-end: 1.5rem;
  font-weight: 300;
  font-family: 'Zen Kurenaido', sans-serif;
}

/* 左右配置のためのメディアクエリ */
@media (min-width: 40rem) {
  .${promptArgs.uniqueId} ul.timeline {
    grid-template-columns: 1fr var(--line-w) 1fr;
  }
  
  .${promptArgs.uniqueId} ul.timeline::before {
    grid-column: 2;
  }
  
  .${promptArgs.uniqueId} ul.timeline li:nth-child(odd) {
    grid-column: 1;
  }
  
  .${promptArgs.uniqueId} ul.timeline li:nth-child(even) {
    grid-column: 3;
  }
  
  /* ステップ2のスタート位置 */
  .${promptArgs.uniqueId} ul.timeline li:nth-child(2) {
    grid-row: 2/4;
  }
  
  .${promptArgs.uniqueId} ul.timeline li:nth-child(odd) .date::before {
    clip-path: polygon(0 0, 100% 0, 100% 100%);
    left: 0;
  }
  
  .${promptArgs.uniqueId} ul.timeline li:nth-child(odd) .date::after {
    transform: translate(-50%, -50%);
    left: calc(100% + var(--col-gap) + var(--line-w) / 2);
  }
  
  .${promptArgs.uniqueId} ul.timeline li:nth-child(odd) .date {
    border-radius: 0 calc(var(--dateH) / 2) calc(var(--dateH) / 2) 0;
  }
}

/* タイムライン上の大きなアイコン */
.${promptArgs.uniqueId} .timeline-icon-large {
  position: absolute;
  font-size: 80px;
  color: rgba(${parseInt(promptArgs.themeColors.primary.slice(1, 3), 16)}, ${parseInt(promptArgs.themeColors.primary.slice(3, 5), 16)}, ${parseInt(promptArgs.themeColors.primary.slice(5, 7), 16)}, 0.1);
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 0;
  animation: float-${promptArgs.uniqueId} 3s ease-in-out infinite;
}

/* アイコンアニメーションエフェクト */
@keyframes float-${promptArgs.uniqueId} {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
}

/* ステップアイコン - バリアントに応じて変更 */
.${promptArgs.uniqueId} .timeline-item:nth-child(1) .date::after {
  content: "\\f395"; /* docker */
}

.${promptArgs.uniqueId} .timeline-item:nth-child(2) .date::after {
  content: "\\f15c"; /* file */
}

.${promptArgs.uniqueId} .timeline-item:nth-child(3) .date::after {
  content: "\\f234"; /* user-plus */
}

.${promptArgs.uniqueId} .timeline-item:nth-child(4) .date::after {
  content: "\\f2f6"; /* sign-in */
}
\`\`\`

## 全体的な指針
- スコープされたCSSと完全なHTMLを出力してください
- すべてのCSSセレクタに .${promptArgs.uniqueId} プレフィックスを付けてスコープしてください
- 読み手が自然に視線を移動できる配置
- 情報の階層と関連性を視覚的に明確化
- 手書き風の要素で親しみやすさを演出
- 視覚的な記憶に残るデザイン
- フッターに出典情報を明記
- **必須**: タイムラインには必ず「丸とフラップ装飾」を適用すること（上記CSS仕様を必ず含める）
- バリアント（${promptArgs.variant}）に応じたデザインバリエーションを提供する：
  - バリアント1: 標準的でバランスの取れたデザイン
  - バリアント2: より大胆で視覚的なインパクトを重視したデザイン
  - バリアント3: よりシンプルでミニマルなデザイン

## 出力形式
<style>...</style>
<div class="${promptArgs.uniqueId}">...</div>

このガイドラインに従って、プロフェッショナルで視覚的に魅力的なグラフィックレコーディングを生成してください。`;

    const systemPrompt = `
あなたは「グラフィックレコーディング・マスター」として知られる世界最高峰のビジュアルデザイナーです。
以下の指示に従って、タイムライン付きのHTML/CSSグラフィックレコーディングを生成してください。

${basePrompt}

出力は必ず以下の形式にしてください：
<style>/* CSSコード全体をここに記述 */</style>
<div class="${promptArgs.uniqueId}"><!-- HTMLコード全体をここに記述 --></div>

CSS内のすべてのセレクタに .${promptArgs.uniqueId} プレフィックスを付けて、他のスタイルと競合しないようにしてください。
HTMLはすべて <div class="${promptArgs.uniqueId}"> 内にスコープしてください。

最高品質のビジュアルとタイムラインを生成し、特に指定されたテーマカラーとバリアントに注意してください。`;

    let graphicRecordingHtml = `<style>.error-grafreco { background: #ffe0e0; color: red; padding: 20px; }</style><div class="error-grafreco"><h1>エラー</h1><p>グラフィックレコーディングを生成できませんでした。</p></div>`;
    let message = `タイトル「${title || '無題'}」のグラフィックレコーディングの生成に失敗しました。`;
    let variantInfo = variant && variant > 1 ? ` (バリアント ${variant})` : '';

    try {
      const { text: generatedHtml } = await generateText({
        model: anthropic('claude-opus-4-20250514'), // Claude Opusモデルを使用
        prompt: systemPrompt,
      });

      // 基本的な検証
      if (generatedHtml && 
          generatedHtml.trim().includes('<style>') &&
          generatedHtml.trim().includes('</style>') &&
          generatedHtml.trim().includes(`<div class="${uniqueId}">`)) {
        graphicRecordingHtml = generatedHtml.trim();
        message = `タイトル「${title || '無題'}」のグラフィックレコーディングを生成しました${variantInfo}。${validSteps}ステップのタイムラインが含まれています。`;
      } else {
        console.warn("[graphicRecordingTool] LLM出力が期待する形式と一致しませんでした。フォールバックを使用します。", generatedHtml);
        // フォールバック
        graphicRecordingHtml = `<style>.fallback-grafreco-${uniqueId} { padding: 20px; border: 1px solid #ddd; }</style><div class="fallback-grafreco-${uniqueId}"><h1>${title || '無題'}</h1><p>グラフィックレコーディングの生成に問題が発生しました。内容: ${content.substring(0, 100)}...</p></div>`;
        message = `警告: タイトル「${title || '無題'}」のグラフィックレコーディングの形式が正しくない可能性があります。`;
      }
    } catch (error) {
      console.error('[graphicRecordingTool] グラフィックレコーディング生成エラー:', error);
      // デフォルトのエラーHTMLとメッセージを使用
    }

    // プレビュー用のコンポーネントデータを準備
    const previewData = {
      htmlContent: graphicRecordingHtml,
      title: title || '無題のグラフィックレコーディング',
      theme: theme || 'green',
      steps: validSteps,
      variant: variant || 1
    };

    return {
      htmlContent: graphicRecordingHtml,
      message: message,
      variant: variant || 1,
      theme: theme || 'green',
      steps: validSteps,
      previewData: previewData, // プレビューコンポーネント用のデータ
      autoPreview: autoPreview !== false // 自動プレビューフラグ
    };
  },
}); 