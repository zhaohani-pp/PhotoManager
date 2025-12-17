const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'zhnyjy777', // 你的密码
    database: 'photo_db',
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