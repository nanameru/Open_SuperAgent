// ユーティリティ関数：slideCreatorAgentから動的にツール情報を取得
// 将来的にエージェントのツールが変更された際に、この関数を使用して動的に取得可能

import { slideCreatorAgent } from '@/src/mastra/agents/slideCreatorAgent';

export interface ToolInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  features: string[];
}

/**
 * slideCreatorAgentから動的にツール情報を取得
 * 注意: この関数はサーバーサイドでのみ使用可能です
 */
export async function getAgentToolsDynamic(): Promise<ToolInfo[]> {
  try {
    // slideCreatorAgentからツール情報を取得
    const agentTools = slideCreatorAgent.tools || {};
    const toolNames = Object.keys(agentTools);
    
    return toolNames.map(toolName => {
      // ツール名から表示名を生成
      const displayName = toolName.replace(/Tool$/, '').replace(/([A-Z])/g, ' $1').trim();
      const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
      
      return {
        id: toolName,
        name: formattedName,
        description: `${formattedName}の機能を提供します。`,
        category: 'AI ツール',
        features: ['高性能', 'AI強化', '自動化']
      };
    });
  } catch (error) {
    console.error('エージェントからツール情報を取得できませんでした:', error);
    return [];
  }
}

/**
 * ツール名のリストを取得（クライアントサイドでも使用可能）
 */
export function getAgentToolNames(): string[] {
  return [
    'htmlSlideTool',
    'presentationPreviewTool',
    'webSearchTool',
    'grokXSearchTool',
    'geminiImageGenerationTool',
    'geminiVideoGenerationTool',
    'imagen4GenerationTool',
    'graphicRecordingTool'
  ];
}

/**
 * 新しいツールが追加された際の自動検出機能
 * slideCreatorAgent.tsのツール定義と現在のリストを比較
 */
export function detectNewTools(): string[] {
  try {
    const currentTools = getAgentToolNames();
    const agentTools = slideCreatorAgent.tools || {};
    const actualToolNames = Object.keys(agentTools);
    
    // 新しく追加されたツールを検出
    const newTools = actualToolNames.filter(toolName => !currentTools.includes(toolName));
    
    if (newTools.length > 0) {
      console.log('新しいツールが検出されました:', newTools);
      console.log('app/tools/page.tsx の agentToolNames 配列を更新してください');
    }
    
    return newTools;
  } catch (error) {
    console.error('ツール検出エラー:', error);
    return [];
  }
} 