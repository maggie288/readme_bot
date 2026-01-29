# Backend Dockerfile
FROM node:20-alpine

# 安装 canvas 和 sharp 所需的原生依赖
RUN apk add --no-cache \
    build-base \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    python3

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制 Prisma schema
COPY prisma ./prisma/

# 生成 Prisma Client
RUN npx prisma generate

# 复制源代码
COPY src ./src/

# 创建 uploads 目录
RUN mkdir -p uploads

# 暴露端口
EXPOSE 3001

# 启动命令（先运行数据库迁移，再启动服务）
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
