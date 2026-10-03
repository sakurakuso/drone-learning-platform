#!/bin/zsh
cd "$(dirname "$0")" || exit 1
npm run build && npm run preview
