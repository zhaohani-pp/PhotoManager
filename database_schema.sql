-- 数据库建表脚本

-- 创建数据库
CREATE DATABASE IF NOT EXISTS photo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE photo_db;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar_path VARCHAR(512),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 照片表
CREATE TABLE IF NOT EXISTS images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    visibility ENUM('private', 'public') DEFAULT 'private',
    original_filename VARCHAR(255),
    file_path VARCHAR(512) NOT NULL,
    thumbnail_path VARCHAR(512) NOT NULL,
    file_size INT,
    resolution VARCHAR(50),
    capture_time DATETIME,
    camera_model VARCHAR(255),
    location VARCHAR(255), -- 添加地理位置字段
    upload_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 标签表
CREATE TABLE IF NOT EXISTS tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type ENUM('user', 'auto', 'ai', 'manual') DEFAULT 'user' -- 添加manual类型
);

-- 照片标签关联表
CREATE TABLE IF NOT EXISTS image_tags (
    image_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (image_id, tag_id),
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);