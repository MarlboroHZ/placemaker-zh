# Placemaker 简体中文使用与维护

## 当前版本

60 个中文语言文件覆盖全部 7,731 个有效英文键；原始英文文件共有 7,756 条定义，其中包括重复键。采用经用户授权的机器辅助翻译，并定向校对高频术语、菜单、停车场、建造结果与永久改动警告。尚未逐条人工精校的译文会在报告中标为 `unreviewed`，这表示待精校，不是漏译。以检查报告的实时数量为准。

UI 已支持“跟随游戏 / 简体中文 / English”，即时切换并保存选择。独立语言设置只影响 Placemaker 面板；游戏原生设置页和游戏直接显示的提示仍跟随游戏语言。显示全部原生提示的中文时，也请将游戏设为简体中文。

已通过 UI 编译、浏览器模拟面板测试和语言检查器测试。浏览器模拟目录含上游旧键，部分模拟内容会回退为旧英文；它不是游戏内验证。当前电脑未具备游戏程序集和 .NET 构建环境，尚未生成完整 DLL 安装包、运行真实游戏队列或安装到游戏。

## 在游戏电脑构建安装包

需要 Node.js、.NET SDK、目标游戏版本的 `Cities2_Data/Managed`。项目原始说明针对游戏 1.6.2f1；其他版本需要重新验证。

在项目根目录打开 PowerShell，替换实际路径：

```powershell
powershell -ExecutionPolicy Bypass -File tools/localization/Build-Package.ps1 -ManagedPath 'D:\实际游戏目录\Cities2_Data\Managed'
```

脚本会检查汉化、安装缺少的 UI 依赖、构建模组，并在 `.forensics/packages/` 输出 ZIP。它不会安装到游戏；打包脚本目前仅通过语法检查，完整构建需在具备游戏依赖的电脑执行。

ZIP 包含 `Placemaker` 文件夹：DLL、Harmony 与许可证、Lang、Recipes，以及 UI 资源。`localization-build.json` 记录源码提交与目标程序集版本；请将匹配的源码一并保留，遵守项目 GPL-3.0 许可证。

先关闭游戏，备份旧的 `Placemaker` 文件夹，再把新文件夹放到：

```text
%USERPROFILE%\AppData\LocalLow\Colossal Order\Cities Skylines II\Mods\Placemaker
```

避免同时启用另一份同名模组。不要只复制中文 JSON 就认为已经安装了带语言切换的新 UI。

在真实游戏中先用测试存档验证道路、停车场、公园和商店/广场；按项目规则运行 `tools/suite/Show.ps1`，例如：

```powershell
powershell -File tools/suite/Show.ps1 -Category parks -Type park -Style formal -Who localization
```

检查日志和计划、建造结果、地形三张图，另检查中文面板和语言切换。游戏队列结束后会还原用户版本，不会把测试版本保留为已安装版本。

## 同步作者更新

项目发布配置中的原作者链接为 `https://github.com/jackwrichards/placemaker`；配置 remote 前应核对自己 fork 的 GitHub 父仓库。本次没有自动更改 remote，也没有推送、发布或实际合并上游新版本。

确认原作者仓库后，只需配置一次：

```powershell
git remote add upstream https://github.com/jackwrichards/placemaker.git
```

之后先提交当前工作，再运行：

```powershell
# 仅抓取和查看差异，不合并工作代码
powershell -File tools/localization/Sync-Upstream.ps1

# 创建 codex/zh-update-时间 分支后合并，不直接覆盖当前分支
powershell -File tools/localization/Sync-Upstream.ps1 -Merge
```

合并冲突会保留在 Git 中供人工处理，不自动覆盖。脚本会运行原文提取检查和汉化检查。新增、修改、删除的英文都会列入报告；检查失败是需要处理的信号，不要直接跳过。

GitHub 工作流 `.github/workflows/localization.yml` 会在推送、拉取请求或手动触发时运行检查。工作流尚未推送运行；它不会定时合并作者代码，也不会自动发布或安装。同步脚本目前通过语法检查，未实际远程合并。

## 检查和补译

```powershell
node UI/tools/extract-lang.js --check
node tools/localization/check.cjs
node --test tools/localization/check.test.cjs
```

报告：`.forensics/localization/zh-HANS-report.json`。

| 字段 | 含义 |
| --- | --- |
| missing | 缺失或空白中文 |
| changed | 相对上次接受版本新增、修改或删除的英文，含被重复键覆盖的定义 |
| invalid | 占位符或标记不一致 |
| untranslated | 中文与英文完全相同，且不属于明确允许的品牌、数字或格式模板 |
| obsolete | 英文已移除的中文键 |
| conflicts | 未确认的新重复键冲突 |
| knownSourceConflicts | 上游已有的 5 组冲突，精确保存全部定义；任一变化都会重新报错 |
| manuallyReviewed / unreviewed | 已校对（含按统一术语核对）/机器辅助待逐条精校 |

默认检查对前六类问题返回非零退出码；加 `--strict-review` 还会把待精校项作为失败。检查器不声称覆盖绕过本地化机制的硬编码文字。

在 `Lang/zh-HANS.<area>.json` 修改中文，不修改键名或 `{0}` 等占位符。UI 原文从源代码提取，不直接编辑生成的 `en-US.ui.json`。`glossary.json` 为术语参考，修改它不会自动重写所有语言文件。

完成某些条目的人工校对后，把键名写成 JSON 数组文件：

```powershell
node tools/localization/check.cjs --review reviewed-keys.json
```

完成本次上游原文变更的翻译和核对后：

```powershell
node tools/localization/check.cjs --accept-source
node tools/localization/check.cjs
npm run build --prefix UI
```

`--accept-source` 只记录当前英文版本，不会把机器译文标为人工已校对。正常检查不会自动更新英文基线或校对记录。最后再打包并做真实游戏验证。

## 浏览器模拟页面的翻译

在 `UI` 目录运行 `npm run mock -- --no-host --port 4317`，打开 `http://127.0.0.1:4317/?fake=1`。
模拟目录含有旧版控件和演示用预设，不能代表完整的游戏目录。它们的补充中文在 `UI/mock/zh-HANS.json`，
通过模拟专用 webpack 别名载入，正式游戏词典优先，补充文本不进入游戏发布包。
修改模拟目录时运行 `npm run test:ui -- --no-host language.spec.ts`（需要安装 Playwright 浏览器）。
该测试覆盖模拟目录的名称、选项、预设、提示和占位符，并展开公园、道路、停车场、广场的设置检查显示。
主语言检查器的 7731 条统计只涵盖正式 `Lang` 文本，不包含这份模拟词典，也不证明模拟资产名称或真实游戏显示已完整验证。
