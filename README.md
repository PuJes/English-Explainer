# English Explainer

一个帮助你理解英语的Chrome扩展，通过AI技术提供深入的英语解释。

## ✨ 功能特点

- 🔍 智能文本解释：选中任意英文文本，获取详细解释
- 🤖 多API支持：支持免费API、OpenAI和DeepSeek
- 🎯 即时翻译：侧边栏实时显示解释结果
- 🔊 文本朗读：支持原文和单词发音
- 📝 本地解释：离线时提供基础解释功能
- 🛠 配置灵活：支持多种API和模型选择
- 📊 状态监控：实时显示API调用状态

## 🚀 快速开始

1. 下载扩展文件
2. 打开Chrome扩展管理页面 (`chrome://extensions/`)
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择扩展文件夹

## 💡 使用方法

1. **选择文本**：在任意网页上选中英文文本
2. **触发解释**：
   - 点击出现的悬浮按钮
   - 右键选择"用英语解释所选文本"
   - 点击扩展图标，使用输入框
3. **查看解释**：在右侧边栏查看详细解释
4. **朗读功能**：点击朗读按钮听发音
5. **配置设置**：点击扩展图标，进行API设置

## ⚙️ 配置说明

### API设置
1. 点击扩展图标
2. 选择API类型：
   - 免费API（有限制）
   - OpenAI（需API密钥）
   - DeepSeek（需API密钥）
3. 输入相应的API密钥
4. 保存设置

### 模型选择
- DeepSeek支持多个模型：
  - deepseek-chat
  - deepseek-chat-v3-0324
  - deepseek-v3
  - deepseek-reasoner
  - deepseek-coder

## 📦 项目结构

```
English Explainer/
├── manifest.json      # 扩展配置文件
├── background.js      # 后台脚本
├── content.js         # 内容脚本
├── popup.html         # 弹出窗口
├── popup.js          # 弹出窗口脚本
├── sidebar.css       # 侧边栏样式
└── images/           # 图标和图片资源
```

## 🔧 开发环境

- Chrome 120+
- Node.js 18+
- Manifest V3

## 📝 版本历史

当前版本：1.0.0

查看完整版本历史：[VERSION.md](VERSION.md)
查看更新日志：[CHANGELOG.md](CHANGELOG.md)

## 🤝 贡献指南

欢迎提交问题和建议！

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 提交 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- OpenAI API
- DeepSeek API
- Chrome Extensions API
- Web Speech API





