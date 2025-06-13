/**
 * 背景脚本，负责创建右键菜单和处理消息
 */

// 简单日志函数，在后台页面控制台输出
function log(message) {
  console.log('[English Explainer]', message);
}

log('Background script loaded');

// 在扩展安装或启动时创建菜单
chrome.runtime.onInstalled.addListener(() => {
  log('Extension installed or updated');
  
  // 先清除所有现有菜单
  chrome.contextMenus.removeAll(() => {
    try {
      // 创建右键菜单项
      chrome.contextMenus.create({
        id: "explainEnglishMenu",
        title: "用英语解释所选文本",
        contexts: ["selection"]
      });
      
      log('Context menus created');
    } catch (error) {
      console.error('Error creating context menu:', error);
    }
  });
});

// 菜单点击事件处理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  log('Menu clicked: ' + info.menuItemId);
  
  if (info.menuItemId === 'explainEnglishMenu' && info.selectionText) {
    log('Selected text: ' + info.selectionText);
    
    // 向内容脚本发送消息
    chrome.tabs.sendMessage(
      tab.id,
      { action: 'explainText', text: info.selectionText },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending message:', chrome.runtime.lastError);
          
          // 尝试使用executeScript作为备选方案
          chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            function: (text) => {
              // 在页面上创建和分发自定义事件
              const event = new CustomEvent('englishExplainerExplainText', { 
                detail: { text: text } 
              });
              document.dispatchEvent(event);
            },
            args: [info.selectionText]
          }).catch(err => {
            console.error('Failed to execute script:', err);
          });
        } else {
          log('Message sent successfully');
        }
      }
    );
  }
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getApiSettings') {
    // 从存储中获取API设置
    chrome.storage.sync.get(
      [
        'useApi', 
        'useFreeApi',
        'apiType', 
        'apiKey', 
        'deepseekApiKey',
        'deepseekModel'
      ], 
      (result) => {
        log('Retrieved API settings, API enabled: ' + (result.useApi ? 'Yes' : 'No'));
        if (result.useFreeApi) {
          log('Using free API');
        }
        sendResponse(result);
      }
    );
    return true; // 异步响应
  }
}); 