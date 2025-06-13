/**
 * 弹出窗口的JavaScript脚本
 */

document.addEventListener('DOMContentLoaded', () => {
  const useApiToggle = document.getElementById('useApiToggle');
  const apiSettings = document.getElementById('apiSettings');
  const useFreeApiToggle = document.getElementById('useFreeApiToggle');
  const customApiSettings = document.getElementById('customApiSettings');
  const apiType = document.getElementById('apiType');
  const openaiSettings = document.getElementById('openaiSettings');
  const deepseekSettings = document.getElementById('deepseekSettings');
  const apiKey = document.getElementById('apiKey');
  const deepseekApiKey = document.getElementById('deepseekApiKey');
  const deepseekModel = document.getElementById('deepseekModel');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');
  const openSidebarBtn = document.getElementById('openSidebarBtn');
  const testDeepseekApiBtn = document.getElementById('testDeepseekApiBtn');
  
  // 加载保存的设置
  loadSettings();
  
  // 设置事件监听器
  useApiToggle.addEventListener('change', toggleApiSettings);
  useFreeApiToggle.addEventListener('change', toggleFreeApiSettings);
  apiType.addEventListener('change', toggleApiTypeSettings);
  saveBtn.addEventListener('click', saveSettings);
  openSidebarBtn.addEventListener('click', openSidebar);
  
  // 如果存在测试DeepSeek API按钮，添加事件监听器
  if (testDeepseekApiBtn) {
    testDeepseekApiBtn.addEventListener('click', testDeepseekApi);
  }
  
  // 打开侧边栏
  function openSidebar() {
    // 获取当前活动标签页
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length === 0) {
        showStatus('无法获取当前标签页', 'error');
        return;
      }
      
      // 向内容脚本发送消息，打开侧边栏
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'openSidebar' },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error sending message:', chrome.runtime.lastError);
            
            // 尝试使用executeScript作为备选方案
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id, allFrames: true },
              function: () => {
                // 在页面上创建和分发自定义事件
                const event = new CustomEvent('englishExplainerOpenSidebar', {});
                document.dispatchEvent(event);
              }
            }).catch(err => {
              showStatus('无法在当前页面打开侧边栏', 'error');
              console.error('Failed to execute script:', err);
            });
          } else if (response && response.success) {
            showStatus('侧边栏已打开', 'success');
            // 关闭弹出窗口
            window.close();
          }
        }
      );
    });
  }
  
  // 切换API设置面板
  function toggleApiSettings() {
    apiSettings.style.display = useApiToggle.checked ? 'block' : 'none';
  }
  
  // 切换免费API设置
  function toggleFreeApiSettings() {
    customApiSettings.style.display = useFreeApiToggle.checked ? 'none' : 'block';
  }
  
  // 切换不同API类型的设置
  function toggleApiTypeSettings() {
    // 隐藏所有API设置
    openaiSettings.style.display = 'none';
    deepseekSettings.style.display = 'none';
    
    // 显示选中的API设置
    if (apiType.value === 'openai') {
      openaiSettings.style.display = 'block';
    } else if (apiType.value === 'deepseek') {
      deepseekSettings.style.display = 'block';
    }
  }
  
  // 加载设置
  function loadSettings() {
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
        if (result.useApi !== undefined) {
          useApiToggle.checked = result.useApi;
          toggleApiSettings();
        }
        
        if (result.useFreeApi !== undefined) {
          useFreeApiToggle.checked = result.useFreeApi;
          toggleFreeApiSettings();
        }
        
        if (result.apiType) {
          apiType.value = result.apiType;
          toggleApiTypeSettings();
        }
        
        if (result.apiKey) {
          apiKey.value = result.apiKey;
        }
        
        if (result.deepseekApiKey) {
          deepseekApiKey.value = result.deepseekApiKey;
        }
        
        if (result.deepseekModel) {
          deepseekModel.value = result.deepseekModel;
        }
      }
    );
  }
  
  // 保存设置
  function saveSettings() {
    const settings = {
      useApi: useApiToggle.checked,
      useFreeApi: useFreeApiToggle.checked,
      apiType: apiType.value
    };
    
    // 如果使用免费API，不需要验证其他设置
    if (!settings.useFreeApi) {
      // 根据API类型保存相应设置
      if (apiType.value === 'openai') {
        if (useApiToggle.checked && (!apiKey.value || !apiKey.value.startsWith('sk-'))) {
          showStatus('请输入有效的OpenAI API密钥', 'error');
          return;
        }
        settings.apiKey = apiKey.value;
      } else if (apiType.value === 'deepseek') {
        if (useApiToggle.checked && (!deepseekApiKey.value || !deepseekApiKey.value.startsWith('sk-'))) {
          showStatus('请输入有效的DeepSeek API密钥', 'error');
          return;
        }
        
        settings.deepseekApiKey = deepseekApiKey.value;
        settings.deepseekModel = deepseekModel.value;
      }
    }
    
    // 保存到Chrome存储
    chrome.storage.sync.set(settings, () => {
      showStatus('设置已保存', 'success');
    });
  }
  
  // 测试DeepSeek API连接
  async function testDeepseekApi() {
    // 检查API密钥
    const apiKeyValue = deepseekApiKey.value;
    if (!apiKeyValue || !apiKeyValue.startsWith('sk-')) {
      showStatus('请输入有效的DeepSeek API密钥', 'error');
      return;
    }
    
    // 显示测试中状态
    showStatus('正在测试API连接...', 'info');
    
    // 构建请求
    const apiUrl = "https://api.deepseek.com/chat/completions";
    const model = deepseekModel.value || "deepseek-chat";
    
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKeyValue}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "user",
              content: "Hello, this is a test message. Please respond with 'API connection successful'."
            }
          ],
          max_tokens: 20
        })
      });
      
      if (!response.ok) {
        let errorMessage = `API请求失败 (${response.status})`;
        
        try {
          const errorData = await response.json();
          errorMessage = `${errorMessage}: ${errorData.error?.message || JSON.stringify(errorData)}`;
        } catch (e) {
          const errorText = await response.text();
          errorMessage = `${errorMessage}: ${errorText || '未知错误'}`;
        }
        
        showStatus(errorMessage, 'error');
        return;
      }
      
      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        showStatus(`API连接成功！响应: "${data.choices[0].message.content}"`, 'success');
      } else {
        showStatus('API连接成功，但响应格式不正确', 'warning');
      }
    } catch (error) {
      showStatus(`API连接测试失败: ${error.message}`, 'error');
    }
  }
  
  // 显示状态消息
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    // 3秒后自动隐藏
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
}); 