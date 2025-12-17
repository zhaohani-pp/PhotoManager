const mysql = require('mysql2');

// 从环境变量获取数据库配置，如果没有则使用默认值
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'zhnyjy777', // 你的密码
    database: process.env.DB_NAME || 'photo_db',
    waitForConnections: true,
    connectionLimit: 10
});

// 验证连接
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ 数据库连接失败:', err.message);
    } else {
        console.log('✅ 数据库连接成功');
        connection.release();
    }
});

module.exports = pool.promise();