# Docker 使用指南

## 🐳 Docker 快速开始

### 构建镜像

```bash
# 构建所有镜像（生产 + 开发 + 测试）
docker-compose build

# 或只构建生产镜像
docker build -t git-copilot:latest .
```

### 运行

#### 初始化配置

```bash
# 交互式配置（需要终端交互）
docker-compose run --rm git-copilot init

# 或使用 docker run（挂载配置目录）
docker run --rm -it \
  -v $(pwd):/workspace \
  -v ~/.git-copilot:/root/.git-copilot \
  git-copilot:latest init
```

#### 运行审查

```bash
# 使用 docker-compose（挂载当前目录）
docker-compose run --rm git-copilot review

# 或直接使用 docker run
docker run --rm -it \
  -v $(pwd):/workspace \
  -v ~/.git-copilot:/root/.git-copilot \
  git-copilot:latest review
```

#### 查看帮助

```bash
docker-compose run --rm git-copilot --help
```

## 📁 卷挂载说明

| 挂载路径 | 说明 |
|---------|------|
| `$(pwd):/workspace` | 当前项目目录（只读或读写） |
| `~/.git-copilot:/root/.git-copilot` | 配置和数据持久化（必须） |
| `~/.gitconfig:/root/.gitconfig:ro` | Git 配置（可选） |

## 🛠️ 开发模式

```bash
# 启动开发容器（带热重载）
docker-compose up git-copilot-dev

# 在内部运行命令
docker-compose exec git-copilot-dev bun run build
```

## 🔧 故障排除

### 权限问题

如果遇到 keytar 或 Git 权限问题：

```bash
# 以 root 用户运行（生产镜像默认）
docker run --rm -it --user 0:0 ...
```

### Git 配置

需要在容器内配置 Git（首次使用）：

```bash
docker-compose run --rm git-copilot git config --global user.email "you@example.com"
docker-compose run --rm git-copilot git config --global user.name "Your Name"
```

### 构建失败

如果构建失败，确保 Docker 已安装 buildx：

```bash
docker buildx install
```

## 🎯 典型使用流程

```bash
# 1. 构建镜像
docker-compose build

# 2. 初始化（在项目目录中）
docker-compose run --rm git-copilot init

# 3. 运行审查
docker-compose run --rm git-copilot review

# 4. 导出报告
docker-compose run --rm git-copilot export --format html
```

## 📝 注意事项

1. **API Key 安全**：API Key 存储在宿主机的 `~/.git-copilot/` 目录中，不会进入镜像
2. **配置文件**：首次运行 `init` 会在挂载的目录中生成 `config.yaml`
3. **权限**：开发模式使用 root，生产模式使用非 root 用户
4. **网络**：确保容器能访问 LLM API（OpenAI/Anthropic等），或配置 Ollama 本地地址
