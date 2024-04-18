# Gitlab yaml to js

## 解決問題

當 API 文件更新新參數與內容時發送合併情求更新至後台專案內。

## 思路

1. 下載 API 專案 yml 文件
2. 轉換格式後 index.js 是否有變化
3. 有則發送請求至後台專案，且專案更新 master

```
git push -o merge_request.create -o merge_request.title="[Feature] 建立自動合併請求" -o merge_request.remove_source_branch origin amu/merge_request
```

