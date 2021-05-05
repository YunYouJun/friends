# [云游君的小伙伴们](https://www.yunyoujun.cn/links/)

[![YunYouJun Friends](https://github.com/YunYouJun/friends/workflows/YunYouJun%20Friends/badge.svg)](https://friends.yunyoujun.cn)
[![links.json](https://img.shields.io/badge/links.json-yellow)](https://friends.yunyoujun.cn/links.json)

## 友链说明

如果您想和咱交换友链，还请阅读一下内容。谢谢配合～

如网站链接、描述、头像等信息更换，请在此创建新的 `Pull Request`。

> 因为现在友链已较多，所以会逐渐减少友链申请的通过比例。
> 所有关闭的 PR 咱一定会说明理由，这可能与我个人的喜好有关，并不代表您的博客本身有何问题，还请见谅，谢谢！

### 原则

- 申请的友链将经过筛选（请按格式填好哦～）。
- 原则上最好为使用 HTTPS 协议站点，且拥有自己的独立域名。
- 会使用 Git 与 GitHub。
- 已添加友链不会轻易删除。如您已移除本站链接，本站也将移除友链。
- 最终解释权归咱自己所有。

#### 内容原则

- 不存在政治敏感问题及违法内容。
- 没有过多的广告以致有碍观瞻、无恶意脚本。
- 最好是有实质性原创内容的网站。（包括但不局限于）
  - 能够帮助到别人的文章
  - 可以让别人更加了解你的生活类文章
  - 自己的业余创作分享
  - 有自己见解的喜好分享
- 至少有 10 篇原创文章（因为这样才能确定你是否有意坚持下去，并从中了解你）。
- 转载文章须注明出处。

### 格式

```yml
- url: https://www.yunyoujun.cn
  avatar: https://cdn.jsdelivr.net/gh/YunYouJun/yunyoujun.github.io/images/avatar.jpg
  name: 云游君
  blog: 云游君的小站
  desc: 希望能成为一个有趣的人。
  # Or: All at sea.
  email: me@yunyoujun.cn
  color: "#0078e7"
```

- `url`: 博客链接
- `avatar`: 头像图片链接，须使用 HTTPS（须为正方形或圆形），在保证清晰度的前提下，越小越利于迅速加载展示哦～
- `name`: 阁下怎么称呼？
- `blog`: 您的站点名称
- `desc`: 一句话描述，描述一下 `自己` 或者 `站点` 或者 `喜欢的话`？（最好不要太长，否则会被截断。）
- `email`: 联系方式，请提供你可以公开的邮箱地址以方便联系。
- `color`: 喜欢的颜色（没有填的话，默认是灰色 `gray` ！）

如果你的文本存在特殊字符时，请使用双引号包裹。（譬如颜色须使用 `"#000000"`，而不是直接 `#000000`。）

### 如何交换友链

- 在 GitHub 上 `Fork` 此仓库
- 按照以上格式在 [`public/links.yml`](./public/links.yml) 文件末尾新增你的信息（最末尾留一个空行）
- 完成后，新建 `Pull Request`
- 当 `Pull Request` 被合并后，请尽快于您的站点添加本站友链，您的站点将在 10 分钟内显示在[云游君的小伙伴](https://www.yunyoujun.cn/links/)里。

## Cli

```bash
yarn friends
```
