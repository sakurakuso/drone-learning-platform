#!/bin/zsh
cd "$(dirname "$0")" || exit 1
if [[ ! -d node_modules ]]; then
  echo '本地依赖缺失。请先执行 npm ci --cache .npm-cache'
  exit 1
fi
npm run dev
