# Docker 部署文档

本文档提供这套 `chatbot` 项目的单机 Docker 部署方式，包含：

- PostgreSQL
- Redis
- RustFS
- 应用自身启动

默认假设：

- 服务器系统为 Linux
- 已安装 Docker 与 Docker Compose Plugin
- 项目目录为 `/opt/chatbot`
- 应用、PostgreSQL、Redis、RustFS 部署在同一台机器

## 1. 准备目录

```bash
sudo mkdir -p /opt/chatbot
sudo chown -R "$USER":"$USER" /opt/chatbot
cd /opt/chatbot
```

把项目代码放到该目录后，创建 Docker 网络：

```bash
docker network create chatbot-net
```

## 2. 部署 PostgreSQL

启动 PostgreSQL 16：

```bash
docker run -d \
  --name chatbot-postgres \
  --restart unless-stopped \
  --network chatbot-net \
  -e POSTGRES_DB=chatbot \
  -e POSTGRES_USER=chatbot \
  -e POSTGRES_PASSWORD=c74c628e36e4555e6508a8f42ba43815 \
  -p 5432:5432 \
  -v chatbot-postgres-data:/var/lib/postgresql/data \
  postgres:16
```

检查状态：

```bash
docker ps --filter name=chatbot-postgres
docker logs --tail 50 chatbot-postgres
```

应用里对应的连接串示例：

```bash
POSTGRES_URL=postgres://chatbot:change-this-postgres-password@127.0.0.1:5432/chatbot
```

如果应用也运行在 Docker 容器中，并加入 `chatbot-net`，则也可以使用：

```bash
POSTGRES_URL=postgres://chatbot:change-this-postgres-password@chatbot-postgres:5432/chatbot
```

## 3. 部署 Redis

启动 Redis 7：

```bash
docker run -d \
  --name chatbot-redis \
  --restart unless-stopped \
  --network chatbot-net \
  -p 6379:6379 \
  -v chatbot-redis-data:/data \
  redis:7 redis-server --appendonly yes
```

检查状态：

```bash
docker ps --filter name=chatbot-redis
docker logs --tail 50 chatbot-redis
```

应用里对应的连接串示例：

```bash
REDIS_URL=redis://127.0.0.1:6379
```

如果应用也运行在 Docker 容器中，并加入 `chatbot-net`，则也可以使用：

```bash
REDIS_URL=redis://chatbot-redis:6379
```

## 4. 部署 RustFS

项目已经内置了 RustFS 的最小单机部署文件：[docker-compose.rustfs.yml](/Volumes/T9/chatbot/docker-compose.rustfs.yml:1)。

先准备 S3 访问凭据：

```bash
export RUSTFS_S3_ACCESS_KEY=rustfsadmin
export RUSTFS_S3_SECRET_KEY=rustfssecret
```

启动 RustFS：

```bash
docker compose -f docker-compose.rustfs.yml up -d
```

检查状态：

```bash
docker compose -f docker-compose.rustfs.yml ps
docker compose -f docker-compose.rustfs.yml logs --tail 50
```

初始化 bucket：

```bash
pnpm install
pnpm storage:init
```

RustFS 默认会启动这些端口：

- `9000`：S3 API
- `9001`：管理控制台

应用里对应的环境变量示例：

```bash
RUSTFS_S3_ENDPOINT=http://127.0.0.1:9000
RUSTFS_S3_REGION=us-east-1
RUSTFS_S3_ACCESS_KEY=rustfsadmin
RUSTFS_S3_SECRET_KEY=change-this-rustfs-secret
RUSTFS_S3_BUCKET=chatbot-uploads
RUSTFS_PUBLIC_BASE_URL=http://127.0.0.1:9000
RUSTFS_S3_FORCE_PATH_STYLE=true
RUSTFS_S3_PUBLIC_READ_POLICY=true
```

如果应用也运行在 Docker 容器中，并加入 `chatbot-net`，建议改为：

```bash
RUSTFS_S3_ENDPOINT=http://rustfs:9000
RUSTFS_PUBLIC_BASE_URL=http://rustfs:9000
```

注意：

- `RUSTFS_PUBLIC_BASE_URL` 必须指向浏览器可访问的 path-style 地址，上传后的图片会拼成 `/{bucket}/{key}`。
- 初始化脚本默认会为 bucket 写入公共读策略，方便聊天图片直接渲染；如果你打算走私有桶或反向代理鉴权，可以把 `RUSTFS_S3_PUBLIC_READ_POLICY=false`。
- 如果你后面会接 Nginx 或 CDN，建议把 `RUSTFS_PUBLIC_BASE_URL` 改成最终对外访问的域名，例如 `https://files.example.com`。

## 5. 配置应用环境变量

在项目根目录创建 `.env.local`：

```bash
cp .env.example .env.local
```

生成 `AUTH_SECRET`：

```bash
openssl rand -base64 32
```

最小可运行示例：

```bash
AUTH_SECRET=replace-with-generated-secret

OPENAI_COMPATIBLE_BASE_URL=https://your-openai-compatible-endpoint/v1
OPENAI_COMPATIBLE_API_KEY=replace-with-your-api-key
OPENAI_COMPATIBLE_PROVIDER_NAME=openai
OPENAI_COMPATIBLE_MODEL_IDS=gpt-4o-mini
OPENAI_COMPATIBLE_DEFAULT_MODEL=gpt-4o-mini
OPENAI_COMPATIBLE_TITLE_MODEL=gpt-4o-mini

RUSTFS_S3_ENDPOINT=http://127.0.0.1:9000
RUSTFS_S3_REGION=us-east-1
RUSTFS_S3_ACCESS_KEY=rustfsadmin
RUSTFS_S3_SECRET_KEY=change-this-rustfs-secret
RUSTFS_S3_BUCKET=chatbot-uploads
RUSTFS_PUBLIC_BASE_URL=http://127.0.0.1:9000
RUSTFS_S3_FORCE_PATH_STYLE=true
RUSTFS_S3_PUBLIC_READ_POLICY=true

POSTGRES_URL=postgres://chatbot:change-this-postgres-password@127.0.0.1:5432/chatbot
REDIS_URL=redis://127.0.0.1:6379
```

## 6. 启动应用

安装依赖：

```bash
pnpm install
```

执行数据库迁移：

```bash
pnpm db:migrate
```

开发模式启动：

```bash
pnpm dev
```

生产构建与启动：

```bash
pnpm build
pnpm start
```

## 7. 推荐启动顺序

推荐按下面顺序执行：

```bash
docker network create chatbot-net

docker run -d \
  --name chatbot-postgres \
  --restart unless-stopped \
  --network chatbot-net \
  -e POSTGRES_DB=chatbot \
  -e POSTGRES_USER=chatbot \
  -e POSTGRES_PASSWORD=c74c628e36e4555e6508a8f42ba43815 \
  -p 5432:5432 \
  -v chatbot-postgres-data:/var/lib/postgresql/data \
  postgres:16

docker run -d \
  --name chatbot-redis \
  --restart unless-stopped \
  --network chatbot-net \
  -p 6379:6379 \
  -v chatbot-redis-data:/data \
  redis:7 redis-server --appendonly yes

export RUSTFS_S3_ACCESS_KEY=rustfsadmin
export RUSTFS_S3_SECRET_KEY=20f986d22e0151871acf4c32ba1ad25d
docker compose -f docker-compose.rustfs.yml up -d

pnpm install
pnpm storage:init
pnpm db:migrate
pnpm build
pnpm start
```

## 8. 常用维护命令

查看容器：

```bash
docker ps
docker compose -f docker-compose.rustfs.yml ps
```

查看日志：

```bash
docker logs -f chatbot-postgres
docker logs -f chatbot-redis
docker compose -f docker-compose.rustfs.yml logs -f
```

停止服务：

```bash
docker stop chatbot-postgres chatbot-redis
docker compose -f docker-compose.rustfs.yml down
```

仅删除 RustFS 容器但保留数据卷：

```bash
docker compose -f docker-compose.rustfs.yml down
```

删除 PostgreSQL / Redis 容器但保留数据卷：

```bash
docker rm -f chatbot-postgres chatbot-redis
```
