const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');

// 注册路由
router.post('/register', authController.register);

// 登录路由
router.post('/login', authController.login);

module.exports = router;