const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const exifParser = require('exif-parser');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const OpenAI = require('openai');
const heicConvert = require('heic-convert');

const app = express();
app.use(cors());
app.use(express.json());

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, path, stat) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cache-Control', 'no-cache');
    }
}));

const JWT_SECRET = 'your_super_secret_key_777';

// --- 阿里云 AI 配置 (保持不变) ---
const client = new OpenAI({
    apiKey: 'sk-03f3b1cc545b4679a9944289d9653b7c',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
});

// --- 中间件 ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).send('Access Denied');
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).send('Invalid Token');
        req.user = user;
        next();
    });
};

// --- 辅助函数：AI分析 (优化版) ---
const analyzeImageWithAliyun = async (filePath) => {
    try {
        console.log('🤖 请求AI分析...');
        const imageBuffer = fs.readFileSync(filePath);
        const dataUrl = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
        const response = await client.chat.completions.create({
            model: "qwen-vl-max",
            messages: [{
                role: "user",
                content: [
                    { type: "text", text: "请识别图片内容，提取10-15个中文标签，用逗号分隔。要求：1. 包含具体物体、场景、颜色、活动等描述词；2. 如果是人物相关的，请标注人物数量（如：单人、多人）和人物特征（如：儿童、成人、老人）；3. 如果能识别具体事物请尽量具体化（如：品种、品牌、型号）；4. 必须包含一个最能概括图片内容的综合标签；5. 包含时间和季节信息（如：白天、夜晚、春天、冬天）；6. 包含图片的主要情感或氛围（如：欢乐、宁静、热闹）；7. 如果是特定场所请标明（如：家里、办公室、餐厅）。" },
                    { type: "image_url", image_url: { url: dataUrl } }
                ]
            }],
        });
        const content = response.choices[0].message.content;
        // 将AI返回的标签分类到不同的智能相册中
        const tags = content.replace(/，/g, ',').split(',').map(t => t.trim()).filter(t => t.length > 0);
        
        // 根据标签内容自动归类到相应的智能相册（除了“最近项目”）
        const albumTags = [];
        
        // 用于跟踪哪些相册已经被匹配，确保每张照片至少有一个主要分类
        const matchedAlbums = new Set();
        
        for (const tag of tags) {
            // 检查是否匹配任何智能相册的关键词（排除“最近项目”）
            for (const [albumKey, albumConfig] of Object.entries(SMART_ALBUMS)) {
                // 跳过“最近项目”相册
                if (albumKey === 'recent') continue;
                
                // 更严格的匹配逻辑：只匹配完全相同或高度相似的标签
                if (albumConfig.tagKeywords && albumConfig.tagKeywords.some(keyword => 
                    tag === keyword || 
                    (tag.includes(keyword) && keyword.length >= 2 && tag.length <= keyword.length + 2) ||
                    (keyword.includes(tag) && tag.length >= 2 && keyword.length <= tag.length + 2)
                )) {
                    // 对于动物分类，额外检查确保确实是动物相关
                    if (albumKey === 'animals') {
                        const animalIndicators = ['猫', '狗', '宠物', '动物', '鸟', '鱼', '兔子', '熊猫', '老虎', '狮子', '大象', '猴子', '仓鼠', '昆虫', '马', '牛', '羊', '猪', '鸡', '鸭', '鹅', '龟', '蛇', '蛙'];
                        if (animalIndicators.some(indicator => tag.includes(indicator))) {
                            albumTags.push(`${albumConfig.title}:${tag}`);
                            matchedAlbums.add(albumKey);
                        }
                    } else {
                        albumTags.push(`${albumConfig.title}:${tag}`);
                        matchedAlbums.add(albumKey);
                    }
                }
            }
        }
        
        // 增强人物识别逻辑 - 更严格的匹配条件
        const peopleTags = tags.filter(tag => 
            (tag.includes('人') && (tag.includes('像') || tag.includes('自拍') || tag.includes('合影') || tag.includes('肖像') || tag.includes('单人') || tag.includes('多人') || tag.includes('家庭') || tag.includes('朋友'))) ||
            tag === '人物' || tag === '人像' || tag === '自拍' || tag === '合影' || tag === '肖像' || tag === '全家福'
        );
        
        if (peopleTags.length > 0 && !matchedAlbums.has('people')) {
            albumTags.push(`人物与自拍:${peopleTags[0]}`);
            matchedAlbums.add('people');
        }
        
        // 增强风景识别逻辑 - 更严格的匹配条件
        const landscapeTags = tags.filter(tag => 
            (tag.includes('风景') || tag.includes('山水') || tag.includes('户外') || tag.includes('自然')) ||
            (tag.includes('海') || tag.includes('山') || tag.includes('天空') || tag.includes('云') || tag.includes('夕阳') || tag.includes('日出') || tag.includes('湖') || tag.includes('河') || tag.includes('森林')) ||
            tag === '海滩' || tag === '草原' || tag === '沙漠' || tag === '雪山' || tag === '瀑布' || tag === '星空' || tag === '月亮'
        );
        
        if (landscapeTags.length > 0 && !matchedAlbums.has('landscape')) {
            albumTags.push(`风景与自然:${landscapeTags[0]}`);
            matchedAlbums.add('landscape');
        }
        
        // 增强动物识别逻辑 - 更严格的匹配条件
        const animalTags = tags.filter(tag => 
            (tag.includes('猫') || tag.includes('狗') || tag.includes('宠物') || tag.includes('动物')) ||
            (tag.includes('鸟') || tag.includes('鱼') || tag.includes('兔子') || tag.includes('熊猫') || tag.includes('老虎') || tag.includes('狮子') || tag.includes('大象') || tag.includes('猴子')) ||
            tag === '仓鼠' || tag === ' reptile' || tag === '昆虫' || tag === '马' || tag === '牛' || tag === '羊' || tag === '猪' || tag === '鸡' || tag === '鸭' || tag === '鹅' || tag === '龟' || tag === '蛇' || tag === '蛙'
        );
        
        if (animalTags.length > 0 && !matchedAlbums.has('animals')) {
            albumTags.push(`宠物与动物:${animalTags[0]}`);
            matchedAlbums.add('animals');
        }
        
        // 确保每张照片都有至少一个分类
        if (albumTags.length === 0) {
            // 使用更智能的默认分类策略
            const fallbackTag = tags.length > 0 ? tags[0] : '其他';
            albumTags.push(`未分类:${fallbackTag}`);
        }
        
        return [...tags, ...albumTags];
    } catch (error) {
        console.error('AI失败:', error);
        // 即使AI失败，也要确保返回一些基本标签
        return ['未识别', '未分类:其他'];
    }
};

// --- Auth 接口 (注册/登录 保持不变) ---
const validatePasswordStrength = (password, username, email) => {
    if (password.length < 8) return '密码长度至少8位';
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
    const charTypesCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
    if (charTypesCount < 3) return '密码必须包含大写字母、小写字母、数字和特殊字符中的至少3种';
    const lowerPassword = password.toLowerCase();
    const lowerUsername = username.toLowerCase();
    const lowerEmail = email.toLowerCase();
    if (lowerPassword.includes(lowerUsername) || lowerPassword.includes(lowerEmail.split('@')[0])) {
        return '密码不能包含用户名或邮箱地址';
    }
    return null;
};

app.post('/api/register', async (req, res) => {
    const { username, email, password, confirmPassword } = req.body;
    if (!username || !email || !password || !confirmPassword) return res.status(400).send('请填写完整信息');
    if (password !== confirmPassword) return res.status(400).send('两次输入的密码不一致');
    const passwordError = validatePasswordStrength(password, username, email);
    if (passwordError) return res.status(400).send(passwordError);

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.execute('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, hashedPassword]);
        res.status(201).send('注册成功');
    } catch (err) { res.status(400).send('用户已存在'); }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (!users[0] || !(await bcrypt.compare(password, users[0].password_hash))) return res.status(400).send('账号或密码错误');
        const token = jwt.sign({ id: users[0].id, username: users[0].username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, username: users[0].username });
    } catch (err) { res.status(500).send(err.message); }
});

// --- 上传配置 ---
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            // 根据文件类型确定存储目录
            const dir = file.mimetype.startsWith('video/') ? 'uploads/videos/' : 'uploads/original/';
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        },
        filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
    })
});

// --- 上传接口 (保持不变) ---
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).send('No file');
    req.file.originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    req.setTimeout(60000);

    const originalPath = req.file.path.replace(/\\/g, '/');
    const filename = req.file.filename;
    const userId = req.user.id;
    const visibility = req.body.visibility || 'private';
    let captureTime = new Date();
    let cameraModel = 'Unknown';
    let resolution = 'Unknown';
    let gpsInfo = null; // 新增变量

    try {
        // 检查是否为视频文件
        if (req.file.mimetype.startsWith('video/')) {
            // 视频文件处理逻辑
            console.log('检测到视频文件');
            
            // 为视频生成占位缩略图
            const thumbPath = `uploads/thumbnails/thumb-${filename.split('.')[0]}.jpg`;
            if (!fs.existsSync('uploads/thumbnails/')) fs.mkdirSync('uploads/thumbnails/', { recursive: true });
            
            // 创建一个简单的视频占位图
            const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
                <rect width="300" height="200" fill="#ddd"/>
                <polygon points="120,100 120,60 180,80 180,120" fill="#666"/>
                <text x="150" y="160" font-family="Arial" font-size="20" fill="#666" text-anchor="middle">VIDEO</text>
            </svg>`;
            const placeholder = Buffer.from(svgContent);
            fs.writeFileSync(thumbPath, placeholder);
            
            // 插入数据库记录
            const [result] = await db.execute(
                `INSERT INTO images (user_id, visibility, original_filename, file_path, thumbnail_path, file_size, resolution, capture_time, camera_model) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, visibility, req.file.originalname, originalPath, thumbPath, req.file.size, '视频', captureTime, 'Unknown']
            );
            
            res.json({ message: 'Video uploaded successfully', type: 'video' });
        } else {
            // 图片文件处理逻辑（原有代码）
            let buffer = fs.readFileSync(originalPath);
            
            // 如果是HEIC格式，先转换为JPEG
            if (req.file.mimetype === 'image/heic' || req.file.mimetype === 'image/heif' || originalPath.toLowerCase().endsWith('.heic')) {
                console.log('检测到HEIC文件，正在进行转换...');
                const { buffer: jpegBuffer } = await heicConvert({
                    buffer: buffer,
                    format: 'JPEG',
                    quality: 0.9
                });
                buffer = Buffer.from(jpegBuffer);
                
                // 将转换后的JPEG保存回原文件路径
                fs.writeFileSync(originalPath, buffer);
            }
            
            try {
                const meta = await sharp(buffer).metadata();
                resolution = `${meta.width}x${meta.height}`;
            } catch (e) { console.log('分辨率读取失败'); }

            // 支持JPEG和HEIC格式的EXIF解析
            if (['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/heic', 'image/heif'].includes(req.file.mimetype)) {
                try {
                    const parser = exifParser.create(buffer);
                    const result = parser.parse();
                    const tags = result.tags;
                    
                    // --- 新增 GPS 提取逻辑 ---
                    if (tags.GPSLatitude && tags.GPSLongitude) {
                        gpsInfo = `${tags.GPSLatitude.toFixed(6)}, ${tags.GPSLongitude.toFixed(6)}`;
                    }
                    // -----------------------

                    const timestamp = tags.DateTimeOriginal || tags.DateTimeDigitized || tags.CreateDate || tags.DateTime;
                    if (timestamp) captureTime = new Date(timestamp * 1000);
                    if (tags.Model) cameraModel = tags.Model;
                } catch (e) { console.log(`EXIF 解析出错: ${e.message}`); }
            }

            const thumbPath = `uploads/thumbnails/thumb-${filename}`;
            if (!fs.existsSync('uploads/thumbnails/')) fs.mkdirSync('uploads/thumbnails/', { recursive: true });
            await sharp(originalPath).resize(300, 300, { fit: 'cover' }).toFile(thumbPath);

            const [result] = await db.execute(
                `INSERT INTO images (user_id, visibility, original_filename, file_path, thumbnail_path, file_size, resolution, capture_time, camera_model, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, visibility, req.file.originalname, originalPath, thumbPath, req.file.size, resolution, captureTime, cameraModel, gpsInfo]
            );
            const imageId = result.insertId;

            const tags = await analyzeImageWithAliyun(originalPath);
            console.log('AI分析结果:', tags);
            
            // 确保至少有一个标签被插入
            if (tags.length === 0) {
                tags.push('未分类');
            }
            
            for (const tagName of tags) {
                let [tagRows] = await db.execute('SELECT id FROM tags WHERE name = ?', [tagName]);
                let tagId = tagRows.length ? tagRows[0].id : (await db.execute('INSERT INTO tags (name, type) VALUES (?, ?)', [tagName, 'ai']))[0].insertId;
                await db.execute('INSERT IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)', [imageId, tagId]);
            }
            res.json({ message: 'Success', aiTags: tags });
        }
    } catch (error) { console.error(error); res.status(500).send('Error'); }
});

// =========================================================
// === 新增核心部分：图片处理接口 (裁剪+滤镜 -> 另存为新图) ===
// =========================================================

// 辅助函数：标准化参数
const normalizeParams = (params, metadata) => {
    let crop = null;
    if (params.crop) {
        const { x, y, width, height } = params.crop;
        const safeX = Math.max(0, Math.round(x));
        const safeY = Math.max(0, Math.round(y));
        const safeW = Math.min(metadata.width - safeX, Math.round(width));
        const safeH = Math.min(metadata.height - safeY, Math.round(height));
        if (safeW > 0 && safeH > 0) {
            crop = { left: safeX, top: safeY, width: safeW, height: safeH };
        }
    }

    const filters = {};
    if (params.filters) {
        // Brightness: Sharp modulate uses multiplier (1.0 normal). Frontend sends 0-200 (100 normal)
        if (params.filters.brightness !== 100) filters.brightness = params.filters.brightness / 100;
        // Saturation: Sharp modulate uses multiplier
        if (params.filters.saturate !== 100) filters.saturation = params.filters.saturate / 100;
        // Hue: Sharp rotate uses degrees
        if (params.filters.hue !== 0) filters.hue = Math.round(params.filters.hue);
        // Contrast: Simulate via Linear (slope, intercept)
        if (params.filters.contrast !== 100) {
            const c = params.filters.contrast / 100;
            filters.linear = { a: c, b: 128 * (1 - c) };
        }
    }
    return { crop, filters };
};

// =========================================================
// === 修复后的核心部分：图片处理接口 ===
// =========================================================

app.post('/api/images/:id/process', authenticateToken, async (req, res) => {
    const imageId = req.params.id;
    const userId = req.user.id;
    // 前端传来的数据：crop (x,y,width,height) 和 filters
    const { crop, filters } = req.body;

    try {
        // 1. 验证图片归属
        const [rows] = await db.execute('SELECT * FROM images WHERE id = ? AND user_id = ?', [imageId, userId]);
        if (!rows.length) return res.status(404).send('Image not found or permission denied');
        const originalImage = rows[0];

        // 2. 读取原图
        if (!fs.existsSync(originalImage.file_path)) {
            return res.status(404).send('Original file missing on server');
        }

        const inputBuffer = fs.readFileSync(originalImage.file_path);
        const image = sharp(inputBuffer);
        const metadata = await image.metadata();

        // 3. 构建 Sharp 处理流
        let pipeline = image;

        // --- 处理 A: 裁剪 (Crop) ---
        // 注意：前端必须传回基于原始分辨率的坐标 (getData)，而不是屏幕坐标
        if (crop && crop.width > 0 && crop.height > 0) {
            const extractParams = {
                left: Math.max(0, Math.round(crop.x)),
                top: Math.max(0, Math.round(crop.y)),
                width: Math.min(metadata.width, Math.round(crop.width)),
                height: Math.min(metadata.height, Math.round(crop.height))
            };

            // 二次校验，防止裁剪区域超出图片边界导致 crash
            if (extractParams.left + extractParams.width > metadata.width) {
                extractParams.width = metadata.width - extractParams.left;
            }
            if (extractParams.top + extractParams.height > metadata.height) {
                extractParams.height = metadata.height - extractParams.top;
            }

            pipeline = pipeline.extract(extractParams);
        }

        // --- 处理 B: 滤镜 (Filters) ---
        if (filters) {
            const modulateOptions = {};

            // 亮度 (Frontend: 0-200, Default 100 -> Sharp: 0.x - 2.x, Default 1.0)
            if (filters.brightness !== undefined && filters.brightness !== 100) {
                modulateOptions.brightness = filters.brightness / 100;
            }

            // 饱和度 (Frontend: 0-200, Default 100 -> Sharp: 0.x - 2.x, Default 1.0)
            if (filters.saturate !== undefined && filters.saturate !== 100) {
                modulateOptions.saturation = filters.saturate / 100;
            }

            // 色相 (Frontend: 0-360 -> Sharp: degrees)
            if (filters.hue !== undefined && filters.hue !== 0) {
                modulateOptions.hue = Math.round(filters.hue);
            }

            // 应用 modulate
            if (Object.keys(modulateOptions).length > 0) {
                pipeline = pipeline.modulate(modulateOptions);
            }

            // 对比度 (模拟) - 使用 linear(a, b)
            // 公式: pixel = pixel * a + b
            if (filters.contrast !== undefined && filters.contrast !== 100) {
                const c = filters.contrast / 100;
                // 这是一个简化的对比度算法
                pipeline = pipeline.linear(c, -(128 * c) + 128);
            }
        }

        // 4. 保存为新文件 (另存为)
        const ext = path.extname(originalImage.original_filename) || '.jpg';
        const newFilename = `${Date.now()}-${Math.round(Math.random() * 1E9)}-edited${ext}`;
        const newDir = 'uploads/original/'; // 确保目录存在
        if (!fs.existsSync(newDir)) fs.mkdirSync(newDir, { recursive: true });
        const newPath = path.join(newDir, newFilename).replace(/\\/g, '/');

        await pipeline.toFile(newPath);

        // 5. 生成新缩略图
        const newThumbFilename = `thumb-${newFilename}`;
        const newThumbPath = `uploads/thumbnails/${newThumbFilename}`;
        // 确保 thumbnail 目录存在
        if (!fs.existsSync('uploads/thumbnails/')) {
            fs.mkdirSync('uploads/thumbnails/', { recursive: true });
        }
        await sharp(newPath).resize(300, 300, { fit: 'cover' }).toFile(newThumbPath);

        // 6. 写入数据库
        const newMeta = await sharp(newPath).metadata();
        const newResolution = `${newMeta.width}x${newMeta.height}`;
        const newFileSize = fs.statSync(newPath).size;
        const newOriginalName = `Edited - ${originalImage.original_filename}`;

        const [result] = await db.execute(
            `INSERT INTO images (user_id, visibility, original_filename, file_path, thumbnail_path, file_size, resolution, capture_time, camera_model) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                originalImage.visibility,
                newOriginalName,
                newPath,
                newThumbPath,
                newFileSize,
                newResolution,
                originalImage.capture_time,
                originalImage.camera_model
            ]
        );
        const newImageId = result.insertId;

        // 7. 对新图片再次进行 AI 识别打标签（保持与上传一致的体验）
        try {
            const newTags = await analyzeImageWithAliyun(newPath);
            console.log('编辑后图片AI分析结果:', newTags);
            for (const tagName of newTags) {
                let [tagRows] = await db.execute('SELECT id FROM tags WHERE name = ?', [tagName]);
                let tagId = tagRows.length
                    ? tagRows[0].id
                    : (await db.execute('INSERT INTO tags (name, type) VALUES (?, ?)', [tagName, 'ai']))[0].insertId;
                await db.execute('INSERT IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)', [newImageId, tagId]);
            }
        } catch (e) {
            console.warn('为编辑后的图片打 AI 标签时出错：', e.message);
        }

        res.json({
            message: 'Processed successfully',
            newImageId,
            filePath: newPath,
            thumbnailPath: newThumbPath
        });

    } catch (error) {
        console.error('Image processing failed:', error);
        res.status(500).send('Processing failed: ' + error.message);
    }
});
// =========================================================
// === 智能相册（类似 iPhone 分类相册） ===
// =========================================================

// 预置智能相册配置
const SMART_ALBUMS = {
    recent: {
        slug: 'recent',
        title: '最近项目',
        description: '最近 30 天拍摄的照片',
        days: 30
    },
    people: {
        slug: 'people',
        title: '人物与自拍',
        description: '包含人物、人像、自拍、合影等标签的照片',
        tagKeywords: ['人', '人物', '人像', '自拍', '合影', '肖像', '个人', '集体', '单人', '多人', '家庭', '朋友', '孩子', '老人', '青年', '婴儿', '情侣', '团队', '群体', '人群', '合照', '全家福']
    },
    animals: {
        slug: 'animals',
        title: '宠物与动物',
        description: '包含猫、狗、宠物等标签的照片',
        tagKeywords: ['猫', '狗', '宠物', '动物', '鸟', '鱼', '兔子', '仓鼠', '熊猫', '老虎', '狮子', '大象', '猴子', ' reptile', '昆虫', '马', '牛', '羊', '猪', '鸡', '鸭', '鹅', '龟', '蛇', '蛙']
    },
    landscape: {
        slug: 'landscape',
        title: '风景与自然',
        description: '包含海、山、天空、夕阳等标签的照片',
        tagKeywords: ['海', '山', '天空', '云', '夕阳', '日出', '湖', '河', '森林', '草原', '沙漠', '雪山', '瀑布', '星空', '月亮', '风景', '景色', '户外', '自然', '海滩', '峡谷', '田园', '花园', '公园', '城市天际线', '建筑群']
    },
    travel: {
        slug: 'travel',
        title: '旅行足迹',
        description: '包含旅行、旅拍、景点等标签的照片',
        tagKeywords: ['旅行', '旅拍', '出游', '景点', '旅游', '度假', '酒店', '民宿', '飞机', '火车', '汽车', '游轮', '登山', '徒步', '自驾', '背包客', '自由行', '跟团游', '景区', '地标', '名胜古迹']
    },
    life: {
        slug: 'life',
        title: '生活日常',
        description: '记录日常、美食、聚会等生活片段',
        tagKeywords: ['美食', '咖啡', '聚餐', '日常', '街拍', '购物', '工作', '学习', '运动', '健身', '娱乐', '休闲', '家庭', '聚会', '庆祝', '生日', '节日', '婚礼', '派对', '读书', '写作', '绘画', '音乐', '舞蹈', '游戏']
    }
};

// 获取智能相册列表（只返回配置和每个相册的图片数量）
app.get('/api/albums', authenticateToken, async (req, res) => {
    try {
        const result = [];

        for (const key of Object.keys(SMART_ALBUMS)) {
            const cfg = SMART_ALBUMS[key];

            let sql = `SELECT COUNT(DISTINCT i.id) AS total
                       FROM images i
                       LEFT JOIN image_tags it ON i.id = it.image_id
                       LEFT JOIN tags t ON it.tag_id = t.id
                       WHERE (i.visibility = 'public' OR i.user_id = ?)`;
            const params = [req.user.id];

            if (cfg.days) {
                sql += ' AND i.capture_time >= DATE_SUB(NOW(), INTERVAL ? DAY)';
                params.push(cfg.days);
            }

            if (cfg.tagKeywords && cfg.tagKeywords.length) {
                // 改进匹配逻辑：使用LIKE操作符进行更灵活的匹配
                const likeConditions = cfg.tagKeywords.map(() => `t.name LIKE ?`).join(' OR ');
                sql += ` AND (${likeConditions})`;
                params.push(...cfg.tagKeywords.map(keyword => `%${keyword}%`));
            }

            const [rows] = await db.execute(sql, params);
            const total = rows[0]?.total || 0;

            result.push({
                slug: cfg.slug,
                title: cfg.title,
                description: cfg.description,
                total
            });
        }

        res.json(result);
    } catch (error) {
        console.error('获取智能相册失败:', error);
        res.status(500).send('Server error');
    }
});

// 获取某个智能相册下的图片列表
app.get('/api/albums/:slug', authenticateToken, async (req, res) => {
    const slug = req.params.slug;
    const cfg = SMART_ALBUMS[slug];
    const q = req.query.q;

    if (!cfg) return res.status(404).send('Album not found');

    try {
        let sql = `SELECT DISTINCT i.*, u.username as author_name 
                   FROM images i 
                   LEFT JOIN image_tags it ON i.id = it.image_id 
                   LEFT JOIN tags t ON it.tag_id = t.id 
                   LEFT JOIN users u ON i.user_id = u.id
                   WHERE (i.visibility = 'public' OR i.user_id = ?)`;
        const params = [req.user.id];

        if (cfg.days) {
            sql += ' AND i.capture_time >= DATE_SUB(NOW(), INTERVAL ? DAY)';
            params.push(cfg.days);
        }

        if (cfg.tagKeywords && cfg.tagKeywords.length) {
            // 改进匹配逻辑：使用LIKE操作符进行更灵活的匹配
            const likeConditions = cfg.tagKeywords.map(() => `t.name LIKE ?`).join(' OR ');
            sql += ` AND (${likeConditions})`;
            params.push(...cfg.tagKeywords.map(keyword => `%${keyword}%`));
        }

        if (q) {
            sql += ' AND (i.original_filename LIKE ? OR t.name LIKE ?)';
            params.push(`%${q}%`, `%${q}%`);
        }

        sql += ' ORDER BY i.capture_time DESC';

        const [rows] = await db.execute(sql, params);

        // 为每张图片补全标签
        for (let i = 0; i < rows.length; i++) {
            const [tags] = await db.execute(
                'SELECT t.name FROM tags t INNER JOIN image_tags it ON t.id = it.tag_id WHERE it.image_id = ?',
                [rows[i].id]
            );
            rows[i].tags = tags.map(tag => tag.name);
        }

        res.json(rows);
    } catch (error) {
        console.error('获取智能相册图片失败:', error);
        res.status(500).send('Server error');
    }
});

// --- 获取列表 (保持不变) ---
app.get('/api/images', authenticateToken, async (req, res) => {
    const q = req.query.q;
    let sql = `SELECT DISTINCT i.*, u.username as author_name FROM images i 
               LEFT JOIN image_tags it ON i.id = it.image_id 
               LEFT JOIN tags t ON it.tag_id = t.id 
               LEFT JOIN users u ON i.user_id = u.id
               WHERE i.visibility = 'public' OR i.user_id = ?`;
    let params = [req.user.id];
    if (q) {
        sql += ' AND (i.original_filename LIKE ? OR t.name LIKE ?)';
        params.push(`%${q}%`, `%${q}%`);
    }
    sql += ' ORDER BY i.upload_at DESC';
    try {
        const [rows] = await db.execute(sql, params);
        for (let i = 0; i < rows.length; i++) {
            const [tags] = await db.execute(
                'SELECT t.name FROM tags t INNER JOIN image_tags it ON t.id = it.tag_id WHERE it.image_id = ?',
                [rows[i].id]
            );
            rows[i].tags = tags.map(tag => tag.name);
        }
        res.json(rows);
    } catch (error) { res.status(500).send(error.message); }
});

// --- 删除接口 (保持不变) ---
app.delete('/api/images/:id', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM images WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (!rows.length) return res.status(404).send('No');
        if (fs.existsSync(rows[0].file_path)) fs.unlinkSync(rows[0].file_path);
        if (fs.existsSync(rows[0].thumbnail_path)) fs.unlinkSync(rows[0].thumbnail_path);
        await db.execute('DELETE FROM images WHERE id = ?', [req.params.id]);
        res.send('Ok');
    } catch (e) { res.status(500).send('Err'); }
});

// --- 用户资料接口 ---
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const [users] = await db.execute('SELECT id, username, email, avatar_path, created_at FROM users WHERE id = ?', [req.user.id]);
        if (!users.length) return res.status(404).send('User not found');
        res.json(users[0]);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// 头像上传接口
app.post('/api/user/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded');
    
    try {
        // 生成缩略图
        const avatarPath = `uploads/avatars/avatar-${req.user.id}${path.extname(req.file.originalname)}`;
        if (!fs.existsSync('uploads/avatars/')) fs.mkdirSync('uploads/avatars/', { recursive: true });
        
        // 调整图片大小并保存
        await sharp(req.file.path)
            .resize(200, 200, { fit: 'cover' })
            .toFile(avatarPath);
        
        // 更新数据库
        await db.execute('UPDATE users SET avatar_path = ? WHERE id = ?', [avatarPath, req.user.id]);
        
        // 删除临时文件
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        
        res.json({ success: true, avatarPath });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).send('Failed to upload avatar');
    }
});

// --- AI聊天接口（智能口语解析 + 搜图） ---
app.post('/api/chat', authenticateToken, async (req, res) => {
    const { message = '', history = [] } = req.body || {};
    const userUtterance = (message || '').trim();

    if (!userUtterance) {
        return res.json({
            text: '你可以这样问我：比如“帮我找去年去上海的照片”、“找有猫的照片”、“找一下夕阳的照片”。',
            images: []
        });
    }

    try {
        // 1. 让大模型先“听懂人话”，抽取检索意图
        const sysPrompt = `你是一个相册助手，负责把用户的自然语言请求转换成结构化的“搜索条件”。
返回严格的 JSON，格式如下（不要多任何说明文字）：
{
  "keyword": "主要关键词，比如：猫、爬山、夕阳、上海",
  "author": "如果用户提到具体的人名/作者昵称，否则为 null",
  "startDate": "YYYY-MM-DD HH:mm:ss 或 null",
  "endDate": "YYYY-MM-DD HH:mm:ss 或 null"
}
说明：
- keyword：从用户的话里提取一个最能代表内容的短关键词（汉字即可），不要整句原文，比如“猫猫照片”要提取为"猫"。
- author：如果用户明确说了“张三发的”“我老婆发的”“同事小王拍的”等，请尽量提取成作者在系统里的昵称（如果无法确定系统里具体叫什么，就保留原文作为 author）；如果用户没有提到具体人，则填 null。
- 如果用户提到年份/月份/大概时间（如“去年”“2023年国庆”“上个月”），请尽量推算出一个合理的时间范围填入 startDate / endDate；如果不好判断就填 null。
- 所有日期时间一律用本地时间，格式必须是 YYYY-MM-DD HH:mm:ss。`;

        const nl2queryMessages = [
            { role: 'system', content: sysPrompt },
            ...history.slice(-4), // 带一点历史上下文
            { role: 'user', content: userUtterance }
        ];

        const intentResp = await client.chat.completions.create({
            model: 'qwen-vl-max',
            messages: nl2queryMessages
        });

        let intentText = intentResp.choices[0]?.message?.content || '';

        // 2. 从回复里“抠”出 JSON（防御性处理，防止模型多说话）
        let keyword = '';
        let author = null;
        let startDate = null;
        let endDate = null;

        try {
            const jsonMatch = intentText.match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : intentText);
            keyword = (parsed.keyword || '').trim();
            author = parsed.author ? String(parsed.author).trim() : null;
            startDate = parsed.startDate || null;
            endDate = parsed.endDate || null;
        } catch (e) {
            // 如果解析失败，就退化为用整句当关键词
            keyword = userUtterance;
        }

        // 兜底保证 keyword 不为空字符串（否则就查全部）
        const hasKeyword = !!keyword;
        const hasAuthor = !!author;

        // 3. 按解析出的条件真正去数据库搜索
        let sql = `SELECT DISTINCT i.*, u.username as author_name 
                   FROM images i 
                   LEFT JOIN image_tags it ON i.id = it.image_id 
                   LEFT JOIN tags t ON it.tag_id = t.id 
                   LEFT JOIN users u ON i.user_id = u.id
                   WHERE (i.visibility = 'public' OR i.user_id = ?)`;
        const params = [req.user.id];

        if (hasKeyword) {
            sql += ' AND (i.original_filename LIKE ? OR t.name LIKE ?)';
            params.push(`%${keyword}%`, `%${keyword}%`);
        }

        if (hasAuthor) {
            // 按作者昵称模糊匹配
            sql += ' AND u.username LIKE ?';
            params.push(`%${author}%`);
        }

        if (startDate) {
            sql += ' AND i.capture_time >= ?';
            params.push(startDate);
        }
        if (endDate) {
            sql += ' AND i.capture_time <= ?';
            params.push(endDate);
        }

        sql += ' ORDER BY i.capture_time DESC LIMIT 20';

        const [rows] = await db.execute(sql, params);

        // 补齐标签
        for (let i = 0; i < rows.length; i++) {
            const [tags] = await db.execute(
                'SELECT t.name FROM tags t INNER JOIN image_tags it ON t.id = it.tag_id WHERE it.image_id = ?',
                [rows[i].id]
            );
            rows[i].tags = tags.map(tag => tag.name);
        }

        // 4. 给用户一段自然语言反馈
        let text;
        const condParts = [];
        if (hasKeyword) condParts.push(`内容包含“${keyword}”`);
        if (hasAuthor) condParts.push(`作者昵称包含“${author}”`);
        if (startDate && endDate) condParts.push(`时间在 ${startDate} ~ ${endDate}`);
        else if (startDate) condParts.push(`时间晚于 ${startDate}`);
        else if (endDate) condParts.push(`时间早于 ${endDate}`);

        const condDesc = condParts.length ? condParts.join('，') : '你相册里的最近照片';

        if (rows.length > 0) {
            text = `我按「${condDesc}」给你找到了 ${rows.length} 张照片，下面是结果。如果不够精确，可以再补充一下时间或内容，比如“再缩小到 2023 年国庆那几天”。`;
        } else {
            text = `我按「${condDesc}」在你的相册里没有找到结果。可以试试：换一个说法（比如“猫”改成“宠物”），或者只说地点/场景（如“海边”“夜景”）。`;
        }

        res.json({ text, images: rows });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).send('服务器错误');
    }
});

// 添加标签接口
app.post('/api/images/:id/tags', authenticateToken, async (req, res) => {
    const { tagName } = req.body;
    if (!tagName) return res.status(400).send('Tag name required');
    
    try {
        // 1. 查找或创建标签 (标记为 manual)
        let [tagRows] = await db.execute('SELECT id FROM tags WHERE name = ?', [tagName]);
        let tagId = tagRows.length 
            ? tagRows[0].id 
            : (await db.execute('INSERT INTO tags (name, type) VALUES (?, ?)', [tagName, 'manual']))[0].insertId;
        
        // 2. 关联图片
        await db.execute('INSERT IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)', [req.params.id, tagId]);
        
        res.json({ success: true, tagId, tagName });
    } catch (e) {
        res.status(500).send(e.message);
    }
});

app.listen(3000, () => console.log('🚀 后端运行在 3000 端口'));