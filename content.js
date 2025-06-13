/**
 * 内容脚本，负责处理页面内容和侧边栏显示
 */

// 创建侧边栏元素
let sidebar = null;
let isProcessing = false;
let floatingButton = null;
let isSidebarOpen = false; // 跟踪侧边栏状态

// 添加防抖函数
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

// 处理选择变化的函数，将在初始化时被包装为防抖版本
function _handleSelectionChange() {
  const selectedText = getSelectedText();
  
  if (!selectedText) {
    hideFloatingButton();
    return;
  }
  
  // 如果侧边栏打开，自动翻译选中的文本
  if (isSidebarOpen && selectedText.length > 0) {
    console.log("Sidebar is open, auto translating:", selectedText);
    explainText(selectedText);
    hideFloatingButton(); // 不需要显示悬浮按钮
    return;
  }
  
  // 如果侧边栏未打开，显示悬浮按钮
  if (selectedText.length > 0 && !isSidebarOpen) {
    try {
      // 尝试获取选择区域的位置
      let rect = null;
      
      if (window.getSelection && window.getSelection().rangeCount > 0) {
        rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
      } else if (document.selection && document.selection.type !== 'Control') {
        rect = document.selection.createRange().getBoundingClientRect();
      }
      
      if (rect) {
        // 将按钮放在选择区域的右上方
        showFloatingButton(
          rect.right + window.scrollX, 
          rect.top + window.scrollY
        );
      } else {
        // 如果无法获取位置，则放在视口中间
        showFloatingButton(
          window.innerWidth / 2 + window.scrollX,
          window.innerHeight / 2 + window.scrollY
        );
      }
    } catch (e) {
      console.error("无法显示悬浮按钮:", e);
    }
  } else {
    hideFloatingButton();
  }
}

// 创建防抖版本的handleSelectionChange函数，必须在使用前定义
const handleSelectionChange = debounce(_handleSelectionChange, 1000);

// 等待DOM加载完成后再初始化
console.log("English Explainer content script loaded");

// 检查DOM状态并初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  // DOM已经加载完成，立即初始化
  initializeExtension();
}

function initializeExtension() {
  // 确保DOM已经准备好
  if (!document.body) {
    console.log("DOM not ready, waiting...");
    setTimeout(initializeExtension, 100);
    return;
  }
  
  console.log("Initializing extension...");
  
  // 创建侧边栏
  createSidebar();
  
  // 创建悬浮按钮（但不立即添加到DOM）
  createFloatingButton();
  
  // 注册消息监听器
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Message received:", request);
    if (request.action === 'explainText' && request.text) {
      console.log("Processing text:", request.text);
      explainText(request.text);
      sendResponse({success: true});
    } else if (request.action === 'openSidebar') {
      console.log("Opening sidebar");
      openSidebar();
      sendResponse({success: true});
    } else if (request.action === 'resetStatus') {
      console.log("Resetting plugin status");
      resetPluginState();
      sendResponse({success: true});
    }
    return true;
  });
  
  // 监听自定义事件（来自background script）
  document.addEventListener('englishExplainerExplainText', (event) => {
    console.log("Custom event received:", event.detail);
    if (event.detail && event.detail.text) {
      explainText(event.detail.text);
    }
  });
  
  // 监听打开侧边栏的自定义事件
  document.addEventListener('englishExplainerOpenSidebar', () => {
    console.log("Open sidebar event received");
    openSidebar();
  });
  
  // 监听重置状态的自定义事件
  document.addEventListener('englishExplainerResetStatus', () => {
    console.log("Reset status event received");
    resetPluginState();
  });
  
  // 监听选择事件，使用防抖版本的handleSelectionChange
  document.addEventListener('mouseup', handleSelectionChange);
  document.addEventListener('selectionchange', () => {
    // 不再需要setTimeout，因为handleSelectionChange已经是防抖函数
    handleSelectionChange();
  });
}

// 为输入框添加事件监听器
function setupInputAreaListeners() {
  setTimeout(() => {
    const inputArea = document.getElementById('english-explainer-input');
    const translateBtn = document.getElementById('english-explainer-translate-btn');
    const resetBtn = document.getElementById('english-explainer-reset-btn');
    
    if (inputArea && translateBtn) {
      translateBtn.addEventListener('click', () => {
        const text = inputArea.value.trim();
        if (text) {
          explainText(text);
        }
      });
      
      // 支持Ctrl+Enter快捷键
      inputArea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          const text = inputArea.value.trim();
          if (text) {
            explainText(text);
          }
          e.preventDefault();
        }
      });
    }
    
    // 添加重置按钮事件监听
    if (resetBtn) {
      resetBtn.addEventListener('click', resetPluginState);
    }
  }, 100); // 短暂延迟确保元素已添加到DOM
}

// 打开侧边栏
function openSidebar() {
  if (!sidebar) createSidebar();
  
  // 更新侧边栏内容为欢迎信息和输入区域
  const content = sidebar.querySelector('.sidebar-content');
  content.innerHTML = `
    <div class="welcome-message">
      <h4>欢迎使用English Explainer!</h4>
      <p>在任意网页上选择英文文本，即可在此处查看详细解释。</p>
      <p>您也可以直接在下方输入或粘贴英文文本进行解释。</p>
    </div>
    
    <div class="input-area">
      <textarea id="english-explainer-input" placeholder="在此输入或粘贴英文文本..."></textarea>
      <div class="button-group">
        <button id="english-explainer-translate-btn">解释文本</button>
        <button id="english-explainer-reset-btn" class="reset-btn">重置状态</button>
      </div>
    </div>
  `;
  
  // 显示侧边栏
  sidebar.classList.remove('hidden');
  isSidebarOpen = true;
  
  // 为输入区域添加事件监听
  setupInputAreaListeners();
}

// 获取选中的文本
function getSelectedText() {
  let text = '';
  
  // 获取当前窗口的选中文本
  if (window.getSelection) {
    text = window.getSelection().toString().trim();
    console.log("获取的选中文本:", text);
  } else if (document.selection && document.selection.type !== 'Control') {
    text = document.selection.createRange().text.trim();
  }
  
  return text;
}

// 初始化侧边栏
function createSidebar() {
  if (sidebar) return;
  
  console.log("Creating sidebar");
  
  sidebar = document.createElement('div');
  sidebar.id = 'english-explainer-sidebar';
  sidebar.className = 'english-explainer-sidebar hidden';
  
  // 创建侧边栏HTML结构
  sidebar.innerHTML = `
    <div class="sidebar-header">
      <h3>English Explainer</h3>
      <button class="close-btn">×</button>
    </div>
    <div class="sidebar-content">
      <div class="loading">Loading...</div>
    </div>
  `;
  
  document.body.appendChild(sidebar);
  
  // 添加事件监听器
  sidebar.querySelector('.close-btn').addEventListener('click', hideSidebar);
}

// 隐藏侧边栏
function hideSidebar() {
  if (sidebar) {
    sidebar.classList.add('hidden');
    isSidebarOpen = false;
  }
}

// 更新侧边栏内容
function updateSidebarContent(originalText, explanation) {
  if (!sidebar) createSidebar();
  
  console.log("Updating sidebar content");
  
  const content = sidebar.querySelector('.sidebar-content');
  
  // 检查是否存在API状态日志容器
  const apiStatusContainer = document.getElementById('api-status-container');
  let apiStatusHtml = '';
  
  if (apiStatusContainer) {
    // 保存API状态日志
    apiStatusHtml = `
      <div class="api-status" id="api-status-container">
        <h4>API Call Status:</h4>
        <div id="api-status-log" class="api-status-log">
          ${document.getElementById('api-status-log').innerHTML}
        </div>
        <div class="status-actions">
          <button id="toggle-api-status" class="small-btn">Hide Debug Info</button>
          <button id="clear-api-status" class="small-btn">Clear</button>
        </div>
      </div>
    `;
  }
  
  content.innerHTML = `
    <div class="original-text">
      <h3><span></span>Original Text</h3>
      <p>${originalText}</p>
      <button class="listen-btn"><span></span>Listen</button>
    </div>
    
    <div class="explanation">
      ${explanation}
    </div>
    
    ${apiStatusHtml}
    
    <div class="input-area">
      <h4>Try another text:</h4>
      <textarea id="english-explainer-input" placeholder="Enter or paste English text here..."></textarea>
      <div class="button-group">
        <button id="english-explainer-translate-btn">Explain Text</button>
        <button id="english-explainer-reset-btn" class="reset-btn">Reset</button>
      </div>
    </div>
  `;
  
  sidebar.classList.remove('hidden');
  isSidebarOpen = true; // 更新侧边栏状态
  
  // 为输入区域添加事件监听
  setupInputAreaListeners();
  
  // 添加API状态日志的事件监听
  setupApiStatusListeners();
  
  // 设置标签页切换功能和其他监听器
  setupTabsAndListeners();
  
  // 为新生成的标签页设置事件监听器（延迟执行确保DOM已更新）
  setTimeout(() => {
    setupTabEventListeners();
  }, 200);
}

// 设置标签页和监听器
function setupTabsAndListeners() {
  setTimeout(() => {
    // 设置朗读按钮
    const listenBtn = document.querySelector('.listen-btn');
    if (listenBtn) {
      listenBtn.addEventListener('click', function() {
        const text = document.querySelector('.original-text p').textContent;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
      });
    }
    
    // 设置词汇朗读按钮
    const listenWordBtns = document.querySelectorAll('.listen-word');
    if (listenWordBtns && listenWordBtns.length > 0) {
      listenWordBtns.forEach(btn => {
        btn.addEventListener('click', function() {
          const word = this.getAttribute('data-word');
          if (word) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);
          }
        });
      });
    }
    
    // 设置标签页切换 - 支持动态生成的标签页
    setupTabEventListeners();
  }, 100);
}

// 通用的标签页事件监听器设置函数
function setupTabEventListeners() {
  // 找到所有标签页容器
  const allTabsContainers = document.querySelectorAll('.tabs');
  
  allTabsContainers.forEach(tabsContainer => {
    const tabs = tabsContainer.querySelectorAll('.tab');
    const containerId = tabsContainer.id;
    
    // 为每个标签页添加事件监听器
    tabs.forEach(tab => {
      // 检查是否已经有事件监听器
      if (tab.hasAttribute('data-tab-listener')) return;
      
      tab.setAttribute('data-tab-listener', 'true');
      tab.addEventListener('click', function(e) {
        e.preventDefault();
        const tabId = this.getAttribute('data-tab');
        console.log("点击标签:", tabId, "容器ID:", containerId);
        
        // 在当前容器范围内移除所有活动状态
        tabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        
        // 查找对应的内容区域
        let contentTab;
        
        // 如果有容器ID，先尝试查找带容器ID前缀的内容
        if (containerId) {
          contentTab = document.getElementById(`${containerId}-${tabId}-tab`);
        }
        
        // 如果没找到带容器ID的内容，尝试查找普通ID的内容
        if (!contentTab) {
          contentTab = document.getElementById(`${tabId}-tab`);
        }
        
        if (!contentTab) {
          console.error(`未找到内容标签: ${tabId}-tab`);
          return;
        }
        
        // 移除相关内容的活动状态
        if (containerId) {
          // 对于带容器ID的标签页，只移除同一容器下的内容
          const relatedContents = document.querySelectorAll(`[id^="${containerId}-"][id$="-tab"]`);
          relatedContents.forEach(c => c.classList.remove('active'));
        } else {
          // 对于普通标签页，移除所有没有容器ID前缀的内容
          const simpleContents = document.querySelectorAll('[id$="-tab"]:not([id^="tabs-"])');
          simpleContents.forEach(c => c.classList.remove('active'));
        }
        
        // 激活选中的内容
        contentTab.classList.add('active');
      });
    });
  });
}

// 设置API状态日志的事件监听
function setupApiStatusListeners() {
  setTimeout(() => {
    const toggleBtn = document.getElementById('toggle-api-status');
    const clearBtn = document.getElementById('clear-api-status');
    const statusLog = document.getElementById('api-status-log');
    
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (statusLog.style.display === 'none') {
          statusLog.style.display = 'block';
          toggleBtn.textContent = 'Hide Debug Info';
        } else {
          statusLog.style.display = 'none';
          toggleBtn.textContent = 'Show Debug Info';
        }
      });
    }
    
    if (clearBtn && statusLog) {
      clearBtn.addEventListener('click', () => {
        statusLog.innerHTML = '<div class="status-item">Log cleared</div>';
      });
    }
  }, 100);
}

// 显示加载状态
function showLoading() {
  if (!sidebar) createSidebar();
  
  console.log("Showing loading state");
  
  const content = sidebar.querySelector('.sidebar-content');
  content.innerHTML = `
    <div class="loading">Generating explanation...</div>
    
    <div class="api-status" id="api-status-container">
      <h4>API Call Status: <span class="status-badge">Processing</span></h4>
      <div id="api-status-log" class="api-status-log">
        <div class="status-item">Preparing API call...</div>
      </div>
      <div class="status-actions">
        <button id="toggle-api-status" class="small-btn">Hide Debug Info</button>
        <button id="clear-api-status" class="small-btn">Clear</button>
      </div>
    </div>
    
    <div class="input-area">
      <h4>Try another text:</h4>
      <textarea id="english-explainer-input" placeholder="Enter or paste English text here..."></textarea>
      <div class="button-group">
        <button id="english-explainer-translate-btn">Explain Text</button>
        <button id="english-explainer-reset-btn" class="reset-btn">Reset</button>
      </div>
    </div>
  `;
  
  sidebar.classList.remove('hidden');
  isSidebarOpen = true; // 更新侧边栏状态
  
  // 为输入区域添加事件监听
  setupInputAreaListeners();
  
  // 添加API状态日志的事件监听
  setupApiStatusListeners();
}

// 添加API状态日志
function addApiStatusLog(message, type = 'info') {
  const statusLog = document.getElementById('api-status-log');
  if (statusLog) {
    const item = document.createElement('div');
    item.className = `status-item ${type}`;
    item.textContent = message;
    statusLog.appendChild(item);
    statusLog.scrollTop = statusLog.scrollHeight; // 滚动到底部
  }
}

// 处理错误
function showError(message) {
  if (!sidebar) createSidebar();
  
  console.log("显示错误信息:", message);
  
  const content = sidebar.querySelector('.sidebar-content');
  
  // 检查message是否已经是HTML格式
  const isHTML = message.includes('<') && message.includes('>');
  
  content.innerHTML = `
    ${isHTML ? message : `<div class="error">${message}</div>`}
    
    <div class="input-area">
      <h4>Try another text:</h4>
      <textarea id="english-explainer-input" placeholder="在此输入或粘贴英文文本..."></textarea>
      <div class="button-group">
        <button id="english-explainer-translate-btn">解释文本</button>
        <button id="english-explainer-reset-btn" class="reset-btn">重置状态</button>
      </div>
    </div>
  `;
  
  sidebar.classList.remove('hidden');
  isSidebarOpen = true; // 更新侧边栏状态
  
  // 为输入区域添加事件监听
  setupInputAreaListeners();
}

// 使用本地解释功能
function generateLocalExplanation(text) {
  console.log("Generating local explanation for:", text);
  
  // 简单的通用解释，使用新的JSON响应格式
  return processJsonResponse({
    "meaning": {
      "definition": "This is a local explanation of the selected text. For more detailed explanations, please enable API in the settings.",
      "usageContext": [
        "This feature provides basic information about the selected text",
        "For more comprehensive analysis, please enable an API in the settings"
      ],
      "grammarStructure": [
        "Local analysis is limited in scope",
        "For detailed grammar analysis, please use API services"
      ],
      "usageNotes": [
        "This is a placeholder explanation",
        "Enable API for enhanced features"
      ]
    },
    "vocabulary": [
      {
        "word": "Word Count",
        "type": "Information",
        "definition": `The text contains ${text.split(' ').length} words`,
        "usage": "Used for basic text analysis",
        "synonyms": "Word length, text size"
      }
    ],
    "alternatives": [
      {
        "phrase": "Enhanced Explanation Available",
        "description": "More detailed analysis available with API enabled",
        "formality": "Informational",
        "example": "For alternative expressions and detailed analysis, please enable an API in the extension settings"
      }
    ]
  });
}

// 将API返回的文本格式化为HTML
function formatExplanationAsHtml(text) {
  // 添加日志
  console.log("开始格式化API返回的文本:", text ? text.substring(0, 100) + "..." : "null");
  addApiStatusLog("开始格式化API返回的文本");
  
  // 安全检查
  if (!text) {
    console.error("API返回的文本为空");
    addApiStatusLog("API返回的文本为空", 'error');
    return `
      <div class="explanation-content">
        <p>API returned empty content. Please try again.</p>
      </div>
    `;
  }
  
  try {
    // 提取各个部分 - 使用简化的解析
    const meaningMatch = text.match(/##\s*\**Meaning\s*&?\s*Usage\**[^\n]*\n([\s\S]*?)(?=##\s*\**Key\s*Vocabulary|##\s*\**Alternative|$)/i);
    const vocabMatch = text.match(/##\s*\**Key\s*Vocabulary\**[^\n]*\n([\s\S]*?)(?=##\s*\**Alternative|$)/i);
    const altMatch = text.match(/##\s*\**Alternative\s*Expressions\**[^\n]*\n([\s\S]*?)(?=$)/i);
    
    // 如果无法解析Markdown格式，返回原始文本
    if (!meaningMatch && !vocabMatch && !altMatch) {
      return `
        <div class="explanation-content">
          <div class="section">
            <h4>API Response</h4>
            <div style="white-space: pre-wrap; font-family: monospace; background: #f5f5f5; padding: 12px; border-radius: 4px;">
              ${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
            </div>
          </div>
        </div>
      `;
    }
    
    // 构建简化的HTML结构
    let html = '<div class="explanation-content">';
    
    if (meaningMatch) {
      html += `
        <div class="section">
          <h4>Meaning & Usage</h4>
          <div style="white-space: pre-wrap; line-height: 1.6;">
            ${meaningMatch[1].trim()}
          </div>
        </div>
      `;
    }
    
    if (vocabMatch) {
      html += `
        <div class="section">
          <h4>Key Vocabulary</h4>
          <div style="white-space: pre-wrap; line-height: 1.6;">
            ${vocabMatch[1].trim()}
          </div>
        </div>
      `;
    }
    
    if (altMatch) {
      html += `
        <div class="section">
          <h4>Alternative Expressions</h4>
          <div style="white-space: pre-wrap; line-height: 1.6;">
            ${altMatch[1].trim()}
          </div>
        </div>
      `;
    }
    
    html += '</div>';
    return html;
    
  } catch (error) {
    console.error("格式化文本时出错:", error);
    addApiStatusLog(`格式化文本时出错: ${error.message}`, 'error');
    return `
      <div class="explanation-content error">
        <p>Error formatting content: ${error.message}</p>
      </div>
    `;
  }
}

// 从API获取解释
async function getExplanationFromAPI(text, apiSettings) {
  console.log("Getting explanation from API:", apiSettings);
  
  if (apiSettings.useFreeApi) {
    return await getFreeAPIExplanation(text);
  }
  
  if (apiSettings.apiType === 'openai' && apiSettings.apiKey) {
    return await getOpenAIExplanation(text, apiSettings.apiKey);
  } else if (apiSettings.apiType === 'deepseek' && apiSettings.deepseekApiKey) {
    return await getDeepSeekExplanation(text, apiSettings);
  }
  
  throw new Error('未配置有效的API设置');
}

// 使用免费API获取解释
async function getFreeAPIExplanation(text) {
  console.log("调用免费API解释文本:", text);
  addApiStatusLog(`准备调用免费API服务`);
  
  // 设置API端点 - 尝试多个不同的免费端点
  const apiEndpoints = [
    "https://api.free-explainer.com/explain", // 示例端点，需替换为实际免费API
    "https://api-backup.free-explainer.com/explain" // 备用端点
  ];
  
  // 使用与DeepSeek相同的JSON格式提示词
  const prompt = `
Please analyze the following English text and return your analysis in a strict JSON format:

"${text}"

Your response MUST be a valid JSON object with the following structure:

{
  "meaning": {
    "definition": "Clear explanation of the core meaning",
    "usageContext": [
      "List of contexts where this text would be used",
      "Target audience and situations",
      "Communication style and register"
    ],
    "grammarStructure": [
      "Key grammatical features",
      "Sentence structure analysis",
      "Tense and mood usage"
    ],
    "usageNotes": [
      "Important usage notes",
      "Common mistakes to avoid",
      "Style and register considerations"
    ]
  },
  "vocabulary": [
    {
      "word": "Key word or phrase",
      "type": "Part of speech",
      "definition": "Clear definition",
      "usage": "Example usage",
      "synonyms": "Related words or phrases"
    }
  ],
  "alternatives": [
    {
      "phrase": "Alternative expression",
      "description": "How this alternative differs",
      "formality": "Formal/Informal/Neutral",
      "example": "Example usage"
    }
  ]
}

IMPORTANT:
1. Ensure the response is STRICTLY in this JSON format
2. Do not include any text outside the JSON structure
3. All string values should be properly escaped
4. Arrays should contain at least 2-3 items each
5. The vocabulary section should analyze 3-5 key terms
6. The alternatives section should provide 3-5 different expressions
`;

  // 构建请求体
  const requestBody = {
    text: text,
    prompt: prompt,
    max_tokens: 800
  };
  
  addApiStatusLog(`构建免费API请求完成，准备发送...`);
  
  console.log("发送到免费API的请求:", {
    headers: {
      "Content-Type": "application/json"
    },
    body: requestBody
  });

  let lastError = null;
  
  // 尝试每个端点
  for (const apiUrl of apiEndpoints) {
    try {
      addApiStatusLog(`尝试发送请求到 ${apiUrl}...`);
      
      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        addApiStatusLog(`请求超时 (${apiUrl})，中止请求...`, 'warning');
        controller.abort();
      }, 30000); // 30秒超时
      
      // 模拟API调用 - 在实际使用中，这里应该是真正的API调用
      // 这里使用setTimeout模拟网络请求
      const response = await new Promise((resolve, reject) => {
    setTimeout(() => {
          // 模拟成功响应
          resolve({
            ok: true,
            status: 200,
            statusText: "OK",
            headers: new Map([["content-type", "application/json"]]),
            json: () => Promise.resolve({
              explanation: `
                文本的含义和用法解释：
                "${text}" 是一个英语表达，通常用于...
                
                关键词汇解释：
                - 词汇1: 解释
                - 词汇2: 解释
                
                替代表达方式：
                - 可以用"..."来替代
                - 另一种表达方式是"..."
              `
            }),
            text: () => Promise.resolve(JSON.stringify({
              explanation: `
                文本的含义和用法解释：
                "${text}" 是一个英语表达，通常用于...
                
                关键词汇解释：
                - 词汇1: 解释
                - 词汇2: 解释
                
                替代表达方式：
                - 可以用"..."来替代
                - 另一种表达方式是"..."
              `
            }))
          });
    }, 1000);
  });
      
      // 清除超时
      clearTimeout(timeoutId);

      console.log(`免费API (${apiUrl}) 响应状态:`, response.status, response.statusText);
      addApiStatusLog(`收到响应: 状态码 ${response.status} (${response.statusText})`);
      
      // 获取响应头信息
      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log("免费API响应头:", headers);

      if (!response.ok) {
        let errorMessage = `API请求失败 (${response.status})`;
        
        try {
          const errorData = await response.json();
          console.error("免费API 错误详情:", errorData);
          errorMessage = `${errorMessage}: ${errorData.error || JSON.stringify(errorData)}`;
          addApiStatusLog(`错误详情: ${errorData.error || JSON.stringify(errorData)}`, 'error');
        } catch (e) {
          console.error("无法解析错误响应:", e);
          const errorText = await response.text();
          console.error("原始错误响应:", errorText);
          errorMessage = `${errorMessage}: ${errorText || '未知错误'}`;
          addApiStatusLog(`无法解析错误响应: ${errorText || '未知错误'}`, 'error');
        }
        
        // 记录错误但继续尝试下一个端点
        lastError = new Error(errorMessage);
        
        // 其他错误继续尝试下一个端点
        addApiStatusLog(`尝试下一个端点...`, 'warning');
        continue;
      }

      addApiStatusLog(`正在解析API响应...`);
      let data;
      try {
        const responseText = await response.text();
        console.log("原始响应文本:", responseText);
        
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("JSON解析错误:", parseError);
          addApiStatusLog(`JSON解析错误: ${parseError.message}`, 'error');
          throw new Error(`解析响应失败: ${parseError.message} - 原始响应: ${responseText.substring(0, 100)}...`);
        }
      } catch (e) {
        console.error("解析响应失败:", e);
        addApiStatusLog(`解析响应失败: ${e.message}`, 'error');
        lastError = new Error(`解析响应失败: ${e.message}`);
        continue; // 尝试下一个端点
      }
      
      console.log("免费API 完整响应:", JSON.stringify(data, null, 2));
      
      // 检查响应中是否包含预期的数据
      if (!data.explanation) {
        console.error("API响应格式不正确:", data);
        addApiStatusLog(`API响应格式不正确`, 'error');
        lastError = new Error("API响应格式不正确");
        continue; // 尝试下一个端点
      }

      // 获取API返回的文本内容
      const explanation = data.explanation;
      console.log("免费API 返回的解释:", explanation);
      addApiStatusLog(`成功获取解释，长度: ${explanation.length} 字符`, 'success');
      
      // 尝试解析返回的内容为JSON
      try {
        // 清理Markdown代码块标记
        let cleanedContent = explanation;
        
        // 如果内容包含```json标记，提取JSON部分
        const jsonBlockMatch = explanation.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonBlockMatch) {
          cleanedContent = jsonBlockMatch[1];
          console.log("提取到JSON内容:", cleanedContent);
        }
        
        // 尝试解析JSON
        const jsonData = JSON.parse(cleanedContent);
        console.log("成功解析免费API返回内容为JSON:", jsonData);
        return processJsonResponse(jsonData);
      } catch (jsonError) {
        console.error("无法将免费API返回内容解析为JSON:", jsonError);
        addApiStatusLog(`无法将免费API返回内容解析为JSON: ${jsonError.message}`, 'error');
        // 如果解析失败，使用旧的格式化方法
        return formatExplanationAsHtml(explanation);
      }
    } catch (error) {
      console.error(`调用免费API (${apiUrl}) 时出错:`, error);
      
      // 检查是否是AbortController引起的超时错误
      if (error.name === 'AbortError') {
        addApiStatusLog(`API请求超时，尝试下一个端点...`, 'warning');
        lastError = new Error("API请求超时，请检查网络连接或稍后再试");
        continue; // 尝试下一个端点
      }
      
      addApiStatusLog(`API调用失败: ${error.message}，尝试下一个端点...`, 'warning');
      lastError = error;
    }
  }
  
  // 如果所有端点都失败，抛出最后一个错误
  if (lastError) {
    addApiStatusLog(`所有免费API端点尝试均失败`, 'error');
    throw new Error("免费API服务暂时不可用，请稍后再试或使用其他API");
  }
  
  // 不应该到达这里，但以防万一
  throw new Error("无法连接到免费API服务");
}

// 使用OpenAI API获取解释
async function getOpenAIExplanation(text, apiKey) {
  console.log("调用OpenAI API解释文本:", text);
  addApiStatusLog(`准备调用OpenAI API`);
  
  // 设置API端点 - 尝试多个不同的端点
  const apiEndpoints = [
    "https://api.openai.com/v1/chat/completions",
    "https://api.openai-proxy.com/v1/chat/completions" // 备用端点
  ];
  
  // 使用与DeepSeek相同的JSON格式提示词
  const prompt = `
Please analyze the following English text and return your analysis in a strict JSON format:

"${text}"

Your response MUST be a valid JSON object with the following structure:

{
  "meaning": {
    "definition": "Clear explanation of the core meaning",
    "usageContext": [
      "List of contexts where this text would be used",
      "Target audience and situations",
      "Communication style and register"
    ],
    "grammarStructure": [
      "Key grammatical features",
      "Sentence structure analysis",
      "Tense and mood usage"
    ],
    "usageNotes": [
      "Important usage notes",
      "Common mistakes to avoid",
      "Style and register considerations"
    ]
  },
  "vocabulary": [
    {
      "word": "Key word or phrase",
      "type": "Part of speech",
      "definition": "Clear definition",
      "usage": "Example usage",
      "synonyms": "Related words or phrases"
    }
  ],
  "alternatives": [
    {
      "phrase": "Alternative expression",
      "description": "How this alternative differs",
      "formality": "Formal/Informal/Neutral",
      "example": "Example usage"
    }
  ]
}

IMPORTANT:
1. Ensure the response is STRICTLY in this JSON format
2. Do not include any text outside the JSON structure
3. All string values should be properly escaped
4. Arrays should contain at least 2-3 items each
5. The vocabulary section should analyze 3-5 key terms
6. The alternatives section should provide 3-5 different expressions
`;

  // 构建请求体
  const requestBody = {
    model: "gpt-3.5-turbo", // 默认使用gpt-3.5-turbo
    messages: [
      {
        role: "system",
        content: "You are a professional English language assistant specializing in analyzing English text and providing detailed, structured explanations. Your responses should be clear, accurate, well-formatted, and easy to understand. Always respond in English, not Chinese."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 800
  };
  
  addApiStatusLog(`构建OpenAI API请求完成，准备发送...`);
  
  console.log("发送到OpenAI API的请求:", {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey.substring(0, 5)}...` // 只显示密钥的前5个字符
    },
    body: requestBody
  });

  let lastError = null;
  
  // 尝试每个端点
  for (const apiUrl of apiEndpoints) {
    try {
      addApiStatusLog(`尝试发送请求到 ${apiUrl}...`);
      
      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        addApiStatusLog(`请求超时 (${apiUrl})，中止请求...`, 'warning');
        controller.abort();
      }, 30000); // 30秒超时
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal // 添加abort信号
      });
      
      // 清除超时
      clearTimeout(timeoutId);

      console.log(`OpenAI API (${apiUrl}) 响应状态:`, response.status, response.statusText);
      addApiStatusLog(`收到响应: 状态码 ${response.status} (${response.statusText})`);
      
      // 获取响应头信息
      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log("OpenAI API响应头:", headers);

      if (!response.ok) {
        let errorMessage = `API请求失败 (${response.status})`;
        
        try {
          const errorData = await response.json();
          console.error("OpenAI API 错误详情:", errorData);
          errorMessage = `${errorMessage}: ${errorData.error?.message || JSON.stringify(errorData)}`;
          addApiStatusLog(`错误详情: ${errorData.error?.message || JSON.stringify(errorData)}`, 'error');
        } catch (e) {
          console.error("无法解析错误响应:", e);
          const errorText = await response.text();
          console.error("原始错误响应:", errorText);
          errorMessage = `${errorMessage}: ${errorText || '未知错误'}`;
          addApiStatusLog(`无法解析错误响应: ${errorText || '未知错误'}`, 'error');
        }
        
        // 记录错误但继续尝试下一个端点
        lastError = new Error(errorMessage);
        if (response.status === 401) {
          addApiStatusLog(`认证失败：API密钥无效或已过期`, 'error');
          
          // 如果是最后一个端点，则抛出错误，否则继续尝试
          if (apiUrl === apiEndpoints[apiEndpoints.length - 1]) {
            throw new Error("认证失败：API密钥无效或已过期");
          } else {
            addApiStatusLog(`尝试下一个端点...`, 'warning');
            continue;
          }
        } else if (response.status === 429) {
          addApiStatusLog(`请求过多：已超出API速率限制或账户余额不足`, 'error');
          
          // 如果是最后一个端点，则抛出错误，否则继续尝试
          if (apiUrl === apiEndpoints[apiEndpoints.length - 1]) {
            throw new Error("请求过多：已超出API速率限制或账户余额不足");
          } else {
            addApiStatusLog(`尝试下一个端点...`, 'warning');
            continue;
          }
        }
        
        // 其他错误继续尝试下一个端点
        addApiStatusLog(`尝试下一个端点...`, 'warning');
        continue;
      }

      addApiStatusLog(`正在解析API响应...`);
      let data;
      try {
        const responseText = await response.text();
        console.log("原始响应文本:", responseText);
        
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("JSON解析错误:", parseError);
          addApiStatusLog(`JSON解析错误: ${parseError.message}`, 'error');
          throw new Error(`解析响应失败: ${parseError.message} - 原始响应: ${responseText.substring(0, 100)}...`);
        }
      } catch (e) {
        console.error("解析响应失败:", e);
        addApiStatusLog(`解析响应失败: ${e.message}`, 'error');
        lastError = new Error(`解析响应失败: ${e.message}`);
        continue; // 尝试下一个端点
      }
      
      console.log("OpenAI API 完整响应:", JSON.stringify(data, null, 2));
      
      // 检查响应中是否包含预期的数据
      if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
        console.error("API响应格式不正确:", data);
        addApiStatusLog(`API响应格式不正确`, 'error');
        lastError = new Error("API响应格式不正确");
        continue; // 尝试下一个端点
      }

      // 获取API返回的文本内容
      const explanation = data.choices[0].message.content;
      console.log("OpenAI API 返回的解释:", explanation);
      addApiStatusLog(`成功获取解释，长度: ${explanation.length} 字符`, 'success');
      
      // 尝试解析返回的内容为JSON
      try {
        // 清理Markdown代码块标记
        let cleanedContent = explanation;
        
        // 如果内容包含```json标记，提取JSON部分
        const jsonBlockMatch = explanation.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonBlockMatch) {
          cleanedContent = jsonBlockMatch[1];
          console.log("提取到JSON内容:", cleanedContent);
        }
        
        // 尝试解析JSON
        const jsonData = JSON.parse(cleanedContent);
        console.log("成功解析免费API返回内容为JSON:", jsonData);
        return processJsonResponse(jsonData);
      } catch (jsonError) {
        console.error("无法将免费API返回内容解析为JSON:", jsonError);
        addApiStatusLog(`无法将免费API返回内容解析为JSON: ${jsonError.message}`, 'error');
        // 如果解析失败，使用旧的格式化方法
        return formatExplanationAsHtml(explanation);
      }
    } catch (error) {
      console.error(`调用OpenAI API (${apiUrl}) 时出错:`, error);
      
      // 检查是否是AbortController引起的超时错误
      if (error.name === 'AbortError') {
        addApiStatusLog(`API请求超时，尝试下一个端点...`, 'warning');
        lastError = new Error("API请求超时，请检查网络连接或稍后再试");
        continue; // 尝试下一个端点
      }
      
      // 认证错误或速率限制错误
      if (error.message.includes("认证失败") || error.message.includes("请求过多")) {
        addApiStatusLog(`严重错误: ${error.message}`, 'error');
        
        // 如果是最后一个端点，则抛出错误，否则继续尝试
        if (apiUrl === apiEndpoints[apiEndpoints.length - 1]) {
          throw error;
        }
      }
      
      addApiStatusLog(`API调用失败: ${error.message}，尝试下一个端点...`, 'warning');
      lastError = error;
    }
  }
  
  // 如果所有端点都失败，抛出最后一个错误
  if (lastError) {
    addApiStatusLog(`所有OpenAI API端点尝试均失败`, 'error');
    throw lastError;
  }
  
  // 不应该到达这里，但以防万一
  throw new Error("无法连接到OpenAI API");
}

// 使用DeepSeek API获取解释
async function getDeepSeekExplanation(text, apiSettings) {
  console.log("调用DeepSeek API解释文本:", text);
  console.log("使用的API设置:", apiSettings);
  
  // 添加状态日志
  addApiStatusLog(`准备调用DeepSeek API (${apiSettings.deepseekModel || "deepseek-chat"})`);
  
  // 设置API端点 - 尝试多个不同的端点
  const apiEndpoints = [
    "https://api.deepseek.com/chat/completions",
    "https://api.deepseek.com/v1/chat/completions",
    "https://api.deepinfra.com/v1/openai/chat/completions" // 添加DeepInfra作为备用
  ];
  
  // 构建提示词
  const prompt = `
Please analyze the following English text and return your analysis in a strict JSON format:

"${text}"

Your response MUST be a valid JSON object with the following structure:

{
  "meaning": {
    "definition": "Clear explanation of the core meaning",
    "usageContext": [
      "List of contexts where this text would be used",
      "Target audience and situations",
      "Communication style and register"
    ],
    "grammarStructure": [
      "Key grammatical features",
      "Sentence structure analysis",
      "Tense and mood usage"
    ],
    "usageNotes": [
      "Important usage notes",
      "Common mistakes to avoid",
      "Style and register considerations"
    ]
  },
  "vocabulary": [
    {
      "word": "Key word or phrase",
      "type": "Part of speech",
      "definition": "Clear definition",
      "usage": "Example usage",
      "synonyms": "Related words or phrases"
    }
  ],
  "alternatives": [
    {
      "phrase": "Alternative expression",
      "description": "How this alternative differs",
      "formality": "Formal/Informal/Neutral",
      "example": "Example usage"
    }
  ]
}

IMPORTANT:
1. Ensure the response is STRICTLY in this JSON format
2. Do not include any text outside the JSON structure
3. All string values should be properly escaped
4. Arrays should contain at least 2-3 items each
5. The vocabulary section should analyze 3-5 key terms
6. The alternatives section should provide 3-5 different expressions
`;

  // 构建请求体
  const requestBody = {
    model: apiSettings.deepseekModel || "deepseek-chat",
    messages: [
      {
        role: "system", 
        content: "You are a professional English language assistant specializing in analyzing English text and providing detailed, structured explanations. Your responses should be clear, accurate, well-formatted, and easy to understand. Always respond in English, not Chinese."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 800
  };
  
  // 如果使用DeepInfra端点，需要修改模型名称
  const getRequestBodyForEndpoint = (endpoint, baseRequestBody) => {
    if (endpoint.includes('deepinfra.com')) {
      // DeepInfra需要特定的模型名称格式
      const modelMap = {
        'deepseek-chat': 'deepseek-ai/DeepSeek-V3',
        'deepseek-chat-v3-0324': 'deepseek-ai/DeepSeek-V3-0324',
        'deepseek-v3': 'deepseek-ai/DeepSeek-V3',
        'deepseek-coder': 'deepseek-ai/DeepSeek-Coder-V2'
      };
      
      return {
        ...baseRequestBody,
        model: modelMap[baseRequestBody.model] || 'deepseek-ai/DeepSeek-V3'
      };
    }
    return baseRequestBody;
  };
  
  addApiStatusLog(`构建API请求完成，准备发送...`);
  
  console.log("发送到DeepSeek API的请求:", {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiSettings.deepseekApiKey.substring(0, 5)}...` // 只显示密钥的前5个字符
    },
    body: requestBody
  });

  let lastError = null;
  
  // 尝试每个端点
  for (const apiUrl of apiEndpoints) {
    try {
      addApiStatusLog(`尝试发送请求到 ${apiUrl}...`);
      
      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        addApiStatusLog(`请求超时 (${apiUrl})，中止请求...`, 'warning');
        controller.abort();
      }, 30000); // 30秒超时
      
      // 为当前端点准备请求体
      const endpointRequestBody = getRequestBodyForEndpoint(apiUrl, requestBody);
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiSettings.deepseekApiKey}`
        },
        body: JSON.stringify(endpointRequestBody),
        signal: controller.signal // 添加abort信号
      });
      
      // 清除超时
      clearTimeout(timeoutId);

      console.log(`DeepSeek API (${apiUrl}) 响应状态:`, response.status, response.statusText);
      addApiStatusLog(`收到响应: 状态码 ${response.status} (${response.statusText})`);
      
      // 获取响应头信息
      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log("DeepSeek API响应头:", headers);

      if (!response.ok) {
        let errorMessage = `API请求失败 (${response.status})`;
        
        try {
          const errorData = await response.json();
          console.error("DeepSeek API 错误详情:", errorData);
          errorMessage = `${errorMessage}: ${errorData.error?.message || JSON.stringify(errorData)}`;
          addApiStatusLog(`错误详情: ${errorData.error?.message || JSON.stringify(errorData)}`, 'error');
        } catch (e) {
          console.error("无法解析错误响应:", e);
          const errorText = await response.text();
          console.error("原始错误响应:", errorText);
          errorMessage = `${errorMessage}: ${errorText || '未知错误'}`;
          addApiStatusLog(`无法解析错误响应: ${errorText || '未知错误'}`, 'error');
        }
        
        // 记录错误但继续尝试下一个端点
        lastError = new Error(errorMessage);
        if (response.status === 401) {
          addApiStatusLog(`认证失败：API密钥无效或已过期`, 'error');
          
          // 如果是最后一个端点，则抛出错误，否则继续尝试
          if (apiUrl === apiEndpoints[apiEndpoints.length - 1]) {
            throw new Error("认证失败：API密钥无效或已过期");
          } else {
            addApiStatusLog(`尝试下一个端点...`, 'warning');
            continue;
          }
        } else if (response.status === 429) {
          addApiStatusLog(`请求过多：已超出API速率限制或账户余额不足`, 'error');
          
          // 如果是最后一个端点，则抛出错误，否则继续尝试
          if (apiUrl === apiEndpoints[apiEndpoints.length - 1]) {
            throw new Error("请求过多：已超出API速率限制或账户余额不足");
          } else {
            addApiStatusLog(`尝试下一个端点...`, 'warning');
            continue;
          }
        }
        
        // 其他错误继续尝试下一个端点
        addApiStatusLog(`尝试下一个端点...`, 'warning');
        continue;
      }

      addApiStatusLog(`正在解析API响应...`);
      let data;
      try {
        const responseText = await response.text();
        console.log("原始响应文本:", responseText);
        
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("JSON解析错误:", parseError);
          addApiStatusLog(`JSON解析错误: ${parseError.message}`, 'error');
          throw new Error(`解析响应失败: ${parseError.message} - 原始响应: ${responseText.substring(0, 100)}...`);
        }
      } catch (e) {
        console.error("解析响应失败:", e);
        addApiStatusLog(`解析响应失败: ${e.message}`, 'error');
        lastError = new Error(`解析响应失败: ${e.message}`);
        continue; // 尝试下一个端点
      }
      
      console.log("DeepSeek API 完整响应:", JSON.stringify(data, null, 2));
      
      // 检查响应中是否包含预期的数据
      if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
        console.error("API响应格式不正确:", data);
        addApiStatusLog(`API响应格式不正确`, 'error');
        lastError = new Error("API响应格式不正确");
        continue; // 尝试下一个端点
      }

      // 获取API返回的文本内容
      const explanation = data.choices[0].message.content;
      console.log("DeepSeek API 返回的解释:", explanation);
      addApiStatusLog(`成功获取解释，长度: ${explanation.length} 字符`, 'success');
      
      // 尝试解析返回的内容为JSON
      try {
        // 清理Markdown代码块标记
        let cleanedContent = explanation;
        
        // 如果内容包含```json标记，提取JSON部分
        const jsonBlockMatch = explanation.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonBlockMatch) {
          cleanedContent = jsonBlockMatch[1];
          console.log("提取到JSON内容:", cleanedContent);
        }
        
        // 尝试解析JSON
        const jsonData = JSON.parse(cleanedContent);
        console.log("成功解析返回内容为JSON:", jsonData);
        return processJsonResponse(jsonData);
      } catch (jsonError) {
        console.error("无法将API返回内容解析为JSON:", jsonError);
        addApiStatusLog(`无法将API返回内容解析为JSON: ${jsonError.message}`, 'error');
        // 如果解析失败，使用旧的格式化方法
        return formatExplanationAsHtml(explanation);
      }
    } catch (error) {
      console.error(`调用DeepSeek API (${apiUrl}) 时出错:`, error);
      
      // 检查是否是AbortController引起的超时错误
      if (error.name === 'AbortError') {
        addApiStatusLog(`API请求超时，尝试下一个端点...`, 'warning');
        lastError = new Error("API请求超时，请检查网络连接或稍后再试");
        continue; // 尝试下一个端点
      }
      
      // 认证错误或速率限制错误
      if (error.message.includes("认证失败") || error.message.includes("请求过多")) {
        addApiStatusLog(`严重错误: ${error.message}`, 'error');
        
        // 如果是最后一个端点，则抛出错误，否则继续尝试
        if (apiUrl === apiEndpoints[apiEndpoints.length - 1]) {
          throw error;
        }
      }
      
      addApiStatusLog(`API调用失败: ${error.message}，尝试下一个端点...`, 'warning');
      lastError = error;
    }
  }
  
  // 如果所有端点都失败，抛出最后一个错误
  if (lastError) {
    addApiStatusLog(`所有DeepSeek API端点尝试均失败`, 'error');
    throw lastError;
  }
  
  // 不应该到达这里，但以防万一
  throw new Error("无法连接到DeepSeek API");
}

// 处理JSON格式的响应
function processJsonResponse(jsonData) {
  try {
    // 验证JSON数据结构
    if (!jsonData.meaning || !jsonData.vocabulary || !jsonData.alternatives) {
      throw new Error('Invalid JSON response structure');
    }

    let html = '';

    // Meaning & Usage 部分
    html += `
      <div class="section meaning-section">
        <h4>Meaning & Usage</h4>
        <div class="definition-box">
          <h5>Definition</h5>
          <p>${jsonData.meaning.definition}</p>
        </div>
        
        <div class="subsection">
          <h5>Usage Context</h5>
          <ul class="bullet-list">
            ${jsonData.meaning.usageContext.map(context => `<li>${context}</li>`).join('')}
          </ul>
        </div>
        
        <div class="subsection">
          <h5>Grammar Structure</h5>
          <ul class="bullet-list">
            ${jsonData.meaning.grammarStructure.map(grammar => `<li>${grammar}</li>`).join('')}
          </ul>
        </div>
        
        <div class="subsection">
          <h5>Usage Notes</h5>
          <ul class="bullet-list">
            ${jsonData.meaning.usageNotes.map(note => `<li>${note}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;

    // Vocabulary 部分
    html += `
      <div class="section vocabulary-section">
        <h4>Key Vocabulary</h4>
        ${jsonData.vocabulary.map(vocab => `
          <div class="vocab-item">
            <div class="vocab-header">
              <div class="vocab-word">${vocab.word}</div>
              <div class="vocab-type">${vocab.type}</div>
            </div>
            <div class="vocab-definition">${vocab.definition}</div>
            <div class="vocab-usage">Usage: ${vocab.usage}</div>
            <div class="vocab-synonyms">Synonyms: ${vocab.synonyms}</div>
          </div>
        `).join('')}
      </div>
    `;

    // Alternatives 部分
    html += `
      <div class="section alternatives-section">
        <h4>Alternative Expressions</h4>
        ${jsonData.alternatives.map(alt => `
          <div class="alt-card">
            <div class="alt-phrase">${alt.phrase}</div>
            <div class="alt-meta">
              <div class="alt-tag">${alt.formality}</div>
            </div>
            <div class="alt-description">${alt.description}</div>
            <div class="alt-example">Example: ${alt.example}</div>
          </div>
        `).join('')}
      </div>
    `;

    return html;
  } catch (error) {
    console.error('Error processing JSON response:', error);
    throw new Error(`Failed to process JSON response: ${error.message}`);
  }
}

// 处理解释请求
async function explainText(text) {
  if (isProcessing) {
    // 如果已经在处理中，显示一个临时提示而不是卡住
    const content = sidebar.querySelector('.sidebar-content');
    content.innerHTML += '<div class="info">正在处理前一个请求，请稍候...</div>';
    return;
  }
  
  isProcessing = true;
  let translationTimeout = null;
  let requestStartTime = Date.now();
  
  try {
    console.log("开始处理解释请求:", text);
    console.log("请求开始时间:", new Date(requestStartTime).toISOString());
    addApiStatusLog(`开始处理解释请求，长度: ${text.length} 字符`);
    showLoading();
    
    // 设置超时处理，防止无限等待
    const timeoutPromise = new Promise((_, reject) => {
      translationTimeout = setTimeout(() => {
        const elapsedTime = (Date.now() - requestStartTime) / 1000;
        console.log(`全局超时触发，${elapsedTime.toFixed(1)}秒已过`);
        addApiStatusLog(`全局超时触发，${elapsedTime.toFixed(1)}秒已过`, 'error');
        reject(new Error(`解释生成超时(${elapsedTime.toFixed(1)}秒)，请重试`));
      }, 60000); // 60秒超时
    });
    
    // 获取API设置
    const apiSettingsPromise = new Promise((resolve, reject) => {
      try {
        console.log("正在获取API设置...");
        addApiStatusLog("正在获取API设置...");
      chrome.runtime.sendMessage({ action: 'getApiSettings' }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("获取API设置时出错:", chrome.runtime.lastError);
            addApiStatusLog(`获取API设置时出错: ${chrome.runtime.lastError.message || '未知错误'}`, 'error');
            reject(new Error(`获取API设置时出错: ${chrome.runtime.lastError.message || '未知错误'}`));
            return;
          }
          
          console.log("收到API设置:", response);
          addApiStatusLog(`收到API设置: ${JSON.stringify(response || {}).substring(0, 100)}...`);
        resolve(response || {});
      });
      } catch (error) {
        console.error("发送消息时出错:", error);
        addApiStatusLog(`发送消息时出错: ${error.message}`, 'error');
        reject(error);
      }
    });
    
    // 添加超时竞争
    let apiSettings;
    try {
      apiSettings = await Promise.race([
      apiSettingsPromise,
      timeoutPromise
    ]);
    
      console.log("成功获取API设置，耗时:", (Date.now() - requestStartTime) / 1000, "秒");
      addApiStatusLog(`成功获取API设置，耗时: ${((Date.now() - requestStartTime) / 1000).toFixed(1)}秒`);
    } catch (error) {
      console.error("获取API设置时超时或出错:", error);
      addApiStatusLog(`获取API设置时超时或出错: ${error.message}`, 'error');
      
      // 在这里处理错误，而不是直接抛出
      const errorMessage = error.message || "未知错误";
      const userFriendlyError = `
        <div class="error">
          <h4>获取API设置时出错</h4>
          <p>${errorMessage}</p>
          <p>使用本地解释功能代替。</p>
        </div>
      `;
      
      // 使用本地解释
      const explanation = generateLocalExplanation(text);
      // 在解释前添加错误提示
      updateSidebarContent(text, userFriendlyError + explanation);
      
      // 清除超时定时器
      if (translationTimeout) {
        clearTimeout(translationTimeout);
        translationTimeout = null;
      }
      
      isProcessing = false;
      return; // 提前返回，不继续执行
    }
    
    console.log("API设置详情:", apiSettings);
    
    let explanation;
    
    // 检查是否使用API
    if (apiSettings.useApi && 
        (apiSettings.useFreeApi || 
         (apiSettings.apiType === 'openai' && apiSettings.apiKey) || 
         (apiSettings.apiType === 'deepseek' && apiSettings.deepseekApiKey))) {
      
      addApiStatusLog(`API类型: ${apiSettings.apiType || '未指定'}`);
      
      try {
        const apiStartTime = Date.now();
        console.log(`开始调用API (${apiSettings.apiType || '未指定'})...`);
        addApiStatusLog(`开始调用API (${apiSettings.apiType || '未指定'})...`);
        
        // 不再对API调用本身设置超时竞争，让fetch自己处理超时
        // 这样可以避免在API实际有响应但处理较慢时提前触发超时
        explanation = await getExplanationFromAPI(text, apiSettings);
        
        const apiElapsedTime = (Date.now() - apiStartTime) / 1000;
        console.log(`API调用完成，耗时: ${apiElapsedTime.toFixed(1)}秒`);
        addApiStatusLog(`API调用完成，耗时: ${apiElapsedTime.toFixed(1)}秒`, 'success');
        
        // 清除全局超时定时器，因为请求已成功完成
        if (translationTimeout) {
          clearTimeout(translationTimeout);
          translationTimeout = null;
          console.log("已清除全局超时定时器");
          addApiStatusLog("已清除全局超时定时器");
        }
      } catch (apiError) {
        console.error("API调用错误:", apiError);
        addApiStatusLog(`API错误: ${apiError.message}`, 'error');
        
        // 构建用户友好的错误信息
        let errorMessage = apiError.message || "未知错误";
        let userFriendlyError = "";
        
        // 网络错误特殊处理
        if (apiError.name === 'TypeError' && errorMessage.includes('Failed to fetch')) {
          userFriendlyError = `
            <div class="error">
              <h4>网络错误</h4>
              <p>无法连接到API服务器，请检查您的网络连接。</p>
              <p>技术详情: ${errorMessage}</p>
              <p>解决方案:</p>
              <ul>
                <li>检查您的网络连接是否正常</li>
                <li>确认API服务器地址是否正确</li>
                <li>检查是否有防火墙或代理限制</li>
                <li>尝试使用本地解释功能</li>
              </ul>
            </div>
          `;
        }
        // 超时错误特殊处理
        else if (errorMessage.includes("timeout") || errorMessage.includes("超时") || apiError.name === 'AbortError') {
          userFriendlyError = `
            <div class="error">
              <h4>请求超时</h4>
              <p>解释生成请求超时，可能是网络问题或服务器繁忙。</p>
              <p>技术详情: ${errorMessage}</p>
              <p>解决方案:</p>
              <ul>
                <li>请检查您的网络连接</li>
                <li>稍后再试</li>
                <li>尝试使用本地解释功能</li>
              </ul>
            </div>
          `;
        } 
        // 账户余额不足
        else if (errorMessage.includes("Insufficient Balance") || errorMessage.includes("账户余额不足")) {
          userFriendlyError = `
            <div class="error">
              <h4>API调用失败: 账户余额不足</h4>
              <p>您的账户余额不足，无法完成此次请求。</p>
              <p>技术详情: ${errorMessage}</p>
              <p>解决方案:</p>
              <ul>
                <li>请登录账户充值</li>
                <li>或切换到其他API提供商</li>
                <li>或尝试勾选"使用免费API"选项</li>
                <li>或暂时使用本地解释功能</li>
              </ul>
            </div>
          `;
        } 
        // 认证错误
        else if (errorMessage.includes("认证失败") || errorMessage.includes("Authentication") || 
                  errorMessage.includes("invalid") || errorMessage.includes("密钥")) {
          userFriendlyError = `
            <div class="error">
              <h4>API调用失败: 认证错误</h4>
              <p>您提供的API密钥可能无效或已过期。</p>
              <p>技术详情: ${errorMessage}</p>
              <p>请检查API密钥是否正确输入，或尝试重新生成一个新的API密钥。</p>
              <p>您也可以尝试勾选"使用免费API"选项。</p>
            </div>
          `;
        } 
        // 免费API错误
        else if (errorMessage.includes("免费API")) {
          userFriendlyError = `
            <div class="error">
              <h4>免费API调用失败</h4>
              <p>${errorMessage}</p>
              <p>免费API可能暂时不可用或超出使用限制。请稍后再试或使用您自己的API密钥。</p>
            </div>
          `;
        } 
        // 其他错误
        else {
          userFriendlyError = `
            <div class="error">
              <h4>API调用失败</h4>
              <p>${errorMessage}</p>
              <p>使用本地解释功能代替。</p>
              <details>
                <summary>技术详情</summary>
                <p>错误类型: ${apiError.name}</p>
                <p>错误消息: ${apiError.message}</p>
                <p>错误栈: ${apiError.stack ? apiError.stack.split('\n').slice(0, 3).join('<br>') : '无'}</p>
              </details>
            </div>
          `;
        }
        
        // 如果API调用失败，回退到本地解释
        explanation = generateLocalExplanation(text);
        // 在解释前添加错误提示
        explanation = userFriendlyError + explanation;
      }
    } else {
      // 使用本地解释
      addApiStatusLog("使用本地解释功能");
      explanation = generateLocalExplanation(text);
    }
    
    const totalElapsedTime = (Date.now() - requestStartTime) / 1000;
    console.log(`请求处理完成，总耗时: ${totalElapsedTime.toFixed(1)}秒`);
    addApiStatusLog(`请求处理完成，总耗时: ${totalElapsedTime.toFixed(1)}秒`, 'success');
    
    updateSidebarContent(text, explanation);
  } catch (error) {
    console.error("解释文本时出错:", error);
    addApiStatusLog(`解释文本时出错: ${error.message}`, 'error');
    
    // 清除侧边栏加载状态，显示错误信息
    try {
      const errorDetails = `
        <div class="error">
          <h4>无法生成解释</h4>
          <p>${error.message || '未知错误'}</p>
          <details>
            <summary>技术详情</summary>
            <p>错误类型: ${error.name}</p>
            <p>错误消息: ${error.message}</p>
            <p>错误栈: ${error.stack ? error.stack.split('\n').slice(0, 3).join('<br>') : '无'}</p>
          </details>
        </div>
      `;
      showError(errorDetails);
    } catch (e) {
      console.error("显示错误信息时出错:", e);
    }
  } finally {
    // 清除超时定时器
    if (translationTimeout) {
      clearTimeout(translationTimeout);
      console.log("在finally中清除了全局超时定时器");
    }
    
    const totalElapsedTime = (Date.now() - requestStartTime) / 1000;
    console.log(`请求结束，总耗时: ${totalElapsedTime.toFixed(1)}秒`);
    addApiStatusLog(`请求结束，总耗时: ${totalElapsedTime.toFixed(1)}秒`);
    
    isProcessing = false;
  }
}

// 重置插件状态
function resetPluginState() {
  console.log("Resetting plugin state");
  
  // 重置处理状态
  isProcessing = false;
  
  // 隐藏侧边栏
  if (sidebar) {
    sidebar.classList.add('hidden');
    isSidebarOpen = false;
  }
  
  // 隐藏悬浮按钮
  hideFloatingButton();
  
  // 重置侧边栏内容
  if (sidebar) {
    const content = sidebar.querySelector('.sidebar-content');
    content.innerHTML = '<p>插件状态已重置。请选择英文文本并右键点击"用英语解释所选文本"</p>';
  }
  
  // 显示重置成功消息
  if (sidebar) {
    const statusMessage = document.createElement('div');
    statusMessage.className = 'status-message';
    statusMessage.textContent = '插件状态已重置';
    document.body.appendChild(statusMessage);
    
    // 2秒后自动移除消息
    setTimeout(() => {
      if (statusMessage && statusMessage.parentNode) {
        statusMessage.parentNode.removeChild(statusMessage);
      }
    }, 2000);
  }
}

// 创建悬浮按钮
function createFloatingButton() {
  if (floatingButton) return;
  
  floatingButton = document.createElement('button');
  floatingButton.className = 'english-explainer-floating-button';
  floatingButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
  `;
  floatingButton.title = "解释所选文本";
  
  // 点击事件处理
  floatingButton.addEventListener('click', () => {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      explainText(selectedText);
      hideFloatingButton();
    }
  });
  
  // 添加到DOM
  document.body.appendChild(floatingButton);
  
  // 初始状态为隐藏
  hideFloatingButton();
}

// 显示悬浮按钮
function showFloatingButton(x, y) {
  if (!floatingButton) createFloatingButton();
  
  // 确保按钮在视口范围内
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const buttonWidth = 30; // 按钮宽度
  const buttonHeight = 30; // 按钮高度
  
  // 调整x位置以确保按钮完全在视口内
  x = Math.min(x, viewportWidth - buttonWidth + window.scrollX);
  
  // 调整y位置，如果太靠近顶部，则放在选择区域下方
  if (y - window.scrollY < 40) {
    y += 30; // 放在下方
  }
  
  floatingButton.style.left = `${x}px`;
  floatingButton.style.top = `${y - 30}px`; // 上移一点，避免挡住文本
  floatingButton.classList.add('visible');
}

// 隐藏悬浮按钮
function hideFloatingButton() {
  if (floatingButton) {
    floatingButton.classList.remove('visible');
  }
} 