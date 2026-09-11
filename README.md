# [云游君的小伙伴们](https://www.yunyoujun.cn/links/)

[![YunYouJun Friends](https://github.com/YunYouJun/friends/workflows/YunYouJun%20Friends/badge.svg)](https://friends.yunyoujun.cn)
[![links.json](https://img.shields.io/badge/links.json-yellow)](https://friends.yunyoujun.cn/links.json)

> 因为现在友链真的已经很多了，所以暂时不再接受新的友链了！（除非你有自信你的内容真的很有趣，哈哈哈哈哈！）

## 友链说明

如果您想和小云交换友链，请阅读以下内容。谢谢配合～

如网站链接、描述、头像等信息更换，请在此创建新的 `Pull Request`。

> 因为现在友链已较多，所以会逐渐减少友链申请的通过比例。
> 所有关闭的 PR 我一定会说明理由，这可能与我个人的喜好有关，并不代表您的博客本身有何问题，还请见谅，谢谢！

### 原则

- 申请的友链将经过筛选（请按格式填好哦～）。
- 原则上最好为使用 HTTPS 协议站点，且拥有自己的独立域名。
- 会使用 Git 与 GitHub。
- 已添加友链不会轻易删除。如您已移除本站链接，本站也将移除友链。
- 站点长时间无法访问，或一年以上没有任何更新，我将视情况撤下友链。

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
  avatar: https://www.yunyoujun.cn/images/avatar.jpg
  name: 云游君
  blog: 云游君的小站
  desc: 希望能成为一个有趣的人。
  # Or: All at sea.
  email: me@yunyoujun.cn
  color: '#0078e7'
```

- `url`: 博客链接
- `avatar`: 头像图片链接，须使用 HTTPS（须为正方形或圆形），在保证清晰度的前提下，越小越利于迅速加载展示哦～
- `name`: 阁下怎么称呼？
- `blog`: 您的站点名称
- `desc`: 一句话描述，描述一下 `自己` 或者 `站点` 或者 `喜欢的话`？（最好不要太长，否则会被截断。）
- `email`: 联系方式，请提供你可以公开的邮箱地址以方便联系。
- `color`: 代表色、喜欢的颜色（没有填的话，默认是灰色 `gray` ！）

如果你的文本存在特殊字符时，请使用双引号包裹。（譬如颜色须使用 `"#000000"`，而不是直接 `#000000`。）

### 如何交换友链

- 在 GitHub 上 `Fork` 此仓库
- 按照以上格式在 [`public/links.yml`](./public/links.yml) 文件末尾新增你的信息（最末尾留一个空行）
- 完成后，新建 `Pull Request`。PR 标题须遵循 `<type>(<scope>): <subject>` 格式，emoji 可放在 subject 中自由发挥。例如新增友链使用 `feat(links): ✨ add yunyoujun.cn`，更新现有友链使用 `fix(links): 🔧 update yunyoujun.cn`。
- 当 `Pull Request` 被合并后，请尽快于您的站点添加本站友链，您的站点将在 10 分钟内显示在[云游君的小伙伴](https://www.yunyoujun.cn/links/)里。

## Cli

```bash
# npm run friends
pnpm friends
```

## 检查友链可访问性

使用通用 npm 包 [meodp](https://github.com/YunYouJun/meodp) 检查 `public/links.yml` 中的站点。需要 Node.js 22.19+；无需安装浏览器。

脚本按检查对象命名：`check:links` 发起友链网络检测，`report:links` 从已有数据导出静态站点；`lint` 和 `typecheck` 分别检查代码规范和类型。

通过 `check.reporter` 配置检测输出格式：检测输出 JSON、Markdown、独立 HTML 和静态站点；`report.reporter: 'html'` 将构建限定为状态页。`report.input` 读取已保存的公开 JSON，导出时不会重新检测。可用 `--reporter json,markdown` 临时替换格式选择。

所有检测、报告和通知设置集中在 [`meodp.config.ts`](./meodp.config.ts)，使用 `meodp/config` 的 `defineConfig` 获得类型提示。命令行参数优先于配置；配置内的文件路径相对配置文件解析，命令行路径相对当前目录解析。

通用逻辑由 meodp 维护：历史恢复、状态变化判断、飞书卡片、应用私聊 / webhook、SMTP 和部署结果验证。friends 只保留友链数据、配置、读取和保存发布快照的薄脚本和 GitHub Actions 编排。维护脚本和测试使用 TypeScript 与 `tsx`，`pnpm run typecheck` 同时检查配置。

其他脚本也可以直接使用公开 API，无需引用 friends 的内部脚本：

```ts
import { readReport } from 'meodp/check'
import { createNotification } from 'meodp/notify'
import { createFeishuCard } from 'meodp/notify/feishu'
import config from './meodp.config'

const report = await readReport(config.notify.input)
if (report) {
  const message = createNotification(report, { ...config.notify, previousReport: undefined, mode: 'weekly' })
  if (message)
    console.log(createFeishuCard(message, config.notify))
}
```

```bash
pnpm install
pnpm run check:links

# 调整请求超时，或让不可访问的站点导致退出码 1。
pnpm run check:links --timeout 15000 --fail-on unavailable

# 查看检测参数，不发起网络请求。
pnpm run check:links --help
```

结果保存在 `reports/friends/report.html`、`reports/friends/report.md` 和 `reports/friends/report.json`。HTML 可直接打开，支持状态筛选、搜索、排序、分页和展开详情，也可加载其他 JSON 报告。报告包含友链名称、HTTP 状态、重定向、失败原因、上次成功时间和连续失败次数，不包含邮箱等其他友链字段。

- `reachable`：HTTP 可访问，不代表内容或域名归属已验证。
- `restricted`：401/403/429 等访问限制，需要复核。
- `unavailable`：本次网络、证书、超时或 HTTP 错误，需要结合历史判断。

只检查站点地址及重定向目标；头像、站内文章和第三方资源不参与判定。命令不会修改 `links.yml` 或 `away.yml`。默认只生成维护报告，友链不可访问不会阻止构建；输入、执行或报告写入错误仍会返回非零退出码。

本机历史存放在 `.cache/friends/local.json`，以机器名标识执行环境。更换机器或网络时，可使用新的 `--history` 路径和 `--observer` 名称。连续失败次数表示跨次观测，不代表已经连续宕机多少天。

GitHub Actions 提供 **Check friend links** 工作流。单独手动执行时只检测并上传报告附件；它也作为可复用工作流被每周发布流程调用。CI 从 `gh-pages` 分支的 `status/report.json` 恢复上次发布的历史，并将其放入本轮附件的 `previous/report.json`，仅接受 `github-actions-ubuntu` 观测环境的数据；初始本机快照不会混入 CI 历史。GitHub 托管运行器的网络可能变化，结果仍需人工复核后再处理友链。

导出可部署的静态报告站点（读取已有结果，不重新检测）：

```bash
pnpm run report:links
```

`check:links` 也会自动生成这一静态目录。将 `reports/site/` 的内容部署到任意静态托管即可。`index.html` 包含离线快照；托管访问时会加载同目录的 `report.json`，以后只需替换 JSON 即可更新数据。页面也支持从本地文件或 URL 加载其他报告，跨域 URL 需要允许 CORS。页面显示的是观测时间和检测环境，不是实时监控。

### 发布状态页

`pnpm run build` 会将仓库中的 `public/status/report.json` 渲染为 `dist/status/`。它随现有 GitHub Pages / EdgeOne 静态构建发布，访问路径为 [friends.yunyoujun.cn/status/](https://friends.yunyoujun.cn/status/)。构建只读取已保存的数据，不发起友链检测。

本地生成和预览快照：

```bash
pnpm run check:links
pnpm run report:links:save
pnpm run build
```

保存命令会验证数据格式并原子替换快照，缺失或无效报告不会覆盖上次结果。本地文件用于预览；要更新线上报告，请手动运行 **YunYouJun Friends** 工作流。单独执行 **Check friend links** 只生成附件，不发布。

线上历史以 `gh-pages/status/report.json` 为准，默认分支中的 JSON 保留为本地预览快照。普通代码构建先执行 `pnpm run report:links:restore` 读取已发布快照，避免新代码覆盖最新检测数据。`edgeone.json` 仅将 `/status/report.json` 以 302 临时重定向到该发布分支，状态页与其他页面仍由现有 EdgeOne 构建部署，无需额外服务或部署凭证。

### 每周自动检测与部署

**YunYouJun Friends** 工作流在北京时间每周一 09:17（UTC 01:17）运行，也可在 Actions 页面手动执行。流程依次完成：

1. 检测友链，生成 JSON、Markdown 和交互报告，并上传保留 30 天的附件。
2. 通过 lint、类型检查和自动化测试后，保存快照并构建静态站点。
3. 将完整静态产物发布到 `gh-pages`，保留默认分支的 PR 保护。EdgeOne 状态页通过 JSON 地址的临时重定向读取最新报告；Git 集成仍负责代码更新，构建命令为 `pnpm run build`，产物目录为 `dist`，Node.js 使用 24。
4. 轮询公开状态页，核对 JSON 与本次报告完全一致且交互页面已部署。最多尝试 24 次、间隔 15 秒，等待上游缓存刷新；超时或仍是旧数据会令流程报错。
5. 如已启用飞书或邮件，在线验证成功后发送通知。通知同时包含公开状态页和运行附件链接，两个通道独立运行。

定时运行不向受保护的默认分支推送数据提交。普通代码推送只构建和部署已有报告，不重新检测；它与定时部署使用同一并发组，避免覆盖。每次检测的附件同时保存新报告和检测前的旧快照，飞书、邮件均使用这份固定基线，部署后也不会拿新报告与自身比较。

配置合并到默认分支后定时任务才会生效。GitHub 定时任务可能延迟；公开仓库长期无活动时也可能自动停用，可在 Actions 页面检查并重新启用。详见 [GitHub 定时工作流文档](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)与 [EdgeOne Git 部署说明](https://pages.edgeone.ai/document/create-deploys)。

### 飞书机器人通知（推荐）

可以复用已启用的企业自建应用机器人，直接给个人发送卡片，无需额外部署服务。friends 使用现有「机器人小云」，通过应用身份调用消息 API。机器人需有 `im:message:send_as_bot`（或已有的 `im:message`）权限，收件人必须在应用可用范围内。详见 [飞书发送消息 API](https://open.feishu.cn/document/server-docs/im-v1/message/create)。

在仓库 **Settings → Secrets and variables → Actions** 配置：

| 配置 | 类型 | 说明 |
| --- | --- | --- |
| `LINK_FEISHU_MODE` | Variable | 留空或 `off` 关闭；推荐 `changes`，也支持 `weekly` |
| `FEISHU_TRANSPORT` | Variable | 私聊使用 `app`；群自定义机器人使用 `webhook`；friends 默认使用 `app` |
| `FEISHU_APP_ID` | Secret | 已发布应用的 App ID |
| `FEISHU_APP_SECRET` | Secret | 应用的 App Secret |
| `FEISHU_RECEIVE_ID` | Secret | 收件人的 ID；沿用现有账号映射或通过飞书官方工具获取 |
| `FEISHU_RECEIVE_ID_TYPE` | Variable | 默认 `open_id`；也支持 `user_id`、`union_id`、`email`。friends 使用现有映射的 `user_id` |

应用模式只向指定个人发送，不会同时调用群 webhook。复用机器人时保留现有权限及其他业务配置；凭证与收件人 ID 不写入代码或日志。

如希望发送到群，可设置 `FEISHU_TRANSPORT=webhook`，并配置 `FEISHU_WEBHOOK_URL` Secret；启用签名校验时增加 `FEISHU_WEBHOOK_SECRET` Secret，启用关键词校验时增加 `FEISHU_KEYWORD` Variable。新自定义机器人建议开启签名校验，复用机器人则沿用其现有安全设置。

本地通知默认关闭，通过 `--mode changes|weekly` 显式启用；Actions 从仓库变量传入该选项。飞书与邮件复用同一套状态变化规则：`changes` 只在新增异常、连续失败达到第 2 次、恢复访问或解除访问限制时通知；`weekly` 每次完整检测发布后都发送摘要。卡片包含两列状态统计、北京时间、检测环境、最多六项状态摘要，以及完整报告和 Actions 入口；测试卡片使用蓝色标题并明确标注历史快照。站点名称等外部内容使用纯文本，避免被解析为提及或卡片格式。

应用模式先获取短期 tenant token 再发送卡片，并为相同卡片与收件人生成稳定 UUID，在飞书支持的去重窗口内避免重复投递。HTTP 或业务错误会使通知任务失败；发送状态不确定时不自动重试。工作流重跑默认不再次发送通知。

```bash
# 离线预览测试卡片，不需要密钥，也不发送消息。
FEISHU_TRANSPORT=app pnpm run notify:links:feishu --test --dry-run

# 预览现有报告。
pnpm run notify:links:feishu --mode weekly --dry-run

# 显式发送一张测试卡片；需通过环境变量提供应用凭证和收件人配置。
FEISHU_TRANSPORT=app pnpm run notify:links:feishu --test
```

### 可选邮件通知

邮件默认关闭，不影响检测和报告发布。使用通用 SMTP，配置位置为仓库 **Settings → Secrets and variables → Actions**：

| 配置 | 类型 | 说明 |
| --- | --- | --- |
| `LINK_EMAIL_MODE` | Variable | 留空或 `off` 关闭；`changes` 仅重要变化；`weekly` 每次检测都发送摘要 |
| `SMTP_PORT` | Variable | 默认 `465`（TLS），也支持 `587`（强制 STARTTLS） |
| `SMTP_HOST` | Secret | SMTP 服务器地址 |
| `SMTP_USER` | Secret | SMTP 登录账号 |
| `SMTP_PASSWORD` | Secret | SMTP 密码或邮箱授权码 |
| `MAIL_FROM` | Secret | 发件地址，须符合邮箱服务商的授权要求 |
| `MAIL_TO` | Secret | 接收通知的维护者邮箱；多个地址用逗号分隔 |

建议先使用 `changes`：新增不可访问、新增访问限制、连续失败达到第 2 次、恢复访问或解除访问限制时提醒；相同异常从第 3 次起不重复发送。首次 CI 检测发现的异常会作为初始报告通知。访问受限会明确标注，不作为已失效友链处理。`weekly` 则每次都发送数量摘要、当前异常与恢复情况。

本地预览邮件内容（不连接 SMTP，也不需要密钥）：

```bash
pnpm run notify:links --mode changes --dry-run
# 每周摘要预览
pnpm run notify:links --mode weekly --dry-run
```

邮件只会在默认分支的检测和部署步骤成功后发送；单独运行 **Check friend links** 不发送邮件。失败任务的 rerun 跳过邮件，以减少重复通知；需要再次通知时请手动发起新的 **YunYouJun Friends** 运行。邮件发送失败会使通知任务报错，已部署的报告仍然保留。SMTP 接受投递不保证最终进入收件箱，首次启用后应核对收件结果。检测或部署本身失败时，请查看 GitHub Actions 失败通知。
