# 飞书与邮件通知

[返回 README](../README.md) · [检测与报告维护](./link-checking.md)

通知由 [meodp](https://github.com/YunYouJun/meodp) 提供，设置集中在 [`meodp.config.ts`](../meodp.config.ts)。本地命令默认关闭通知；Actions 在默认分支检测、部署并验证公开报告成功后，按仓库变量启用飞书或邮件。两个通道独立运行，通知包含公开状态页和运行附件链接。

## 通知策略

在仓库 **Settings → Secrets and variables → Actions** 设置 `LINK_FEISHU_MODE` 或 `LINK_EMAIL_MODE` Variable：

| 值 | 行为 |
| --- | --- |
| 留空或 `off` | 关闭对应通道，不影响检测与发布 |
| `changes`（推荐） | 新增异常、连续失败达到第 2 次、恢复访问或解除访问限制时通知 |
| `weekly` | 每次完整检测发布后发送摘要，包括手动触发的运行 |

首次 CI 检测发现的异常会作为初始报告通知；相同异常从第 3 次起不重复触发 `changes` 通知。访问受限会单独标注，不作为已失效友链处理。连续失败按观测次数计算，不代表持续宕机时间。

本地可通过 `--mode changes|weekly` 显式启用，Actions 从仓库变量传入该选项。状态比较使用本轮检测前保存的旧快照，详见[历史与检测环境](./link-checking.md#历史与检测环境)。

## 飞书机器人

friends 复用现有「机器人小云」，通过企业自建应用身份向个人发送卡片，无需额外部署服务。机器人需有 `im:message:send_as_bot`（或已有的 `im:message`）权限，收件人须在应用可用范围内。详见[飞书发送消息 API](https://open.feishu.cn/document/server-docs/im-v1/message/create)。

在 Actions 中配置：

| 配置 | 类型 | 说明 |
| --- | --- | --- |
| `FEISHU_TRANSPORT` | Variable | 私聊使用 `app`；群自定义机器人使用 `webhook`；friends 默认使用 `app` |
| `FEISHU_APP_ID` | Secret | 已发布应用的 App ID |
| `FEISHU_APP_SECRET` | Secret | 应用的 App Secret |
| `FEISHU_RECEIVE_ID` | Secret | 收件人 ID，沿用现有映射或通过飞书官方工具获取 |
| `FEISHU_RECEIVE_ID_TYPE` | Variable | 默认 `open_id`，也支持 `user_id`、`union_id`、`email`；friends 使用现有映射的 `user_id` |

应用模式只向指定个人发送，不会同时调用群 webhook。复用机器人时保留现有权限及其他业务配置；凭证与收件人 ID 不写入代码或日志。

如需改为群通知，设置 `FEISHU_TRANSPORT=webhook`，并配置 `FEISHU_WEBHOOK_URL` Secret；启用签名校验时增加 `FEISHU_WEBHOOK_SECRET` Secret，启用关键词校验时增加 `FEISHU_KEYWORD` Variable。新自定义机器人建议开启签名校验，复用机器人则沿用其现有安全设置。

卡片包含两列状态统计、北京时间、检测环境、最多六项状态摘要，以及完整报告和 Actions 入口。测试卡片使用蓝色标题并明确标注历史快照，站点名称等外部内容使用纯文本。

```bash
# 离线预览测试卡片，不需要密钥，也不发送消息。
FEISHU_TRANSPORT=app pnpm run notify:links:feishu --test --dry-run

# 预览 reports/friends/report.json 中的现有报告。
pnpm run notify:links:feishu --mode weekly --dry-run

# 显式发送测试卡片；需通过环境变量提供应用凭证和收件人配置。
FEISHU_TRANSPORT=app pnpm run notify:links:feishu --test
```

## 邮件通知

邮件使用通用 SMTP，在 Actions 中配置以下内容，并按需设置 `LINK_EMAIL_MODE`：

| 配置 | 类型 | 说明 |
| --- | --- | --- |
| `SMTP_PORT` | Variable | 默认 `465`（TLS），也支持 `587`（强制 STARTTLS） |
| `SMTP_HOST` | Secret | SMTP 服务器地址 |
| `SMTP_USER` | Secret | SMTP 登录账号 |
| `SMTP_PASSWORD` | Secret | SMTP 密码或邮箱授权码 |
| `MAIL_FROM` | Secret | 发件地址，须符合邮箱服务商的授权要求 |
| `MAIL_TO` | Secret | 接收通知的维护者邮箱，多个地址用逗号分隔 |

本地预览已有报告的邮件内容，不连接 SMTP，也不需要密钥：

```bash
pnpm run notify:links --mode changes --dry-run
pnpm run notify:links --mode weekly --dry-run
```

## 重复投递与故障处理

单独运行 **Check friend links** 只上传报告，不发送通知。工作流重跑默认跳过飞书和邮件；需要再次检测并通知时，请手动发起新的 **YunYouJun Friends** 运行。

飞书应用模式先获取短期 tenant token，再发送卡片。相同卡片与收件人会生成稳定 UUID，在飞书支持的去重窗口内避免重复投递；发送状态不确定时不自动重试。

HTTP、飞书业务错误或邮件发送失败会使对应通知任务报错，已部署的报告仍然保留。SMTP 接受投递不保证最终进入收件箱，首次启用后应核对收件结果。检测或部署本身失败时，请查看 GitHub Actions 失败通知。

需要在其他项目复用通知能力时，参考 meodp 的[项目配置、投递与 API 文档](https://yunyoujun.github.io/meodp/zh/guide/configuration)，无需引用 friends 内部脚本。
