# DSH 生态追踪（公开数据）

[![CI](https://img.shields.io/github/actions/workflow/status/moluz/dsh-ecosystem/ci.yml?branch=main&job=validate&label=validate)](https://github.com/moluz/dsh-ecosystem/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/moluz/dsh-ecosystem)](LICENSE)

面向 **其他 DSH 会话/Agent** 的可引用知识库：记录 DSH 宿主版本、本机 profile 插件、插件市场里的同类项目与「可借鉴 / 不借鉴」结论。

## 给其他会话怎么用

- 机器可读（推荐给 DSH 会话，走 GitHub API，最稳）：
  `mcp__github__get_file_contents(owner="moluz", repo="dsh-ecosystem", path="data/ecosystem.json")`
- 公网直链：<https://raw.githubusercontent.com/moluz/dsh-ecosystem/main/data/ecosystem.json>
- CDN 镜像：<https://cdn.jsdelivr.net/gh/moluz/dsh-ecosystem@main/data/ecosystem.json>
- 人可读：本 README + [docs/tracking.md](docs/tracking.md)
- 引用约定：注明 `schemaVersion` 与 `generatedAt`，**市场总数每天都在变**，不要把旧快照当现状。

> 注：某些受限网络环境（例如本机沙箱）可能无法直连 raw/CDN，但 GitHub API 与 MCP 通道可用；以 MCP 结果为准。

## 数据说明

`data/ecosystem.json`（schemaVersion 1）：

| 字段 | 含义 |
|---|---|
| `dsh.version` | 本机运行的 DSH 版本（bundles 版本号） |
| `dsh.profile.enabledBundles` | 当前 profile 启用的 bundle（stock / local） |
| `dsh.profile.availableOptionalBundles` | 可安装但未启用的官方实验 bundle |
| `pluginMarket` | 插件市场索引地址、标题、条目总数（快照） |
| `adjacentPlugins` | **同类插件**（便签墙 / 看板 / todo），每条含 repo、版本、摘要、`borrow`、`notBorrow` |
| `nonDshReferences` | 非 DSH 产品的「只看这一点」参考 |
| `localSiblingProjects` | 同机上的兄弟项目（design-workbench、sticky-board） |

## 刷新流程（每次约 5 分钟）

1. `plugin_manager action=list_bundles` → 更新 `dsh.version` 与 `enabledBundles`；
2. `plugin_market action=list_indexes` 取索引地址，`action=list_plugins query="kanban board"` / `"sticky notes"` 等 → 更新 `adjacentPlugins`（只保留同类，宁缺毋滥）；
3. 更新 `generatedAt`，提交。

## 维护 workflow 的权限

`.github/workflows/**` 是 GitHub 受保护路径，API 写入需要 **Workflows 写权限**（细粒度 PAT）或 classic PAT 的 `workflow` scope。`scripts/publish-github.mjs` 默认跳过 `.github/**`；确需推送工作流时设 `DSH_ECO_PUBLISH_WORKFLOWS=1`，并临时使用带 workflow 权限的 token（用完即删）。

## 判断标准（收录同类时必须满足）

1. 与本项目**形态重叠**（便签墙 / 看板 / todo 板），而不是泛工作流插件；
2. 能指出**具体可借鉴点**或**明确不借鉴点**，否则不收录；
3. 本地优先/单机向，或能说明其外部依赖对我们意味着什么。

## 许可

MIT（数据本身可自由引用，请保留来源链接）。
