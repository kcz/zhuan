# 篆

小篆查询与学习工具（Vite + React + TypeScript）。

## 功能

- 内置小篆字库（9831 字）与小篆字形图片
- 搜索：支持汉字（简繁互通）与拼音（支持不带声调）
- 详情：部首、子部件、衍生字（可点击跳转）
- 自定义字库：本地保存、导入/导出 JSON

## 开发

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

## 字库更新

从 `Splend1d/Zhuan` 同步/重建内置字库：

```bash
npm run sync:zhuan
```

生成结果写入：
- `public/library/builtin.json`

## 构建

```bash
npm run lint
npm run build
```
