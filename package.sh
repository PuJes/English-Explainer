#!/bin/bash

# 版本号
VERSION="2.0.0"

# 创建临时目录
TEMP_DIR="English_Explainer_v${VERSION}"
mkdir -p "$TEMP_DIR"

# 复制必要文件
cp manifest.json "$TEMP_DIR/"
cp background.js "$TEMP_DIR/"
cp content.js "$TEMP_DIR/"
cp popup.html "$TEMP_DIR/"
cp popup.js "$TEMP_DIR/"
cp sidebar.css "$TEMP_DIR/"
cp -r images "$TEMP_DIR/"
cp README.md "$TEMP_DIR/"
cp VERSION.md "$TEMP_DIR/"
cp CHANGELOG.md "$TEMP_DIR/"
cp LICENSE "$TEMP_DIR/"

# 创建zip文件
zip -r "English_Explainer_v${VERSION}.zip" "$TEMP_DIR"

# 清理临时目录
rm -rf "$TEMP_DIR"

echo "打包完成：English_Explainer_v${VERSION}.zip" 