# ⎇ git-copilot

**智能代码审查 · Git 可视化 · 多智能体并行分析**

> 产品需求文档 (PRD) v1.0 · 2025-03

| 字段 | 内容 |
|------|------|
| 项目代号 | git-copilot |
| 文档版本 | v1.0 \| 2025-03 |
| 技术方向 | Node.js CLI · PocketFlow · Multi-Agent · Beads |
| 发布方式 | npx / pipx / Homebrew |
| 目标平台 | macOS · Linux · Windows (WSL) |

---

## 目录

1. [项目概述](#1-项目概述)
2. [功能需求](#2-功能需求)
3. [技术架构](#3-技术架构)
    * [3.5 代码风格与工程实践](#3-5-代码风格与工程实践)
4. [用户体验设计](#4-用户体验设计)
5. [发布与分发策略](#5-发布与分发策略)
6. [非功能性需求](#6-非功能性需求)
7. [开发里程碑](#7-开发里程碑)

---
## 1. 项目概述

### 1.1 产品定位

git-copilot 是一款运行于终端（CLI）的 AI 代码协作助手，深度集成本地 Git 仓库，通过多智能体并行分析框架对代码库进行全方位自动化代码审查，并以直观的终端可视化界面呈现 Git 历史、Issue/PR 状态及审查报告。

区别于云端代码审查平台，git-copilot 将所有数据处理、配置与报告生成保留在本地，用户可自由选择任意 LLM 提供商并配置私有 API Key，做到「数据不出本地」。

### 1.2 核心价值主张

- **本地优先**：所有数据、配置、历史报告均存储在本地，无需注册或上传代码
- **多 LLM 支持**：开箱即支持 OpenAI、Anthropic Claude、DeepSeek、Ollama 等 40+ 主流提供商
- **多智能体并行**：基于 PocketFlow 将代码审查拆解为多个专业 Agent 并行执行，提升分析速度与深度
- **Claude Skills 增强**：利用 Claude Skills 机制为各 Agent 加载专业知识库，实现安全、性能、架构等领域精准分析
- **Beads 记忆系统**：以 Beads 为核心记忆引擎，跨 Agent、跨会话管理上下文，让每次审查都能「记住」历史发现，持续进化
- **零摩擦集成**：npx / pipx 一行命令安装，无需复杂配置即可接入现有工作流
- **终端可视化**：内置 Git 提交图、进度仪表盘、审查报告终端渲染，无需离开命令行

### 1.3 目标用户

| 用户类型 | 使用场景 |
|---------|---------|
| 独立开发者 | 在无 CI 环境下对个人项目进行代码质量自查 |
| 小型团队 | 在本地 PR 合并前进行快速、低成本的 AI 辅助代码审查 |
| 安全研究员 | 对代码库进行安全漏洞扫描与风险评估 |
| 架构师 / Tech Lead | 定期对大型仓库进行架构健康度评估与技术债务分析 |

---

## 2. 功能需求

### 2.1 初始化与配置系统

#### 2.1.1 首次初始化向导

用户首次运行 `git-copilot init` 时，系统启动交互式配置向导（基于 Inquirer.js），引导用户完成以下配置：

- 选择默认 LLM 提供商，输入对应 API Key（本地加密存储）
- 配置代理（可选），选择界面语言（中文 / English）
- 选择报告输出格式（Markdown / HTML / Terminal）

#### 2.1.2 配置文件结构（`~/.git-copilot/config.yaml`）

- **providers**：所有已配置的 LLM 提供商列表，每项包含 `name`、`baseUrl`、`apiKey`（加密）、`model`、`maxTokens`
- **active_provider**：当前激活的提供商 ID
- **review**：并发 Agent 数、超时、最大文件数、忽略规则
- **output**：报告格式与路径
- **ui**：终端主题、颜色方案、动画开关
- **skills**：Claude Skills 知识库路径列表；内置 Skills（`docx` / `pdf` / `pptx` / `xlsx` / `frontend-design` / `web-artifacts-builder` / `theme-factory` / `doc-coauthoring` / `internal-comms` / `mcp-builder` / `skill-creator`）默认自动加载，用户可追加自定义 Skills 路径
- **beads**：记忆系统配置（max_context_tokens、retention_days、embedding_model 等）

#### 2.1.3 支持的 LLM 提供商（40+）

##### 🌐 国际主流云端

| 提供商 | 代表模型 | 特点 |
|--------|---------|------|
| OpenAI | GPT-4o / GPT-4.1 / o3 | 官方旗舰，流式输出，函数调用，Reasoning 系列 |
| Anthropic | Claude Sonnet 4.6 / Opus 4.6 | 原生 Claude Skills，200K 上下文，延伸思考 |
| Google DeepMind | Gemini 2.5 Pro / Flash / Nano | 100万 Token 窗口，多模态，Google Search 增强 |
| DeepSeek | deepseek-coder-v2 / R1 / V3 | 高性价比代码专用，R1 推理链，开源可本地部署 |
| xAI | Grok-2 / Grok-3 / Grok-Vision | 实时信息，超长上下文，代码推理能力强 |
| Mistral AI | Mistral Large 2 / Codestral / Pixtral | 欧盟 GDPR 合规，代码生成专项优化 |
| Cohere | Command R+ / Command A | 企业 RAG 增强，原生 Rerank，检索专项优化 |

##### ⚡ 高速推理平台

| 提供商 | 代表模型 | 特点 |
|--------|---------|------|
| Groq | Llama3.3-70B / Mixtral / Gemma2 | LPU 芯片，业界最低延迟（< 100ms），免费额度 |
| Fireworks AI | Llama3.1 / Mixtral / Qwen2.5 | 高并发推理，批量代码审查场景优化 |
| Together AI | Llama3 / Qwen2.5-Coder / DBRX | 开源模型云端托管，按量计费，价格极低 |
| Perplexity AI | Sonar Large / Sonar Pro / Online | 内置联网检索，依赖 CVE 漏洞实时查询 |
| Cerebras | Llama3.1-70B / 405B | 晶圆级芯片，超高吞吐，适合大批量扫描 |
| SambaNova | Llama3.1-405B / Qwen2.5 | RDU 架构，企业级高吞吐推理 |

##### 🏢 企业私有化 / 云托管

| 提供商 | 代表模型 | 特点 |
|--------|---------|------|
| Azure OpenAI | GPT-4o / o1 / o3-mini 企业版 | 私有化部署，合规审计，VNet 内网隔离 |
| AWS Bedrock | Claude / Llama3 / Titan / Nova | AWS IAM 权限管控，多模型统一 API |
| Google Vertex AI | Gemini / Claude on Vertex / PaLM | GCP 生态，企业 DLP，私有端点 |
| Cloudflare Workers AI | Llama3 / Mistral / Qwen（边缘） | CDN 边缘推理，极低延迟，慷慨免费额度 |
| Replicate | 任意开源模型（按需实例化） | 长尾专用代码模型，Serverless GPU |

##### 💻 本地推理

| 提供商 | 代表模型 | 特点 |
|--------|---------|------|
| Ollama | 任意 GGUF / GGML 模型 | 完全离线，零网络，支持 GPU/CPU 混合推理 |
| LM Studio | 本地任意模型（GUI 管理） | OpenAI 兼容 API，图形化模型管理器 |
| Jan | 本地任意模型（桌面客户端） | 跨平台桌面推理，兼容 OpenAI API |
| llama.cpp server | GGUF 原生服务器 | 极致轻量，树莓派 / 嵌入式设备可用 |
| vLLM | HuggingFace 任意模型 | PagedAttention 高吞吐，企业自托管首选 |
| text-generation-webui | HuggingFace 模型（WebUI） | 社区最广泛本地推理方案，插件生态丰富 |

##### 🇨🇳 国产大模型

| 提供商 | 代表模型 | 特点 |
|--------|---------|------|
| 通义千问 | Qwen2.5-Coder-72B / Qwen-Max | 阿里 DashScope，代码能力领先，72B 开源 |
| 智谱 AI | GLM-4 / GLM-4-Code / CogAgent | 国产代码模型，中文注释与文档理解优秀 |
| 文心一言 | ERNIE 4.5 / ERNIE Speed | 百度生态，企业中文合规，私有化方案成熟 |
| 月之暗面 | Kimi k1.5 / k2 / moonshot-v1-128k | 超长上下文（200万 Token），中英双语优化 |
| 字节豆包 | Doubao-pro-32k / Doubao-1.5-code | 字节火山引擎，代码专版，国内延迟最低 |
| 腾讯混元 | Hunyuan-pro / Hunyuan-Code | 腾讯云集成，企业私有化，金融 / 政务合规 |
| 百川 AI | Baichuan4 / Baichuan-Code | 金融行业优化，中文代码注释生成 |
| 阶跃星辰 | Step-2 / Step-1.5V | 多轮深度推理，架构分析场景突出 |
| MiniMax | MiniMax-Text-01 / abab6.5s | 超长上下文（100万 Token），性价比高 |
| 零一万物 | Yi-Large / Yi-1.5-34B-Code | 高性价比代码专用，API 稳定 |
| 讯飞星火 | Spark Max / Spark Pro | 科大讯飞生态，教育 / 政务合规场景 |
| 商汤日日新 | SenseChat-5 / SenseCode | 企业 AI 一体机，私有化部署成熟 |
| 心流 AI | SiliconFlow-8B / 72B | 模型聚合，高速推理，边缘部署优化 |

##### 🔀 聚合路由

| 提供商 | 代表模型 | 特点 |
|--------|---------|------|
| OpenRouter | 统一路由 200+ 模型 | 单 Key 访问所有主流模型，自动故障转移 |
| HuggingFace | Inference API / TGI Server | 开源模型生态，自托管 TGI 兼容 |
| LiteLLM Proxy | 代理任意 100+ 提供商 | 统一 OpenAI 格式，本地代理层 |

---

### 2.2 Git 仓库数据采集

#### 2.2.1 本地 Git 数据（通过 simple-git）

- **提交历史**：作者、时间戳、消息、文件变更统计
- **分支信息**：当前分支、远端列表、分支保护状态
- **标签与里程碑**：版本标签、语义化版本检测
- **差异分析**：指定提交范围内的文件 diff（用于增量审查）
- **工作区状态**：未提交变更、暂存区文件

#### 2.2.2 远端平台集成（可选）

- GitHub / GitLab / Gitea API：Issue 列表、PR 详情、Review 评论
- PR diff 获取：拉取指定 PR 的文件变更用于审查
- OAuth Token 配置：通过 `config.yaml` 配置 PAT

---

### 2.3 终端可视化系统

#### 2.3.1 Git 提交关系图（`git-copilot graph`）

- 有向无环图（DAG）展示分支合并历史，支持 ASCII + Unicode 混合渲染
- 节点着色：按作者 / 时间 / 提交类型区分颜色
- 快捷键导航：`j`/`k` 上下移动，回车展开提交详情，`/` 搜索
- 时间范围过滤：最近 N 次提交 / 指定日期范围
- 分支名、标签名悬浮显示

#### 2.3.2 代码审查进度可视化

- 多 Agent 并行进度仪表盘：实时显示每个 Agent 状态（等待 / 分析 / 完成 / 错误）
- 文件审查热图：按风险等级着色的文件树
- 总体进度条 + 预计剩余时间
- 可折叠的 Agent 思考过程实时日志流

#### 2.3.3 仓库健康仪表盘（`git-copilot dashboard`）

- 仓库综合健康评分（0–100 分，含安全 / 性能 / 架构 / 规范四个子维度）
- 热点文件 Top 10（改动频率 × 风险系数）
- 贡献者活跃度 Sparkline 图表
- 近期提交时序热图

---

### 2.4 多智能体代码审查系统

#### 2.4.1 PocketFlow 编排架构

代码审查任务基于 PocketFlow 框架构建三阶段 DAG 工作流：

- **Stage 1 — 并行分析层**：多个专业 Agent 同时对代码库进行独立分析（`AsyncParallelBatchNode`）
- **Stage 2 — 聚合层**：Aggregator Agent 收集所有分析结果并去重（`Node`）
- **Stage 3 — 报告层**：ReportWriter Agent 生成综合报告（`Node`）

#### 2.4.2 专业 Agent 定义

| Agent 名称 | 职责 | 输入 | 输出 |
|-----------|------|------|------|
| SecurityAgent | OWASP 安全漏洞扫描、XSS/注入/CSRF 检测 | 源代码文件、Git diff | 安全风险列表（严重/高/中/低） |
| PerformanceAgent | 算法复杂度分析、N+1 查询、内存泄漏 | 源代码、依赖树 | 性能优化建议、代码热点标注 |
| ArchitectureAgent | 设计模式识别、耦合/内聚分析、循环依赖检测 | 模块关系图、文件结构 | 架构改进建议、依赖关系图 |
| CodeQualityAgent | 圈复杂度度量、重复代码检测、命名规范审查 | 所有源码文件 | 质量评分、重构建议 |
| DependencyAgent | 过期依赖检测、CVE 漏洞扫描、许可证合规 | package.json / requirements.txt | 依赖风险报告 |
| GitHistoryAgent | 提交消息规范、大文件提交检测、敏感信息扫描 | Git 日志、Blob 列表 | 历史问题列表 |
| ReportWriterAgent | 汇总所有 Agent 输出、生成完整审查报告 | 各 Agent 结果、仓库元数据 | MD / HTML / JSON 报告 |

#### 2.4.3 Claude Skills 集成

当用户选择 Anthropic Claude 作为提供商时，各 Agent 在初始化时从预定义的 Claude Skills 知识库加载专业知识：

- `code-review-skills.md`：通用代码质量、最佳实践、可读性、可维护性分析
- `secure-code-review-skills.md`：Trail of Bits 安全审计方法论、漏洞模式识别、安全最佳实践
- `owasp-audit-skills.md`：OWASP Top 10、CWE 常见弱点、代码注入模式库、认证授权漏洞检测
- `web-design-audit-skills.md`：Web UI/UX 审计、可访问性、响应式设计、前端性能优化
- `code-review-report-skills.md`：代码审查报告结构化、关键发现总结、修复建议生成

Skills 文件可由用户自定义扩展，路径在配置文件 `skills` 节点中指定，支持热加载。

---

#### 2.4.4 内置 Skills 目录（已集成）

git-copilot 直接内置以下经过生产验证的 Claude Skills，**无需用户额外配置**，各功能模块按需自动加载对应 Skill：

##### 📄 报告生成 Skills
| **`code-review-report`** | ReportWriterAgent | 生成结构化的代码审查报告，包含问题分类、风险等级、修复建议和代码示例，支持自定义报告模板 |

| **`docx`** | ReportWriterAgent | 生成专业 Word 格式审查报告，含目录、页码、标题层级、代码块样式；支持直接发送给 PR 审阅者或上传至企业文档系统 |
| **`pdf`** | ReportWriterAgent | 输出 PDF 格式报告，适合存档、合规审计场景；支持合并多次审查报告、添加水印、加密保护 |
| **`pptx`** | ArchitectureAgent | 将架构评审结论生成可演示的 PPT，内含模块关系图、技术债务热图、重构路线图幻灯片，适合 Tech Lead 在 Sprint Review 中直接使用 |
| **`xlsx`** | DependencyAgent / CodeQualityAgent | 将依赖风险矩阵、代码质量指标、CVE 漏洞清单输出为 Excel 表格，方便团队筛选、排序、跟踪修复进度 |

##### 🎨 前端 & UI Skills
| **`web-design-audit`** | HTML 报告渲染 / Dashboard | 对 Web UI/UX 进行审计，评估可访问性、响应式设计、前端性能和视觉一致性，提供改进建议 |

| **`frontend-design`** | HTML 报告渲染 / Dashboard | 指导生成视觉一流的 HTML 审查报告与 Web 仪表盘；确保配色语义统一（红=高危、绿=通过）、排版精准、避免"AI 模板感"，输出有设计质感的交互报告页面 |
| **`web-artifacts-builder`** | 仓库健康仪表盘 | 基于 React 18 + TypeScript + Tailwind CSS + shadcn/ui 构建复杂交互式仪表盘 Artifact（提交热图、贡献者 Sparkline、风险文件树），支持多组件状态管理与路由，最终打包为独立 HTML 文件 |
| **`theme-factory`** | HTML 报告 / 导出报告 | 为生成的 HTML 报告、PPT 演示提供 10 套预设专业主题（Ocean Depths、Tech Innovation、Midnight Galaxy 等），用户可通过 `--theme` 参数指定，或基于品牌色自动生成自定义主题 |

##### 📝 文档协作 Skills
| **`doc-coauthoring`** | git-copilot review（交互模式） | 当用户以交互模式使用 `git-copilot review --interactive` 时，激活结构化文档协作流程：分三阶段（上下文收集 → 逐节精炼 → Reader 验收测试）协助用户将审查发现转化为可落地的技术改进文档、RFC 或 ADR（架构决策记录） |
| **`internal-comms`** | ReportWriterAgent | 将审查结论自动适配为团队内部通报格式（3P 状态更新、Incident Report、Sprint 进展同步），可直接复制到 Slack / Confluence，省去人工改写成本 |

##### 🔧 扩展开发 Skills
| **`awesome-skills/code-review`** | CodeQualityAgent | 整合来自 `awesome-skills` 社区的通用代码审查最佳实践和模式，提升代码质量和可维护性 |
| **`trailofbits/secure-code-review`** | SecurityAgent | 运用 Trail of Bits 的专业安全审计方法，进行深度代码分析，识别复杂漏洞模式和潜在安全风险 |
| **`security/owasp-audit`** | SecurityAgent | 专注于 OWASP Top 10 和 CWE 常见弱点，进行全面的安全审计，提供详细的漏洞描述和修复指南 |

| **`mcp-builder`** | 插件系统（v1.1） | 为社区开发者提供标准化的 MCP 服务器开发指南，用于构建 git-copilot 生态插件（如自定义 Agent、第三方 CI 集成、IDE 插件）；遵循 FastMCP / MCP SDK 最佳实践，降低插件接入门槛 |
| **`skill-creator`** | Skills 管理器（v1.1） | 提供自定义专业知识库 Skill 的创建、调优与评测工作流；团队安全专家可用其构建私有 `security-skills.md`，自动评估 Skill 触发准确率与分析深度，持续迭代优化 |

##### Skills 加载优先级

```
用户自定义 Skills（config.yaml 中指定）
    ↓ 高优先级覆盖
内置领域 Skills（code-review / secure-code-review / owasp-audit / web-design-audit / code-review-report 等）
    ↓
通用能力 Skills（docx / pdf / pptx / xlsx / frontend-design / web-artifacts-builder / theme-factory / doc-coauthoring / internal-comms / mcp-builder / skill-creator 等）
```

所有内置 Skills 均支持**热加载**——执行 `git-copilot update` 时自动拉取最新版 Skills 知识库，无需重装工具。

---

### 2.5 代码审查报告系统

#### 2.5.1 报告章节结构

1. **执行摘要**：仓库健康评分、关键风险汇总（3 句话概述）
2. **安全审查**：漏洞列表（含 CVE 编号）、风险等级、修复建议 + 代码示例
3. **代码质量**：复杂度报告、重复代码热图、规范违反列表
4. **性能优化**：性能瓶颈分析、优化前/后对比代码示例
5. **架构建议**：模块关系图（ASCII/SVG）、耦合度矩阵、重构路线图
6. **依赖健康**：过期依赖、CVE 漏洞、许可证风险
7. **Git 健康**：提交规范评分、历史重写风险、大文件清理建议
8. **修改示例集**：针对主要问题的可直接应用的代码 Patch

#### 2.5.2 报告输出格式

| 格式 | 说明 | 内置 Skill |
|------|------|-----------|
| Terminal | 使用 chalk + marked-terminal 在终端直接渲染 Markdown | — |
| Markdown | 输出 `.md` 文件，可直接粘贴到 PR 评论 | — |
| HTML | 输出带样式的独立 HTML，10 套主题可选，可在浏览器浏览 | `frontend-design` · `web-artifacts-builder` · `theme-factory` |
| Word (.docx) | 专业格式 Word 报告，含目录、页码、代码块样式，适合企业归档或发送给审阅者 | `docx` |
| PDF | 带水印 / 加密保护的 PDF，适合合规存档与外部分享 | `pdf` |
| PPT (.pptx) | 架构评审演示文稿，含关系图、热图幻灯片，可直接用于 Sprint Review | `pptx` |
| Excel (.xlsx) | 依赖风险矩阵、CVE 清单、质量指标结构化表格，方便团队跟踪修复 | `xlsx` |
| JSON | 结构化数据，供外部工具或 CI 集成 | — |

---

### 2.6 CLI 命令设计

| 命令 | 用法 | 说明 |
|------|------|------|
| 初始化 | `git-copilot init` | 交互式配置向导 |
| 配置管理 | `git-copilot config` | 查看/修改配置项 |
| 全量审查 | `git-copilot review` | 多智能体全量代码审查 |
| 增量审查 | `git-copilot review --since HEAD~10` | 仅审查最近 N 次提交变更 |
| PR 审查 | `git-copilot review --pr 123` | 审查指定 PR 的文件变更 |
| 交互审查 | `git-copilot review --interactive` | 启用 doc-coauthoring 协作模式，将发现转化为 RFC/ADR |
| Git 可视化 | `git-copilot graph` | 交互式 Git 提交关系图 |
| 仪表盘 | `git-copilot dashboard` | 仓库健康实时仪表盘 |
| 快速扫描 | `git-copilot scan --security` | 单维度快速扫描 |
| 报告导出 | `git-copilot export --format html` | 导出最新审查报告（支持 html / docx / pdf / pptx / xlsx / json） |
| 报告主题 | `git-copilot export --format html --theme tech-innovation` | 指定 HTML / PPT 报告主题（10 套内置主题） |
| 历史记录 | `git-copilot history` | 查看历次审查趋势 |
| Skills 管理 | `git-copilot skills list` | 查看已加载的内置与自定义 Skills |
| 更新 | `git-copilot update` | 更新工具及所有 Skills 知识库 |

---

## 3. 技术架构

### 3.1 整体分层架构

```
┌─────────────────────────────────────────────┐
│  UI 层        Ink (React) + Blessed          │  终端 UI 组件渲染
├─────────────────────────────────────────────┤
│  命令层       Commander.js                   │  命令路由与参数解析
├─────────────────────────────────────────────┤
│  编排层       PocketFlow DAG                 │  多 Agent 任务调度与数据流
├─────────────────────────────────────────────┤
│  记忆层       Beads（核心）                  │  跨 Agent / 跨会话上下文管理
├─────────────────────────────────────────────┤
│  Agent 层     7 Agent + Aggregator + Writer  │  AsyncParallelBatchNode 并行
├─────────────────────────────────────────────┤
│  LLM 层       Provider Adapter 统一抽象      │  屏蔽各提供商 SDK 差异
├─────────────────────────────────────────────┤
│  数据层       simple-git + API + SQLite      │  本地数据采集与持久化
└─────────────────────────────────────────────┘
```

### 3.2 技术选型

| 类别 | 选型 | 说明 |
|------|------|------|
| 运行时 | Node.js 20 LTS | 广泛安装基础，npx 直接运行 |
| CLI 框架 | Commander.js + Inquirer.js | 成熟命令解析与交互输入 |
| 终端 UI | Ink (React) + Blessed | 组件化 TUI，支持复杂布局 |
| Git 操作 | simple-git | Node.js Git 封装，API 友好 |
| 多智能体 | PocketFlow | 轻量 DAG 工作流，原生支持并行 Node |
| **记忆系统** | **Beads（核心）** | **Agent 上下文记忆管理，支持短期/长期/跨会话记忆** |
| LLM 接入 | 自研 Provider Adapter | 统一多提供商接口抽象层 |
| 配置存储 | YAML + keytar | 可读配置 + 系统密钥链加密 Key |
| 数据存储 | SQLite (better-sqlite3) | 本地轻量数据库，存储审查历史与 Bead 长期记忆 |
| 报告渲染 | Marked + marked-terminal | Markdown 渲染到终端/HTML |
| 代码高亮 | Shiki | VS Code 级代码高亮，支持 140+ 语言 |
| 测试框架 | Vitest + Playwright | 单元测试 + CLI 集成测试 |
| 发布 | npx + pipx + Homebrew | 三渠道覆盖全部用户群 |

---

### 3.3 PocketFlow 工作流详设

#### 3.3.1 DAG 节点类型

- **BatchNode**：对文件列表进行批量并行处理
- **AsyncParallelBatchNode**：LLM API 调用等 IO 密集型任务异步并行
- **Node**：串行执行，用于 Aggregator 和 ReportWriter

#### 3.3.2 数据流设计

- **Shared Store**：所有 Agent 共享 `shared_store`，包含仓库元数据、文件缓存、各 Agent 结果槽
- **结果隔离**：每个 Agent 写入 `shared_store.results[agent_name]`，避免并发冲突
- **错误恢复**：单 Agent 失败不影响其他 Agent，ReportWriter 标注缺失维度

#### 3.3.3 并发控制

- 默认并发：4 个 Agent 同时执行（可通过 `config.yaml` 配置 1–8）
- 速率限制：内置 LLM API 速率保护，支持指数退避重试（最多 3 次）
- Token 预算：每个 Agent 分配独立 Token 预算，防止超额消耗

---

### 3.4 Beads 记忆系统（核心）

Beads 作为 git-copilot 的**核心记忆引擎**，为所有 Agent 提供统一的上下文管理能力。区别于简单的 Prompt 拼接，Beads 将记忆内容结构化为「珠子（Bead）」单元，按优先级、时效性和相关性动态组装进每次 LLM 调用的上下文窗口，实现精准的记忆检索与 Token 高效利用。

#### 3.4.1 记忆类型

| 类型 | 生命周期 | 存储位置 | 说明 |
|------|---------|---------|------|
| **短期记忆** | 单次审查会话内 | 内存 | 当前文件内容、已发现问题列表、Agent 间共享的中间结论 |
| **长期记忆** | 跨会话持久化 | SQLite | 仓库历史审查摘要、已知技术债务、修复过的问题记录 |
| **语义记忆** | 持久化 + 向量索引 | SQLite + 本地 embedding | 代码片段、审查结论、最佳实践，支持相似性检索 |
| **工作记忆** | DAG 节点间传递 | PocketFlow shared_store | Agent 执行过程中的思维链缓存，确保多 Agent 上下文一致 |

#### 3.4.2 Bead 单元结构

```typescript
interface Bead {
  id: string;
  content: string;                   // Bead 内容（文本 / 代码片段 / 结构化 JSON）
  type: BeadType;                    // code_snippet | issue_finding | agent_conclusion
                                     // repo_context | skill_knowledge | user_preference
  priority: number;                  // 优先级 0–10，决定上下文组装顺序
  ttl: number | 'permanent';         // 存活时间（秒）或永久
  tags: string[];                    // 标签集合，用于检索过滤
  embedding?: number[];              // 向量嵌入，用于语义检索
  createdAt: Date;
  agentSource?: string;              // 来源 Agent 名称
}
```

Beads 引擎在每次 LLM 调用前，根据当前任务自动筛选最相关的 Bead 集合，确保不超出目标模型的上下文窗口限制。

#### 3.4.3 跨 Agent 记忆共享

- **SecurityAgent** 发现的高危模式 → 自动注入 PerformanceAgent 的上下文，避免重复分析
- **ArchitectureAgent** 绘制的模块依赖图 → 作为 CodeQualityAgent 的背景知识 Bead
- **GitHistoryAgent** 识别的热点文件 → 优先级提升，引导其他 Agent 重点关注
- **ReportWriterAgent** 读取所有 Agent 写入的 Conclusion Bead，自动构建报告骨架

#### 3.4.4 历史记忆与增量审查

- 每次审查结束后，核心发现自动固化为长期记忆 Bead（持久化到 SQLite）
- 下次增量审查时，Beads 引擎自动加载上次的审查结论，帮助 Agent 聚焦于「新增问题」而非重复发现
- 支持记忆版本管理：`git-copilot history` 可查看任意历史时间点的记忆快照
- 用户可手动标注「已修复」或「误报」，修正长期记忆，持续提升审查精准度

#### 3.4.5 Beads 配置项

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `beads.max_context_tokens` | `4096` | 注入 LLM 的最大记忆 Token 数 |
| `beads.long_term_retention_days` | `90` | 长期记忆保留天数 |
| `beads.embedding_model` | `nomic-embed-text`（via Ollama） | 本地 embedding 模型，无需网络 |
| `beads.cross_agent_sharing` | `true` | 是否开启跨 Agent 记忆共享 |
| `beads.semantic_search_threshold` | `0.75` | 语义检索相似度阈值 |

---

### 3.5 代码风格与工程实践

为了确保 `git-copilot` 生成的代码能够无缝集成到现有项目，并具备高可读性、可维护性、可复用性和高性能，我们对 Claude Code 的代码生成输出制定以下代码风格与工程实践规范。这些规范旨在指导 AI Agent 在代码生成过程中遵循统一标准，减少人工审查和修改成本。

#### 3.5.1 通用原则

| 原则 | 描述 | 关键考量 |
|------|------|----------|
| **可读性** | 代码应清晰易懂，逻辑明确，便于团队成员快速理解和维护。 | 统一的命名约定、适当的注释、简洁的函数和模块 |
| **可维护性** | 代码结构应模块化，易于修改、扩展和调试。 | 低耦合、高内聚、单一职责原则（SRP） |
| **可复用性** | 鼓励抽象通用组件、函数和逻辑，减少重复代码。 | 提取公共工具函数、UI 组件库、自定义 Hooks |
| **性能优先** | 关注代码执行效率，避免不必要的计算和资源消耗。 | 优化算法、减少重渲染、合理使用缓存、异步加载 |
| **安全性** | 遵循安全编码最佳实践，防范常见漏洞。 | 输入验证、输出编码、权限控制、避免硬编码敏感信息 |
| **一致性** | 保持整个代码库风格统一，减少认知负担。 | 统一的格式化工具（Prettier）、Lint 规则（ESLint） |

#### 3.5.2 具体规范

1.  **命名规范**：
    *   变量、函数、方法：`camelCase` (例如: `getUserData`, `calculateTotalPrice`)
    *   类、组件：`PascalCase` (例如: `UserProfile`, `ButtonComponent`)
    *   常量：`UPPER_SNAKE_CASE` (例如: `MAX_RETRIES`, `API_KEY`)
    *   文件/文件夹：`kebab-case` (例如: `user-profile.tsx`, `utils/data-helpers.ts`)

2.  **代码格式化**：
    *   使用 2 或 4 个空格缩进（根据项目约定）。
    *   行尾不带分号（除非必要）。
    *   单行代码长度不超过 120 字符。
    *   统一的括号风格（例如：`if () { ... }`）。
    *   通过集成 Prettier 或类似工具进行自动化格式化。

3.  **模块化与组件化**：
    *   **单一职责**：每个模块或组件只负责一个功能。
    *   **高内聚低耦合**：组件内部逻辑紧密相关，组件间依赖关系松散。
    *   **可组合性**：UI 组件应设计为可组合的，通过 Props 接收数据和行为。
    *   **无状态组件优先**：尽可能使用函数式组件和 Hooks。

4.  **性能优化实践**：
    *   **懒加载 (Lazy Loading)**：对于大型组件或路由，使用 `React.lazy` 和 `Suspense` 进行按需加载。
    *   **Memoization**：使用 `React.memo`、`useMemo`、`useCallback` 避免不必要的组件渲染和昂贵的计算。
    *   **虚拟列表 (Virtualization)**：处理大量数据列表时，使用虚拟列表库（如 `react-window`, `react-virtualized`）减少 DOM 元素。
    *   **资源优化**：图片压缩、字体按需加载、CDN 加速。
    *   **避免阻塞主线程**：对于计算密集型任务，考虑使用 Web Workers。

5.  **错误处理**：
    *   统一的错误捕获边界（Error Boundaries）。
    *   明确的错误消息和日志记录。
    *   API 调用应包含 `try-catch` 块或 Promise 链的错误处理。

6.  **测试**：
    *   鼓励编写单元测试和集成测试，确保核心逻辑和组件的稳定性。
    *   测试覆盖率应达到项目设定的最低标准。

7.  **文档**：
    *   关键函数、组件和 API 接口应提供 JSDoc 或 TypeDoc 风格的注释，清晰描述其功能、参数、返回值和使用示例。

#### 3.5.3 工具与自动化

*   **Linting**：集成 ESLint，配置 Airbnb 或 Standard 规则集，并根据项目需求进行定制。
*   **格式化**：集成 Prettier，确保代码风格一致性。
*   **类型检查**：强制使用 TypeScript，并开启严格模式 (`strict: true`)。
*   **CI/CD 集成**：在持续集成流程中加入代码风格、Linting 和测试检查，确保代码质量门禁。

---

## 4. 用户体验设计

### 4.1 首次使用流程

```
1. npx git-copilot@latest init   →  一行命令，零安装启动
2. 交互向导                      →  选择 LLM 提供商 → 输入 API Key → 确认
3. cd <your-repo>                →  进入目标 Git 仓库
4. git-copilot review            →  启动审查，实时进度面板展示
5. 审查完成                      →  终端渲染摘要，可选导出 Markdown/HTML
```

### 4.2 终端 UI 设计原则

- **色彩语义统一**：🔴 红色=高风险，🟡 黄色=中风险，🟢 绿色=通过，🔵 蓝色=信息，⚪ 灰色=跳过
- **渐进披露**：默认展示摘要，按 `e` 展开详情，避免信息过载
- **可访问性**：支持 `--no-color`，适配无色终端；`--plain` 提供纯文本替代
- **响应式布局**：自适应终端宽度（最小 80 列），小屏自动切换简洁模式
- **动画可关闭**：`--no-spinner` 禁用进度动画，适合 CI 日志输出

### 4.3 进阶交互特性

- **中断恢复**：Ctrl+C 中断后，下次运行提示是否恢复上次进度
- **实时流式输出**：每个 Agent 完成后立即显示该维度关键发现，无需等全部完成
- **历史对比**：`git-copilot history` 展示历次评分趋势折线图
- **文件过滤**：`--include` / `--exclude` glob 精确控制审查范围

---

## 5. 发布与分发策略

### 5.1 发布渠道

| 渠道 | 命令 | 适用人群 |
|------|------|---------|
| npx (npm) | `npx git-copilot@latest` | Node.js 用户首选，零安装即用 |
| npm 全局安装 | `npm install -g git-copilot` | 固定版本，离线可用 |
| pipx (PyPI) | `pipx install git-copilot` | Python 生态用户，独立虚拟环境 |
| Homebrew | `brew install git-copilot` | macOS / Linux 系统级集成 |
| Scoop (Win) | `scoop install git-copilot` | Windows 用户 |
| 二进制包 | GitHub Releases 下载 | 无 Node 环境用户（pkg 打包） |

### 5.2 安全与隐私保障

- API Key 使用系统密钥链（keytar）加密存储，不写入明文配置文件
- 代码内容仅本地处理，发送给 LLM 前支持敏感信息脱敏（正则过滤）
- 提供 `--dry-run` 模式，预览将发送的完整 Prompt 内容
- 完全离线模式：配合 Ollama 实现零网络代码审查
- **无遥测**：不收集任何用户数据或使用统计

---

## 6. 非功能性需求



| 类别 | 指标 | 要求 |
|------|------|------|
| 性能 | 启动时间 | < 800ms（不含 LLM 调用） |
| 性能 | 中等仓库全量审查（1000 文件） | < 3 分钟（GPT-4o，4 并发） |
| 性能 | 增量审查（diff < 500 行） | < 60 秒 |
| 兼容性 | Node.js 版本 | >= 18.0.0 |
| 兼容性 | 操作系统 | macOS 12+ · Ubuntu 20.04+ · Windows 10+（WSL2） |
| 可靠性 | 单 Agent 失败处理 | 不影响其他 Agent，报告标注缺失维度 |
| 可靠性 | LLM API 超时 / 限流 | 自动重试 3 次，指数退避 |
| 安全性 | API Key 存储 | 系统密钥链加密，不写磁盘明文 |
| 本地化 | 界面语言 | 中文 / English，根据 `LANG` 环境变量自动选择 |
| 扩展性 | 新增 LLM 提供商 | 实现 `LLMAdapter` 接口，配置 5 行即可接入 |
| 扩展性 | 自定义 Agent | 实现 `BaseAgent` 接口，支持社区插件发布 |
| 记忆系统 | Beads 检索延迟 | 本地语义检索 < 50ms（10万 Bead 规模） |

---

## 7. 开发里程碑

| 阶段 | 时间 | 交付物 | 关键目标 |
|------|------|--------|---------|
| **M1** | 第 1–2 周 | CLI 骨架 + 配置系统 + Git 数据采集 | `git-copilot init / config` 可用 |
| **M2** | 第 3–4 周 | LLM Adapter 层 + 基础 Agent 框架 | 支持 3 家提供商，单 Agent 审查可运行 |
| **M3** | 第 5–6 周 | PocketFlow 多 Agent 并行 + 全部 7 个 Agent | 全量审查流水线端到端可运行 |
| **M4** | 第 7 周 | ReportWriter + 报告系统（Terminal/MD/HTML）+ `frontend-design` · `theme-factory` 集成 | 完整审查报告生成与导出；HTML 报告支持 10 套主题 |
| **M5** | 第 8 周 | Git 可视化 + 进度仪表盘（`web-artifacts-builder`）+ 交互界面 | `graph / dashboard` 完整可用；React 仪表盘 Artifact 上线 |
| **M6** | 第 9 周 | Beads 记忆系统 + 领域 Skills 集成（security/performance/architecture/git）+ `docx` · `pdf` · `pptx` · `xlsx` 报告导出 | 记忆增强与全格式报告导出上线；`doc-coauthoring` · `internal-comms` 集成 |
| **M7** | 第 10 周 | 发布流水线 + npm / pipx / Homebrew 上线 | v1.0.0 正式发布，文档网站上线 |

### MVP 范围（v1.0）

- 初始化配置系统（3 家核心提供商：OpenAI / Claude / Ollama）
- 全量多智能体代码审查（7 个 Agent，4 并发）
- Beads 短期记忆 + 基础长期记忆
- Terminal Markdown 报告渲染
- Git 提交关系图（只读浏览模式）
- npx 一键安装运行

### v1.1 规划

- Beads 语义记忆 + 向量检索（nomic-embed-text）
- Claude Skills 完整集成与 `skill-creator` 驱动的知识库管理器（团队自定义安全/架构知识库）
- GitHub PR 审查工作流（含评论回写）
- HTML 报告 + 历史趋势对比图（`web-artifacts-builder` 交互 Artifact）
- Homebrew / pipx 正式发布
- 插件系统：基于 `mcp-builder` 的社区自定义 Agent MCP 服务器注册机制

---

*git-copilot · PRD v1.0 · 2025 · 数据保留本地，代码安全可控*
