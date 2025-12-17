# 阶段 1: 构建阶段
FROM node:18-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
# 构建完成后，文件会生成在 /app/dist 目录下

# 阶段 2: 运行阶段 (Nginx)
FROM nginx:stable-alpine as production-stage
# 把刚才构建好的 dist 文件夹复制到 Nginx 的默认目录
COPY --from=build-stage /app/dist /usr/share/nginx/html
# 把我们写的 Nginx 配置覆盖进去
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]