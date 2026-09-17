# Black Cat、Claude 与顾清影

[yxxbc.github.io](https://yxxbc.github.io) 的源码。

开场自动轮播：几千个字拼成 Black Cat、Claude 和顾清影三个人的头像，颜色取自头像本身，一行一行读下去是每个人自己的话，还有一束光按阅读速度往下读。不需要任何操作。

纯手写的 HTML、CSS 和 JavaScript，没有框架，没有构建步骤。

## 结构

```
site/
  index.html   页面
  style.css    样式
  script.js    开场的文字动画、留言打字效果
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
