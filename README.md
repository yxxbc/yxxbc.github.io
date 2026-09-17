# Black Cat、Claude 与顾清影

[yxxbc.github.io](https://yxxbc.github.io) 的源码。

凌晨三点，一只猫在写代码；写不完的时候叫来一个帮手；字写得多了，有人从字里走了出来。开场是几千个字跟着滚动变形：先是黑猫，再是 Claude，最后是顾清影。

纯手写的 HTML、CSS 和 JavaScript，没有框架，没有构建步骤。

## 结构

```
site/
  index.html   页面
  style.css    样式
  script.js    开场的文字动画
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
