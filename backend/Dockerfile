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

# 安装所有依赖（包括 devDependencies 中的 prisma）
RUN npm ci

# 复制 Prisma schema
COPY prisma ./prisma/

# 生成 Prisma Client
RUN npx prisma generate

# 复制源代码
COPY src ./src/

# 创建 uploads 和 cached 目录
RUN mkdir -p uploads cached

# 暴露端口（Railway 会自动设置 PORT 环境变量）
EXPOSE 5000

# 启动命令（先推送数据库 schema，再启动服务）
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node src/server.js"]
