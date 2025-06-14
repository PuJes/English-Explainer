/**
 * 弹出窗口的JavaScript脚本
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup页面加载完成'); // 调试日志1
  
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
  // 新增：重置按钮事件处理
  const resetPluginBtn = document.getElementById('resetPluginBtn');
  console.log('Reset button element:', resetPluginBtn); // 调试日志
  
  if (resetPluginBtn) {
    resetPluginBtn.addEventListener('click', function() {
      console.log('Reset plugin button clicked'); // 调试日志
      
      // 先显示处理中状态
      showStatus('正在重置...', 'info');
      
      // 发送重置消息到background
      chrome.runtime.sendMessage({action: 'resetPlugin'}, function(response) {
        console.log('Reset response:', response); // 调试日志
        
        if (chrome.runtime.lastError) {
          console.error('Reset plugin error:', chrome.runtime.lastError);
          showStatus('重置失败: ' + chrome.runtime.lastError.message, 'error');
          return;
        }
        
        if (response && response.success) {
          showStatus('插件已重置', 'success');
        } else {
          showStatus('重置失败: ' + (response?.error || '未知错误'), 'error');
        }
      });
    });
  } else {
    console.error('Reset button not found!'); // 调试日志
  }
  
  // 加载保存的设置
  loadSettings();
  
  // 设置事件监听器
  useApiToggle.addEventListener('change', () => {
    toggleApiSettings();
    // 自动保存复选框状态
    saveCheckboxState();
  });
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
    console.log('==== 加载保存的设置 ====');
    chrome.storage.sync.get({
      useApi: false,
      useFreeApi: false,
      apiType: 'deepseek',
      apiKey: '',
      deepseekApiKey: '',
      deepseekModel: 'deepseek-chat'
    }, (result) => {
      console.log('加载设置:', result);
      
      useApiToggle.checked = result.useApi;
      useFreeApiToggle.checked = result.useFreeApi;
      
      // 设置API类型
      apiType.value = result.apiType;
      
      // 设置API密钥
      if (result.apiKey) apiKey.value = result.apiKey;
      if (result.deepseekApiKey) deepseekApiKey.value = result.deepseekApiKey;
      if (result.deepseekModel) deepseekModel.value = result.deepseekModel;
      
      // 更新UI显示
      toggleApiSettings();
      toggleApiTypeSettings();
    });
  }
  
  // 保存复选框状态的函数
  function saveCheckboxState() {
    const settings = {
      useApi: useApiToggle.checked,
      useFreeApi: useFreeApiToggle.checked
    };
    
    chrome.storage.sync.set(settings, () => {
      console.log('复选框状态已保存:', settings);
      showStatus('设置已更新', 'success');
    });
  }
  
  // 保存API设置
  function saveSettings() {
    const settings = {
      useApi: useApiToggle.checked,
      useFreeApi: useFreeApiToggle.checked,
      apiType: apiType.value,
      apiKey: apiKey.value,
      deepseekApiKey: deepseekApiKey.value,
      deepseekModel: deepseekModel.value
    };
    
    // 验证设置
    if (settings.useApi && !settings.useFreeApi) {
      if (settings.apiType === 'openai' && (!settings.apiKey || !settings.apiKey.startsWith('sk-'))) {
        showStatus('请输入有效的OpenAI API密钥', 'error');
        return;
      }
      if (settings.apiType === 'deepseek' && (!settings.deepseekApiKey || !settings.deepseekApiKey.startsWith('sk-'))) {
        showStatus('请输入有效的DeepSeek API密钥', 'error');
        return;
      }
    }
    
    // 保存设置
    chrome.storage.sync.set(settings, () => {
      showStatus('所有设置已保存', 'success');
      console.log('保存的设置:', settings);
    });
  }
  
  // 测试DeepSeek API连接
  async function testDeepseekApi() {
    // 获取状态显示元素
    const statusDiv = document.getElementById('status');
    if (!statusDiv) {
      console.error('Status div not found!');
      return;
    }
    
    // 获取API密钥
    const apiKeyValue = deepseekApiKey.value;
    if (!apiKeyValue || !apiKeyValue.startsWith('sk-')) {
      showStatus('请输入有效的DeepSeek API密钥', 'error');
      return;
    }
    
    // 显示测试中状态
    showStatus('正在测试API连接...', 'info');
    console.log('开始测试API连接');
    
    try {
      // 使用background script来处理API请求
      const response = await chrome.runtime.sendMessage({
        action: 'testDeepseekApi',
        data: {
          apiKey: apiKeyValue,
          model: deepseekModel.value || 'deepseek-chat'
        }
      });
      
      console.log('API测试响应:', response);
      
      if (response.success) {
        showStatus('API连接测试成功！', 'success');
      } else {
        showStatus(`API连接测试失败: ${response.error || '未知错误'}`, 'error');
      }
    } catch (error) {
      console.error('API测试错误:', error);
      showStatus(`API连接测试失败: ${error.message}`, 'error');
    }
  }
  
  // 修改显示状态的函数
  function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    if (!statusDiv) {
      console.error('Status div not found!');
      return;
    }
    
    console.log(`显示状态: ${message} (${type})`); // 添加日志
    
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    // 设置样式
    let bgColor, textColor;
    switch(type) {
      case 'success':
        bgColor = '#e8f5e8';
        textColor = '#2e7d32';
        break;
      case 'error':
        bgColor = '#ffebee';
        textColor = '#d32f2f';
        break;
      case 'info':
        bgColor = '#e3f2fd';
        textColor = '#1976d2';
        break;
      default:
        bgColor = '#f5f5f5';
        textColor = '#333';
    }
    
    statusDiv.style.cssText = `
      display: block !important;
      margin-top: 10px;
      padding: 8px 12px;
      border-radius: 4px;
      text-align: center;
      font-size: 14px;
      background: ${bgColor};
      color: ${textColor};
      border: 1px solid ${textColor}33;
    `;
    
    // 如果不是错误消息，3秒后自动隐藏
    if (type !== 'error') {
      setTimeout(() => {
        if (statusDiv) {
          statusDiv.style.display = 'none';
        }
      }, 3000);
    }
  }
});

// 添加storage变化监听器
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('==== Storage变化监听 ====');
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(
      `Storage key "${key}" in "${namespace}" changed:`,
      '\n旧值:', oldValue,
      '\n新值:', newValue
    );
  }
}); 