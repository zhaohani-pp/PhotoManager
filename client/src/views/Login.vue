<template>
  <div class="auth-container">
    <div class="background-animate"></div>
    
    <div class="auth-box">
      <div class="auth-header">
        <div class="logo-circle">
          <el-icon :size="28" color="#fff"><CameraFilled /></el-icon>
        </div>
        <h2>Welcome Back</h2>
        <p>登录 CloudGallery 继续你的探索</p>
      </div>

      <el-form :model="form" class="auth-form" size="large">
        <el-form-item>
          <el-input 
            v-model="form.username" 
            placeholder="用户名" 
            :prefix-icon="User" 
            class="glass-input"
          />
        </el-form-item>
        <el-form-item>
          <el-input 
            v-model="form.password" 
            type="password" 
            placeholder="密码" 
            :prefix-icon="Lock" 
            show-password
            class="glass-input"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-button type="primary" class="auth-btn" :loading="loading" @click="handleLogin">
          登 录
        </el-button>
        
        <div class="auth-footer">
          <span>新用户?</span>
          <a class="link-text" @click="$router.push('/register')">创建一个账号</a>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, Lock, CameraFilled } from '@element-plus/icons-vue';

const router = useRouter();
const loading = ref(false);
const form = reactive({ username: '', password: '' });

const handleLogin = async () => {
  if(!form.username || !form.password) return ElMessage.warning('请输入完整信息');
  loading.value = true;
  try {
    const res = await axios.post('/api/login', form);
    localStorage.setItem('token', res.data.token);
    ElMessage.success('登录成功');
    router.push('/');
  } catch (err) { ElMessage.error(err.response?.data || '登录失败'); } 
  finally { loading.value = false; }
};
</script>

<style scoped>
/* 动态背景 */
.auth-container {
  height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center;
  background: #0f172a; position: relative; overflow: hidden;
}
.background-animate {
  position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
  background: radial-gradient(circle at center, #4f46e5 0%, #0f172a 50%);
  opacity: 0.4; animation: pulse 10s infinite alternate;
}
@keyframes pulse { 0% { transform: scale(1); opacity: 0.3; } 100% { transform: scale(1.1); opacity: 0.5; } }

/* 玻璃卡片 */
.auth-box {
  width: 380px; padding: 40px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.4);
  z-index: 10;
}

.auth-header { text-align: center; margin-bottom: 30px; }
.logo-circle {
  width: 56px; height: 56px; background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 16px; display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px; box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
}
.auth-header h2 { color: #fff; font-size: 24px; margin: 0; font-weight: 600; }
.auth-header p { color: #94a3b8; font-size: 14px; margin-top: 8px; }

/* 输入框定制 - 暗色玻璃风 */
:deep(.glass-input .el-input__wrapper) {
  background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.1);
  box-shadow: none; border-radius: 12px; padding: 10px 15px;
  transition: all 0.3s;
}
:deep(.glass-input .el-input__wrapper.is-focus) {
  background: rgba(15, 23, 42, 0.9); border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}
:deep(.glass-input .el-input__inner) { color: #fff; }

.auth-btn {
  width: 100%; height: 48px; border-radius: 12px; font-size: 16px; font-weight: 600;
  background: linear-gradient(90deg, #6366f1, #8b5cf6); border: none; margin-top: 10px;
  transition: transform 0.2s;
}
.auth-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(99, 102, 241, 0.3); }

.auth-footer { margin-top: 24px; text-align: center; font-size: 14px; color: #94a3b8; }
.link-text { color: #818cf8; cursor: pointer; margin-left: 5px; font-weight: 500; transition: color 0.2s; }
.link-text:hover { color: #a5b4fc; text-decoration: underline; }
</style>