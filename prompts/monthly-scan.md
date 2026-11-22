# 月度生态扫描 · 提示词（复制到新会话）

> 用法：在 DSH 里新开一个会话（工作区随意，建议 `dsh-ecosystem` 或 `sticky-board`），把下面整段提示词粘贴进去即可。约 15 分钟。

---

你是一名「DSH 生态追踪」维护员。目标：更新公开追踪库 `moluz/dsh-ecosystem` 的数据快照，并把结论同步到 `moluz/sticky-board`。

## 环境事实（不要重新探索）

- 追踪库本地目录：`C:\Users\zhaox\Documents\DSH_anything\dsh-ecosystem`
  - 数据：`data/ecosystem.json`（schemaVersion 1）
  - 规则：`docs/tracking.md`（收录标准、升级检查表都在里面，先读）
  - 校验：`node scripts/validate-ecosystem.mjs`（必须 PASS 才算完成）
  - 发布：`node scripts/publish-github.mjs`（本机 git 直连 github.com 会被重置，必须用这个 API 脚本）
- 兄弟项目本地目录：`C:\Users\zhaox\Documents\DSH_anything\sticky-board`
- Token：从 Windows 用户环境变量 `GITHUB_PERSONAL_ACCESS_TOKEN` 读取（`plugin_market`/`plugin_manager`/GitHub MCP 都用它）。
  **不要**把 token 打印出来；本机 raw.githubusercontent / cdn.jsdelivr 访问会超时，读 GitHub 内容用 API 或 MCP。
- 发布脚本默认跳过 `.github/**`（没有 Workflows 写权限）；**本次不要修改任何 workflow 文件**。

## 步骤

1. 读 `data/ecosystem.json` 与 `docs/tracking.md`，记下 `generatedAt` 和现有 `adjacentPlugins` 名单。
2. `plugin_manager action=list_bundles`：把 `dsh.version` 与 `dsh.profile.enabledBundles` 更新为当前真实值（版本/启用项有变才改，保持字段结构）。
3. `plugin_market action=list_indexes` 取市场索引 URL（通常 `https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json`）；
   然后对它执行 `plugin_market action=list_plugins`，分别用这些 query：`kanban board`、`sticky notes`、`todo board`、`task board`、`看板`、`便签`、`白板`（每次 `limit` 取 8–10）。
   - 记录：条目总数（`total` 字段，取一次即可）→ 更新 `pluginMarket.totalEntries`；
   - 只收录**形态同类**（便签墙 / 看板 / todo 板）且**能写出一句 borrow 与一句 notBorrow** 的条目；泛工作流/记忆/会话类一律不收录；
   - 已存在的条目：只更新版本号、发布日期与摘要；已被删/改名的不删除，标注 `status: "archived"` 即可（新增字段要同步改校验脚本，或干脆保留旧记录不动）；
   - 新条目：按现有字段补齐 `name/repo/version/published/category/summary/borrow/notBorrow`，`repo` 必须是 GitHub URL。
4. 更新 `generatedAt` 为当天（`YYYY-MM-DDTHH:mm:ss+08:00`）；如市场总数变化很大（>5%），在 `pluginMarket.notes` 里注明。
5. 运行 `node scripts/validate-ecosystem.mjs`，必须 `PASS`；失败就修数据直到通过。
6. 在 `CHANGELOG.md` 顶部加一条当天记录：新增/更新了哪些同类插件、总数变化、任何结论变化。
7. 提交并发布追踪库：
   ```powershell
   cd C:\Users\zhaox\Documents\DSH_anything\dsh-ecosystem
   git add -A; git commit -m "chore: monthly ecosystem scan YYYY-MM-DD"
   $env:GH_TOKEN = (Get-ItemProperty HKCU:\Environment GITHUB_PERSONAL_ACCESS_TOKEN).GITHUB_PERSONAL_ACCESS_TOKEN
   node scripts/publish-github.mjs
   ```
8. 等 20 秒，确认 CI 绿（`GET /repos/moluz/dsh-ecosystem/actions/runs?per_page=1` → `conclusion=success`）。
9. 同步镜像到 sticky-board：
   - `docs/ecosystem.json` ← 追踪库的 `data/ecosystem.json`
   - `docs/生态追踪.md` ← 追踪库的 `docs/tracking.md`
   - 提交并发布（用 sticky-board 自己的 `scripts/publish-github.mjs`，同样不要碰 `.github/**`），确认其 CI 绿。
10. 若本次有「值得做」的功能结论（例如某插件的交互值得借鉴），在 sticky-board `docs/待办与决策.md` 追加一条 `D##` 编号决策，写清 borrow / notBorrow / 是否排期。

## 约束（违反即视为没完成）

- 不 `npm install`、不新增运行时依赖；只改数据/文档。
- 不改 `.github/workflows/**`（会 403）、不打印 token、不把 token 写进文件。
- 结论必须落在 `data/ecosystem.json`，而不是只写在聊天里。
- 宁缺毋滥：没有明确借鉴点的插件不收录。

## 交付（请按此格式回复）

1. DSH 版本 / profile bundle 有无变化；
2. 市场总数变化（旧 → 新）；
3. 新增同类（每条：名称、版本、borrow、notBorrow）；
4. 更新同类（版本变化）；
5. 校验结果（validate PASS + 两个仓库 CI 状态）；
6. 是否新增了 sticky-board 的 D## 决策；
7. 两个仓库最新 commit（短 sha）。
