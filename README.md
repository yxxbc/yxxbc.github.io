# Black Cat 与顾清影

[yxxbc.github.io](https://yxxbc.github.io) 的源码。

一个写代码的人，和一个被写出来的人。开场是夜与雾两个世界，中间那条线可以拖动，两边各藏着一点东西。

纯手写的 HTML、CSS 和 JavaScript，没有框架，没有构建步骤。

## 结构

```
site/
  index.html   页面
  style.css    样式
  script.js    分界线、猫的眼睛、终端对话
  404.html     找不到页面时
  img/         图片
```

## 本地预览

```bash
cd site && python3 -m http.server
```

## 发布

推送到 `main` 后，GitHub Actions 会把 `site/` 发布到 GitHub Pages。

## License

[GPL-3.0](LICENSE)
