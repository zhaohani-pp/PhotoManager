# Photo Manager

一个功能完整的照片管理系统，具有用户认证、图片上传、AI标签、智能相册等功能。

## 功能特性

1. **用户注册、登录功能**
   - 用户名和邮箱唯一性校验
   - 密码强度验证
   - JWT Token身份验证

2. **照片上传和管理**
   - 支持PC和手机浏览器上传
   - 支持JPG/PNG/HEIC图片和MP4/MOV/AVI视频
   - EXIF信息自动提取
   - 自动生成缩略图

3. **智能标签和分类**
   - AI模型自动生成标签
   - 智能相册分类（人物、动物、风景等）
   - 自定义标签功能

4. **图片编辑功能**
   - 裁剪、亮度、对比度、饱和度、色相调整
   - 编辑后生成新图片，不覆盖原图

5. **响应式设计**
   - 适配手机浏览器和微信内置浏览器

## 使用Docker运行

### 环境要求

- Docker
- Docker Compose

### 启动服务

```bash
# 克隆项目
git clone <repository-url>
cd PhotoManager

# 启动所有服务（国际网络）
docker-compose up -d

# 或者使用国内镜像源（中国用户推荐）
docker-compose -f docker-compose.cn.yml up -d
```

服务启动后，可以通过以下地址访问：

- 前端界面：http://10.162.15.4:5184
- 后端API：http://10.162.15.4:3000
- 数据库：10.162.15.4:3306

### 停止服务

```bash
# 停止国际网络版本
docker-compose down

# 停止国内镜像源版本
docker-compose -f docker-compose.cn.yml down
```

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs server
```

## 开发环境运行

### 后端服务

```bash
cd server
npm install
node index.js
```

### 前端服务

```bash
cd client
npm install
npm run dev
```

## 数据库配置

项目使用MySQL数据库，数据库结构定义在 `database_schema.sql` 文件中。

## 技术栈

- **前端**：Vue 3 + Element Plus + Vite
- **后端**：Node.js + Express
- **数据库**：MySQL
- **AI服务**：阿里云Qwen-VL大模型
- **图像处理**：Sharp + Cropper.js