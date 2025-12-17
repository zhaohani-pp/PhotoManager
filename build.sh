#!/bin/bash

# Photo Manager 构建脚本

echo "Photo Manager 构建脚本"
echo "===================="

# 检查Docker是否安装
if ! command -v docker &> /dev/null
then
    echo "错误: 未检测到Docker，请先安装Docker"
    exit 1
fi

# 检查Docker Compose是否安装
if ! command -v docker-compose &> /dev/null
then
    echo "错误: 未检测到Docker Compose，请先安装Docker Compose"
    exit 1
fi

echo "1. 构建并启动服务..."
echo "请选择使用的镜像源："
echo "1) 国际网络（默认）"
echo "2) 国内镜像源（中国用户推荐）"
read -p "请输入选项 (1 或 2，默认为 1): " choice

if [ "$choice" == "2" ]; then
    echo "使用国内镜像源启动服务..."
    docker-compose -f docker-compose.cn.yml up -d
    echo "服务已启动，使用以下地址访问："
    echo "- 前端界面：http://192.168.1.100"
    echo "- 后端API：http://192.168.1.100:3000"
    echo "- 数据库：192.168.1.100:3306"
else
    echo "使用国际网络启动服务..."
    docker-compose up -d
    echo "服务已启动，使用以下地址访问："
    echo "- 前端界面：http://192.168.1.100"
    echo "- 后端API：http://192.168.1.100:3000"
    echo "- 数据库：192.168.1.100:3306"
fi