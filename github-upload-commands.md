# GitHub上传命令

## 📋 在GitHub创建仓库后，运行这些命令：

### 1. 添加GitHub远程仓库
```bash
git remote add origin https://github.com/[您的用户名]/English-Explainer.git
```

### 2. 推送代码到GitHub
```bash
git push -u origin main
```

### 3. 推送标签（包含版本信息）
```bash
git push origin --tags
```

## 🔄 如果遇到错误

### 如果提示分支名称问题：
```bash
git branch -M main
git push -u origin main
```

### 如果需要身份验证：
- 使用GitHub用户名和Personal Access Token
- 或者配置SSH密钥

## ✅ 成功标志
看到类似输出就说明成功了：
```
Enumerating objects: XX, done.
Counting objects: 100% (XX/XX), done.
Writing objects: 100% (XX/XX), XX.XX MiB | XX.XX MiB/s, done.
Total XX (delta X), reused 0 (delta 0), pack-reused 0
To https://github.com/[用户名]/English-Explainer.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

## 📝 替换用户名示例
如果您的GitHub用户名是 `jesspu`，命令就是：
```bash
git remote add origin https://github.com/jesspu/English-Explainer.git
git push -u origin main
``` 