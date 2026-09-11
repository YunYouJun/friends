# 检测与报告维护

[返回 README](../README.md) · [飞书与邮件通知](./notifications.md) · [查看状态报告](https://friends.yunyoujun.cn/status/)

friends 使用 [meodp](https://github.com/YunYouJun/meodp) 检测 [`public/links.yml`](../public/links.yml)，设置集中在 [`meodp.config.ts`](../meodp.config.ts)。需要 Node.js 22.19+，无需安装浏览器。

## 本地检测

```bash
pnpm install
pnpm run check:links

# 调整请求超时，或让不可访问的站点导致退出码 1。
pnpm run check:links --timeout 15000 --fail-on unavailable

# 查看参数，不发起网络请求。
pnpm run check:links --help
```

`check:links` 发起友链网络检测，`report:links` 从已有数据导出静态报告；`lint` 和 `typecheck` 分别检查代码规范和类型。默认只生成维护报告，友链不可访问不会阻止构建；输入、执行或报告写入错误仍会返回非零退出码。

检测只访问站点地址及重定向目标，头像、站内文章和第三方资源不参与判定。命令不会修改 `links.yml` 或 `away.yml`，报告也不包含邮箱等其他友链字段。

## 查看与导出报告

| 产物 | 路径 | 用途 |
| --- | --- | --- |
| JSON | `reports/friends/report.json` | 保存数据，供后续导出和通知读取 |
| Markdown | `reports/friends/report.md` | 阅读摘要或在 Actions 中查看 |
| 独立 HTML | `reports/friends/report.html` | 直接打开，离线查看交互报告 |
| 静态站点 | `reports/site/` | 部署 `index.html` 和 `report.json` |

HTML 支持状态筛选、搜索、排序、分页、展开详情，以及从本地文件或 URL 加载其他 JSON 报告。报告包含友链名称、HTTP 状态、重定向、失败原因、上次成功时间和连续失败次数。

- `reachable`：HTTP 可访问，不代表内容或域名归属已验证。
- `restricted`：401/403/429 等访问限制，需要复核。
- `unavailable`：本次网络、证书、超时或 HTTP 错误，需要结合历史判断。

`check:links` 会自动生成上述产物。已有 JSON 时，可单独导出静态站点，不重新检测：

```bash
pnpm run report:links
```

将 `reports/site/` 部署到静态托管即可。`index.html` 内嵌离线快照，托管访问时会加载同目录的 `report.json`，以后替换 JSON 即可更新数据。通过 URL 加载跨域报告需要允许 CORS。页面显示的是观测时间和检测环境，不是实时监控。

输出格式由 `check.reporter` 配置；`report.reporter: 'html'` 用于构建状态页，`report.input` 指定已保存的 JSON。可用 `--reporter json,markdown` 临时替换格式选择。命令行参数优先于配置；配置中的文件路径相对配置文件解析，命令行路径相对当前目录解析。

完整配置规则和公开 API 见 meodp 的[报告格式](https://yunyoujun.github.io/meodp/zh/guide/reports#reporters)与[项目配置文档](https://yunyoujun.github.io/meodp/zh/guide/configuration)。friends 只维护友链数据、配置、快照读写脚本和 Actions 编排，通用检测、报告与通知逻辑由 meodp 维护。

## 历史与检测环境

本机历史存放在 `.cache/friends/local.json`，以机器名标识执行环境。更换机器或网络时，可使用新的 `--history` 路径和 `--observer` 名称。连续失败次数表示跨次观测，不代表已经连续宕机多少天。

CI 从 `gh-pages` 分支的 `status/report.json` 恢复上次发布的历史，只接受 `github-actions-ubuntu` 观测环境的数据；初始本机快照不会混入 CI 历史。每轮附件同时保存新报告和检测前的 `previous/report.json`，供飞书、邮件使用同一份固定基线。GitHub 托管运行器的网络可能变化，结果仍需人工复核后再处理友链。

## 发布状态页

`pnpm run build` 将 `public/status/report.json` 渲染为 `dist/status/`，随现有 GitHub Pages / EdgeOne 静态构建发布到 [/status/](https://friends.yunyoujun.cn/status/)。构建只读取已保存的数据，不发起检测。

本地生成和预览快照：

```bash
pnpm run check:links
pnpm run report:links:save
pnpm run build
```

保存命令验证数据格式后原子替换快照，缺失或无效报告不会覆盖上次结果。本地文件用于预览；要更新线上报告，请在 Actions 中手动运行 [YunYouJun Friends](https://github.com/YunYouJun/friends/actions/workflows/build.yml)。单独运行 [Check friend links](https://github.com/YunYouJun/friends/actions/workflows/check-links.yml) 只检测并上传附件，不部署或通知。

线上历史以 `gh-pages/status/report.json` 为准，默认分支中的 JSON 保留为本地预览快照。Actions 的普通代码构建先执行 `pnpm run report:links:restore`，读取已发布快照，避免覆盖最新检测数据。

[`edgeone.json`](../edgeone.json) 将 `/status/report.json` 以 302 临时重定向到发布分支。状态页与其他页面由现有 EdgeOne Git 集成构建部署：命令为 `pnpm run build`，产物目录为 `dist`，Node.js 使用 24，无需额外服务或部署凭证。

## 每周自动检测与部署

[YunYouJun Friends](../.github/workflows/build.yml) 在北京时间每周一 09:17（UTC 01:17）运行，也支持手动执行：

1. 调用可复用的 [Check friend links](../.github/workflows/check-links.yml) 检测友链，生成报告，上传保留 30 天的附件。
2. 通过 lint、类型检查和自动化测试后，保存快照并构建静态站点。
3. 将完整静态产物发布到 `gh-pages`；EdgeOne 状态页通过 JSON 临时重定向读取最新报告。
4. 轮询公开状态页，确认 JSON 与本次报告完全一致且交互页面已部署。最多尝试 24 次，间隔 15 秒；超时或仍是旧数据会令流程报错。
5. 在线验证成功后，按仓库变量启用[飞书或邮件通知](./notifications.md)。两个通道独立运行。

定时运行不向受保护的默认分支推送数据提交。普通代码推送只构建和部署已有报告；它与定时部署使用同一并发组，避免覆盖。

配置合并到默认分支后定时任务才会生效。GitHub 定时任务可能延迟；公开仓库长期无活动时也可能自动停用，可在 Actions 页面检查并重新启用。相关平台说明：[GitHub 定时工作流](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)、[EdgeOne Git 部署](https://pages.edgeone.ai/document/create-deploys)。
