# Black Cat、Claude 与顾清影

[yxxbc.github.io](https://yxxbc.github.io) 的源码。

开场是几千个字轮流拼成黑猫、Claude 和顾清影，自己会动：猫眨眼、Claude 转、清影像雾一样飘。移动鼠标能拨开字，点一下能把它们打散，底下的按钮可以直接切换人物。

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
