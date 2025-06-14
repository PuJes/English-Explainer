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
  console.log('Background received message:', request); // 调试日志
  
  if (request.action === 'getApiSettings') {
    // 记录请求
    log('收到获取API设置请求');
    
    try {
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
          if (chrome.runtime.lastError) {
            log('获取API设置时出错: ' + chrome.runtime.lastError.message);
            sendResponse({ error: chrome.runtime.lastError.message });
            return;
          }
          
          log('成功获取API设置');
          // 发送响应前记录日志（不包含敏感信息）
          log('API启用状态: ' + (result.useApi ? '是' : '否'));
          if (result.useFreeApi) {
            log('使用免费API');
          }
          
          sendResponse(result);
        }
      );
    } catch (error) {
      log('处理API设置请求时出错: ' + error.message);
      sendResponse({ error: error.message });
    }
    
    return true; // 异步响应
  }
  
  // 新增：处理重置插件请求
  else if (request.action === 'resetPlugin') {
    console.log('Processing reset plugin request'); // 调试日志
    
    // 获取当前活动标签页
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (chrome.runtime.lastError) {
        console.error('Query tabs error:', chrome.runtime.lastError);
        sendResponse({success: false, error: chrome.runtime.lastError.message});
        return;
      }
      
      if (tabs && tabs.length > 0) {
        const activeTab = tabs[0];
        console.log('Sending reset message to tab:', activeTab.id); // 调试日志
        
        // 向content script发送重置消息
        chrome.tabs.sendMessage(activeTab.id, {action: 'resetPluginState'}, function(response) {
          if (chrome.runtime.lastError) {
            console.error('Send reset message error:', chrome.runtime.lastError);
            sendResponse({success: false, error: chrome.runtime.lastError.message});
          } else {
            console.log('Reset message sent successfully, response:', response); // 调试日志
            sendResponse({success: true, contentResponse: response});
          }
        });
      } else {
        console.error('No active tab found');
        sendResponse({success: false, error: 'No active tab found'});
      }
    });
    
    // 返回true表示异步响应
    return true;
  }

  if (request.action === 'testAPI') {
    // 处理API测试请求
    handleAPITest(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开启
  }

  if (request.action === 'testDeepseekApi') {
    testDeepseekApi(request.data)
      .then(sendResponse)
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开启
  }
});

async function handleAPITest(data) {
  try {
    // 发送一个简单的测试请求到API
    const response = await fetch(data.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.apiKey}`
      },
      body: JSON.stringify({
        model: data.apiModel,
        messages: [
          { role: "user", content: "Test connection" }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testDeepseekApi(data) {
  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${data.apiKey}`
      },
      body: JSON.stringify({
        model: data.model,
        messages: [{
          role: "user",
          content: "Test connection"
        }]
      })
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(responseData.error?.message || `HTTP error! status: ${response.status}`);
    }
    
    return { success: true, data: responseData };
  } catch (error) {
    return { success: false, error: error.message };
  }
} 