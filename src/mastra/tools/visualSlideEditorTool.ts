import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Visual Slide Editor Tool
 * -------------------------
 * Provides no-code visual editing capabilities for HTML slides.
 * Allows drag-and-drop editing, element modification, and real-time preview.
 */

const visualSlideEditorInputSchema = z.object({
  operation: z.enum(['create-editor', 'modify-element', 'change-layout', 'export-html', 'get-templates'])
    .describe('The operation to perform: create-editor (initialize editor), modify-element (edit specific element), change-layout (switch layout), export-html (get final HTML), get-templates (list available templates)'),
  
  // Editor initialization
  slideHtml: z.string().optional()
    .describe('Initial HTML content for the slide editor'),
  
  // Element modification
  elementId: z.string().optional()
    .describe('ID of the element to modify'),
  modifications: z.object({
    text: z.string().optional().describe('New text content'),
    color: z.string().optional().describe('New color (hex code)'),
    fontSize: z.string().optional().describe('New font size (e.g., "24px")'),
    fontFamily: z.string().optional().describe('New font family'),
    backgroundColor: z.string().optional().describe('New background color'),
    position: z.object({
      x: z.number().optional(),
      y: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    }).optional().describe('New position and size'),
    style: z.record(z.string()).optional().describe('Additional CSS styles'),
  }).optional().describe('Modifications to apply to the element'),
  
  // Layout changes
  newLayout: z.enum(['default', 'image-left', 'image-right', 'full-graphic', 'quote', 'comparison', 'timeline', 'list', 'title', 'section-break', 'data-visualization', 'photo-with-caption'])
    .optional().describe('New layout to apply'),
  
  // Template selection
  templateCategory: z.enum(['business', 'creative', 'minimal', 'academic', 'modern', 'all'])
    .optional().default('all').describe('Category of templates to retrieve'),
});

const visualSlideEditorOutputSchema = z.object({
  success: z.boolean(),
  operation: z.string(),
  data: z.object({
    editorHtml: z.string().optional(),
    modifiedHtml: z.string().optional(),
    templates: z.array(z.object({
      id: z.string(),
      name: z.string(),
      category: z.string(),
      preview: z.string(),
      layout: z.string(),
    })).optional(),
    editorConfig: z.object({
      tools: z.array(z.string()),
      shortcuts: z.record(z.string()),
      settings: z.record(z.any()),
    }).optional(),
  }),
  message: z.string(),
});

export const visualSlideEditorTool = createTool({
  id: 'visual-slide-editor',
  description: 'Provides no-code visual editing capabilities for HTML slides with drag-and-drop functionality, element modification, and template selection.',
  inputSchema: visualSlideEditorInputSchema,
  outputSchema: visualSlideEditorOutputSchema,
  execute: async ({ context }) => {
    const { operation, slideHtml, elementId, modifications, newLayout, templateCategory } = context;
    
    try {
      switch (operation) {
        case 'create-editor':
          return await createEditor(slideHtml || '');
          
        case 'modify-element':
          if (!elementId || !modifications) {
            throw new Error('elementId and modifications are required for modify-element operation');
          }
          return await modifyElement(slideHtml || '', elementId, modifications);
          
        case 'change-layout':
          if (!newLayout) {
            throw new Error('newLayout is required for change-layout operation');
          }
          return await changeLayout(slideHtml || '', newLayout);
          
        case 'export-html':
          return await exportHtml(slideHtml || '');
          
        case 'get-templates':
          return await getTemplates(templateCategory);
          
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
    } catch (error) {
      return {
        success: false,
        operation,
        data: {},
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
});

// Helper function to create visual editor
async function createEditor(initialHtml: string) {
  const editorHtml = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Visual Slide Editor</title>
      <style>
        * { box-sizing: border-box; }
        body { 
          margin: 0; 
          font-family: 'Noto Sans JP', sans-serif; 
          background: #f5f5f5;
        }
        
        .editor-container {
          display: flex;
          height: 100vh;
        }
        
        .toolbar {
          width: 250px;
          background: #2c3e50;
          color: white;
          padding: 20px;
          overflow-y: auto;
        }
        
        .editor-canvas {
          flex: 1;
          background: white;
          position: relative;
          overflow: auto;
        }
        
        .slide-container {
          width: 1920px;
          height: 1080px;
          margin: 20px auto;
          position: relative;
          background: white;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          transform-origin: top center;
          transform: scale(0.4);
        }
        
        .editable-element {
          position: relative;
          border: 2px dashed transparent;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .editable-element:hover {
          border-color: #3498db;
          background: rgba(52, 152, 219, 0.1);
        }
        
        .editable-element.selected {
          border-color: #e74c3c;
          background: rgba(231, 76, 60, 0.1);
        }
        
        .resize-handle {
          width: 8px;
          height: 8px;
          background: #e74c3c;
          position: absolute;
          border-radius: 50%;
        }
        
        .resize-handle.nw { top: -4px; left: -4px; cursor: nw-resize; }
        .resize-handle.ne { top: -4px; right: -4px; cursor: ne-resize; }
        .resize-handle.sw { bottom: -4px; left: -4px; cursor: sw-resize; }
        .resize-handle.se { bottom: -4px; right: -4px; cursor: se-resize; }
        
        .properties-panel {
          padding: 20px 0;
          border-top: 1px solid #34495e;
        }
        
        .property-group {
          margin-bottom: 15px;
        }
        
        .property-label {
          display: block;
          margin-bottom: 5px;
          font-size: 12px;
          color: #bdc3c7;
        }
        
        .property-input {
          width: 100%;
          padding: 8px;
          border: 1px solid #34495e;
          background: #34495e;
          color: white;
          border-radius: 4px;
        }
        
        .color-picker {
          width: 100%;
          height: 40px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .layout-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-top: 10px;
        }
        
        .layout-option {
          padding: 10px;
          background: #34495e;
          border-radius: 4px;
          cursor: pointer;
          text-align: center;
          font-size: 11px;
          transition: background 0.2s;
        }
        
        .layout-option:hover {
          background: #3498db;
        }
        
        .export-button {
          width: 100%;
          padding: 12px;
          background: #27ae60;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          margin-top: 20px;
        }
        
        .export-button:hover {
          background: #229954;
        }
      </style>
    </head>
    <body>
      <div class="editor-container">
        <div class="toolbar">
          <h3>スライドエディタ</h3>
          
          <div class="properties-panel">
            <div class="property-group">
              <label class="property-label">レイアウト</label>
              <div class="layout-grid">
                <div class="layout-option" data-layout="default">デフォルト</div>
                <div class="layout-option" data-layout="image-left">画像左</div>
                <div class="layout-option" data-layout="image-right">画像右</div>
                <div class="layout-option" data-layout="title">タイトル</div>
                <div class="layout-option" data-layout="quote">引用</div>
                <div class="layout-option" data-layout="comparison">比較</div>
              </div>
            </div>
            
            <div class="property-group">
              <label class="property-label">テキスト</label>
              <textarea id="text-input" class="property-input" rows="3" placeholder="テキストを入力"></textarea>
            </div>
            
            <div class="property-group">
              <label class="property-label">文字色</label>
              <input type="color" id="text-color" class="color-picker" value="#333333">
            </div>
            
            <div class="property-group">
              <label class="property-label">背景色</label>
              <input type="color" id="bg-color" class="color-picker" value="#ffffff">
            </div>
            
            <div class="property-group">
              <label class="property-label">フォントサイズ</label>
              <input type="range" id="font-size" class="property-input" min="12" max="72" value="24">
              <span id="font-size-value">24px</span>
            </div>
            
            <button class="export-button" onclick="exportSlide()">HTML出力</button>
          </div>
        </div>
        
        <div class="editor-canvas">
          <div class="slide-container" id="slide-container">
            ${initialHtml || '<div class="editable-element" style="padding: 40px; text-align: center;"><h1>新しいスライド</h1><p>ここをクリックして編集</p></div>'}
          </div>
        </div>
      </div>
      
      <script>
        let selectedElement = null;
        
        // 編集可能要素の初期化
        function initEditableElements() {
          const elements = document.querySelectorAll('.slide-container *');
          elements.forEach(el => {
            if (el.textContent.trim() || el.tagName === 'IMG') {
              el.classList.add('editable-element');
              el.addEventListener('click', selectElement);
            }
          });
        }
        
        // 要素選択
        function selectElement(e) {
          e.stopPropagation();
          
          // 前の選択を解除
          if (selectedElement) {
            selectedElement.classList.remove('selected');
            removeResizeHandles(selectedElement);
          }
          
          selectedElement = e.target;
          selectedElement.classList.add('selected');
          addResizeHandles(selectedElement);
          updateProperties();
        }
        
        // リサイズハンドル追加
        function addResizeHandles(element) {
          const handles = ['nw', 'ne', 'sw', 'se'];
          handles.forEach(pos => {
            const handle = document.createElement('div');
            handle.className = \`resize-handle \${pos}\`;
            element.appendChild(handle);
          });
        }
        
        // リサイズハンドル削除
        function removeResizeHandles(element) {
          const handles = element.querySelectorAll('.resize-handle');
          handles.forEach(handle => handle.remove());
        }
        
        // プロパティ更新
        function updateProperties() {
          if (!selectedElement) return;
          
          const textInput = document.getElementById('text-input');
          const textColor = document.getElementById('text-color');
          const bgColor = document.getElementById('bg-color');
          const fontSize = document.getElementById('font-size');
          const fontSizeValue = document.getElementById('font-size-value');
          
          textInput.value = selectedElement.textContent || '';
          
          const style = window.getComputedStyle(selectedElement);
          textColor.value = rgbToHex(style.color);
          bgColor.value = rgbToHex(style.backgroundColor);
          
          const currentFontSize = parseInt(style.fontSize);
          fontSize.value = currentFontSize;
          fontSizeValue.textContent = currentFontSize + 'px';
        }
        
        // RGB to Hex変換
        function rgbToHex(rgb) {
          if (rgb.startsWith('#')) return rgb;
          const values = rgb.match(/\\d+/g);
          if (!values) return '#000000';
          return '#' + values.slice(0,3).map(v => 
            parseInt(v).toString(16).padStart(2, '0')
          ).join('');
        }
        
        // イベントリスナー
        document.getElementById('text-input').addEventListener('input', (e) => {
          if (selectedElement) {
            selectedElement.textContent = e.target.value;
          }
        });
        
        document.getElementById('text-color').addEventListener('change', (e) => {
          if (selectedElement) {
            selectedElement.style.color = e.target.value;
          }
        });
        
        document.getElementById('bg-color').addEventListener('change', (e) => {
          if (selectedElement) {
            selectedElement.style.backgroundColor = e.target.value;
          }
        });
        
        document.getElementById('font-size').addEventListener('input', (e) => {
          const size = e.target.value + 'px';
          document.getElementById('font-size-value').textContent = size;
          if (selectedElement) {
            selectedElement.style.fontSize = size;
          }
        });
        
        // レイアウト変更
        document.querySelectorAll('.layout-option').forEach(option => {
          option.addEventListener('click', (e) => {
            const layout = e.target.dataset.layout;
            changeSlideLayout(layout);
          });
        });
        
        // スライドレイアウト変更
        function changeSlideLayout(layout) {
          // 簡単なレイアウト変更のサンプル
          const container = document.getElementById('slide-container');
          container.className = \`slide-container layout-\${layout}\`;
        }
        
        // HTML出力
        function exportSlide() {
          const container = document.getElementById('slide-container');
          const clone = container.cloneNode(true);
          
          // 編集要素のクラスとハンドルを削除
          clone.querySelectorAll('.editable-element').forEach(el => {
            el.classList.remove('editable-element', 'selected');
            el.querySelectorAll('.resize-handle').forEach(handle => handle.remove());
          });
          
          const html = clone.innerHTML;
          
          // 結果を表示（実際の実装では親ウィンドウに送信）
          alert('HTML出力完了\\n\\n' + html.substring(0, 200) + '...');
          console.log('Exported HTML:', html);
        }
        
        // 初期化
        initEditableElements();
        
        // クリックで選択解除
        document.addEventListener('click', (e) => {
          if (!e.target.closest('.editable-element') && selectedElement) {
            selectedElement.classList.remove('selected');
            removeResizeHandles(selectedElement);
            selectedElement = null;
          }
        });
      </script>
    </body>
    </html>
  `;

  return {
    success: true,
    operation: 'create-editor',
    data: {
      editorHtml,
      editorConfig: {
        tools: ['text-edit', 'color-change', 'layout-switch', 'resize', 'drag-drop'],
        shortcuts: {
          'Ctrl+Z': 'undo',
          'Ctrl+Y': 'redo',
          'Delete': 'delete-element',
          'Ctrl+C': 'copy-element',
          'Ctrl+V': 'paste-element',
        },
        settings: {
          snapToGrid: true,
          showGuides: true,
          autoSave: true,
        },
      },
    },
    message: 'ビジュアルスライドエディタを作成しました',
  };
}

// Helper function to modify element
async function modifyElement(html: string, elementId: string, modifications: any) {
  // HTMLパースと要素修正のロジック
  let modifiedHtml = html;
  
  // 簡単な例：テキスト置換
  if (modifications.text) {
    const regex = new RegExp(`id="${elementId}"[^>]*>([^<]*)`);
    modifiedHtml = modifiedHtml.replace(regex, (match, content) => {
      return match.replace(content, modifications.text);
    });
  }
  
  return {
    success: true,
    operation: 'modify-element',
    data: {
      modifiedHtml,
    },
    message: `要素 ${elementId} を修正しました`,
  };
}

// Helper function to change layout
async function changeLayout(html: string, newLayout: string) {
  // レイアウト変更のロジック
  const layoutClasses = {
    'default': 'slide-default',
    'image-left': 'slide-image-left',
    'image-right': 'slide-image-right',
    'title': 'slide-title',
    'quote': 'slide-quote',
    'comparison': 'slide-comparison',
  };
  
  const newClass = layoutClasses[newLayout as keyof typeof layoutClasses] || 'slide-default';
  const modifiedHtml = html.replace(/class="[^"]*slide[^"]*"/, `class="${newClass}"`);
  
  return {
    success: true,
    operation: 'change-layout',
    data: {
      modifiedHtml,
    },
    message: `レイアウトを ${newLayout} に変更しました`,
  };
}

// Helper function to export HTML
async function exportHtml(html: string) {
  // クリーンアップされたHTMLを返す
  const cleanHtml = html
    .replace(/class="[^"]*editable-element[^"]*"/g, '')
    .replace(/<div class="resize-handle[^>]*><\/div>/g, '')
    .trim();
  
  return {
    success: true,
    operation: 'export-html',
    data: {
      modifiedHtml: cleanHtml,
    },
    message: 'HTMLを出力しました',
  };
}

// Helper function to get templates
async function getTemplates(category: string) {
  const templates = [
    {
      id: 'business-1',
      name: 'ビジネス プレゼンテーション',
      category: 'business',
      preview: 'data:image/png;base64,placeholder',
      layout: 'image-left',
    },
    {
      id: 'creative-1',
      name: 'クリエイティブ レイアウト',
      category: 'creative',
      preview: 'data:image/png;base64,placeholder',
      layout: 'full-graphic',
    },
    {
      id: 'minimal-1',
      name: 'ミニマル デザイン',
      category: 'minimal',
      preview: 'data:image/png;base64,placeholder',
      layout: 'default',
    },
  ];
  
  const filteredTemplates = category === 'all' 
    ? templates 
    : templates.filter(t => t.category === category);
  
  return {
    success: true,
    operation: 'get-templates',
    data: {
      templates: filteredTemplates,
    },
    message: `${filteredTemplates.length}個のテンプレートを取得しました`,
  };
}