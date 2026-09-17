# Black Cat

[yxxbc.github.io](https://yxxbc.github.io) 的源码。Hugo 搭的，主题是自己写的，没有依赖任何第三方主题。

## 写文章

每篇文章是 `content/post/` 下的一个文件夹，图片和 `index.md` 放在一起：

```bash
hugo new content post/my-post/index.md
```

会按 `archetypes/post.md` 生成模板，默认 `draft: true`，写完改成 `false` 才会发布。

```yaml
---
title: 文章标题
date: 2026-09-17
slug: my-post          # 网址：/p/my-post/
description: 一句话简介，会显示在列表和搜索结果里
cover:
  image: cover.png     # 可选，列表里的缩略图
categories: [技术]
tags: [Linux]
draft: false
---
```

## 本地预览

```bash
hugo server -D
```

需要 Hugo extended 0.146 以上。

## 发布

推送到 `main` 后，GitHub Actions 会自动构建并发布到 GitHub Pages。

## 改网站

| 想改的 | 在哪 |
| :-- | :-- |
| 站点标题、导航、签名 | `hugo.yaml` |
| 首页「我在做的东西」 | `data/projects.yml` |
| 友链 | `data/friends.yml` |
| 关于页 | `content/about/index.md` |
| 样式 | `assets/css/main.css` |
| 模板 | `layouts/` |

## License

[GPL-3.0](LICENSE)
