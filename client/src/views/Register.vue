<template>
  <div class="auth-container">
    <div class="background-animate emerald"></div>
    
    <div class="auth-box">
      <div class="auth-header">
        <div class="logo-circle emerald-bg">
          <el-icon :size="28" color="#fff"><UserFilled /></el-icon>
        </div>
        <h2>Create Account</h2>
        <p>加入 CloudGallery，开启智能相册之旅</p>
      </div>

      <el-form :model="form" class="auth-form" size="large">
        <el-form-item>
          <el-input v-model="form.username" placeholder="设置用户名" :prefix-icon="User" class="glass-input" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.email" placeholder="电子邮箱" :prefix-icon="Message" class="glass-input" />
        </el-form-item>
        <el-form-item>
          <el-input 
            v-model="form.password" 
            type="password" 
            placeholder="密码 (至少8位，包含大写字母、小写字母、数字和特殊字符中的至少3种)" 
            :prefix-icon="Lock" 
            show-password 
            class="glass-input" 
            @input="checkPasswordStrength"
          />
          <div v-if="passwordStrength.level > 0" class="password-strength" :class="passwordStrength.class">
            {{ passwordStrength.text }}
          </div>
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.confirmPassword" type="password" placeholder="确认密码" :prefix-icon="Select" show-password class="glass-input" />
        </el-form-item>
        
        <el-button type="success" class="auth-btn emerald-btn" :loading="loading" @click="handleRegister">
          立即注册
        </el-button>
        
        <div class="auth-footer">
          <span>已有账号？</span>
          <a class="link-text" @click="$router.push('/login')">直接登录</a>
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
import { User, Lock, Message, UserFilled, Select } from '@element-plus/icons-vue';

const router = useRouter();
const loading = ref(false);
const form = reactive({ username: '', email: '', password: '', confirmPassword: '' });
const passwordStrength = ref({ level: 0, text: '', class: '' });

// 密码强度检查函数
const checkPasswordStrength = (password) => {
  if (!password) {
    passwordStrength.value = { level: 0, text: '', class: '' };
    return;
  }
  
  // 长度检查
  if (password.length < 8) {
    passwordStrength.value = { level: 1, text: '密码长度不足', class: 'weak' };
    return;
  }
  
  // 字符类型检查
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  
  const charTypesCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
  
  if (charTypesCount >= 3) {
    passwordStrength.value = { level: 3, text: '密码强度强', class: 'strong' };
  } else if (charTypesCount >= 2) {
    passwordStrength.value = { level: 2, text: '密码强度中等', class: 'medium' };
  } else {
    passwordStrength.value = { level: 1, text: '密码强度弱', class: 'weak' };
  }
};

const handleRegister = async () => {
  if(!form.username || !form.email || !form.password || !form.confirmPassword) return ElMessage.warning('请填写完整');
  if (form.password !== form.confirmPassword) return ElMessage.error('两次密码不一致');
  
  loading.value = true;
  try {
    await axios.post('/api/register', {
        username: form.username, email: form.email, password: form.password, confirmPassword: form.confirmPassword
    });
    ElMessage.success('注册成功，请登录');
    router.push('/login');
  } catch (err) { ElMessage.error(err.response?.data || '注册失败'); } 
  finally { loading.value = false; }
};
</script>

<style scoped>
/* 复用 Login 的基础样式，微调颜色 */
.auth-container {
  height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center;
  background: #064e3b; position: relative; overflow: hidden; /* 深绿色背景 */
}
.background-animate.emerald {
  background: radial-gradient(circle at center, #10b981 0%, #064e3b 60%);
}

.auth-box {
  width: 380px; padding: 40px;
  background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; 
  box-shadow: 0 20px 40px rgba(0,0,0,0.4); z-index: 10;
}

.auth-header { text-align: center; margin-bottom: 30px; }
.logo-circle.emerald-bg {
  width: 56px; height: 56px; background: linear-gradient(135deg, #10b981, #059669);
  border-radius: 16px; display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px; box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3);
}
.auth-header h2 { color: #fff; font-size: 24px; margin: 0; font-weight: 600; }
.auth-header p { color: #a7f3d0; font-size: 14px; margin-top: 8px; }

:deep(.glass-input .el-input__wrapper) {
  background: rgba(6, 78, 59, 0.6); border: 1px solid rgba(255,255,255,0.1);
  box-shadow: none; border-radius: 12px; padding: 10px 15px; transition: all 0.3s;
}
:deep(.glass-input .el-input__wrapper.is-focus) {
  background: rgba(6, 78, 59, 0.9); border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}
:deep(.glass-input .el-input__inner) { color: #fff; }

.auth-btn.emerald-btn {
  width: 100%; height: 48px; border-radius: 12px; font-size: 16px; font-weight: 600;
  background: linear-gradient(90deg, #10b981, #059669); border: none; margin-top: 10px;
}
.auth-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3); }

.auth-footer { margin-top: 24px; text-align: center; font-size: 14px; color: #a7f3d0; }
.link-text { color: #34d399; cursor: pointer; margin-left: 5px; font-weight: 500; }
.link-text:hover { color: #6ee7b7; text-decoration: underline; }

/* 密码强度指示器 */
.password-strength {
  margin-top: 8px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
}

.password-strength.weak {
  background-color: rgba(239, 68, 68, 0.2);
  color: #fecaca;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.password-strength.medium {
  background-color: rgba(245, 158, 11, 0.2);
  color: #fde68a;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.password-strength.strong {
  background-color: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.3);
}
</style>