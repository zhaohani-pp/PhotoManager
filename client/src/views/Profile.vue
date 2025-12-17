<template>
  <div class="profile-layout">
    <div class="content-wrapper">
      
      <div class="page-header">
        <el-button link icon="ArrowLeft" @click="$router.push('/')" class="back-link">返回首页</el-button>
      </div>

      <el-row :gutter="24">
        <el-col :span="8" :xs="24">
          <div class="profile-card">
            <div class="card-bg"></div>
            <div class="card-content">
              <div class="avatar-section">
                <el-upload
                  action="http://10.162.15.4:3000/api/user/avatar"
                  :headers="uploadHeaders"
                  :show-file-list="false"
                  :on-success="handleAvatarSuccess"
                  name="avatar"
                >
                  <div class="avatar-ring">
                    <el-avatar 
                      :size="90" 
                      :src="userInfo.avatar_path ? `http://10.162.15.4:3000/${userInfo.avatar_path}` : ''"
                      class="main-avatar"
                    >
                      {{ userInfo.username?.charAt(0).toUpperCase() }}
                    </el-avatar>
                    <div class="camera-icon"><el-icon><Camera /></el-icon></div>
                  </div>
                </el-upload>
              </div>
              
              <h2 class="user-name">{{ userInfo.username }}</h2>
              <p class="user-email">{{ userInfo.email }}</p>
              
              <div class="info-badges">
                <div class="badge-item">
                  <span class="num">VIP</span>
                  <span class="txt">当前等级</span>
                </div>
                <div class="divider"></div>
                <div class="badge-item">
                  <span class="num">{{ getDays(userInfo.created_at) }}</span>
                  <span class="txt">加入天数</span>
                </div>
              </div>
            </div>
          </div>
        </el-col>

        <el-col :span="16" :xs="24">
          <div class="settings-card">
            <el-tabs v-model="activeTab" class="custom-tabs">
              <el-tab-pane label="基本资料" name="account">
                <div class="tab-inner">
                  <h3 class="tab-title">账号信息</h3>
                  <el-form label-position="top" size="large" class="minimal-form">
                    <el-form-item label="用户名">
                      <el-input v-model="userInfo.username" disabled prefix-icon="User">
                        <template #append><el-icon><Lock /></el-icon></template>
                      </el-input>
                    </el-form-item>
                    <el-form-item label="电子邮箱">
                      <el-input v-model="userInfo.email" disabled prefix-icon="Message" />
                    </el-form-item>
                  </el-form>
                </div>
              </el-tab-pane>

              <el-tab-pane label="安全隐私" name="security">
                <div class="tab-inner">
                  <!-- 修改密码 -->
                  <h3 class="tab-title">修改密码</h3>
                  <div class="alert-box">
                    <el-icon><WarningFilled /></el-icon>
                    <span>为了账号安全，建议使用包含字母和数字的强密码。</span>
                  </div>
                  <el-form :model="pwdForm" label-position="top" size="large" class="minimal-form">
                    <el-form-item label="当前密码">
                      <el-input v-model="pwdForm.oldPassword" type="password" show-password placeholder="验证旧密码" />
                    </el-form-item>
                    <el-form-item label="新密码">
                      <el-input v-model="pwdForm.newPassword" type="password" show-password placeholder="设置新密码" />
                    </el-form-item>
                    <div class="form-footer">
                      <el-button type="primary" color="#6366f1" @click="updatePassword" class="save-btn">保存修改</el-button>
                    </div>
                  </el-form>
                  
                  <!-- 修改邮箱 -->
                  <h3 class="tab-title" style="margin-top: 40px;">修改邮箱</h3>
                  <div class="alert-box">
                    <el-icon><WarningFilled /></el-icon>
                    <span>修改邮箱需要验证当前密码以确保账号安全。</span>
                  </div>
                  <el-form :model="emailForm" label-position="top" size="large" class="minimal-form">
                    <el-form-item label="新邮箱">
                      <el-input v-model="emailForm.newEmail" placeholder="请输入新的邮箱地址" prefix-icon="Message" />
                    </el-form-item>
                    <el-form-item label="当前密码">
                      <el-input v-model="emailForm.password" type="password" show-password placeholder="请输入当前密码以验证身份" />
                    </el-form-item>
                    <div class="form-footer">
                      <el-button type="primary" color="#6366f1" @click="updateEmail" class="save-btn">保存修改</el-button>
                    </div>
                  </el-form>
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { ArrowLeft, User, Message, Camera, WarningFilled, Lock } from '@element-plus/icons-vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const router = useRouter();
const userInfo = ref({});
const pwdForm = ref({ oldPassword: '', newPassword: '' });
const emailForm = ref({ newEmail: '', password: '' });
const activeTab = ref('account');

const uploadHeaders = computed(() => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`
}));

const fetchProfile = async () => {
    try {
        const res = await axios.get('/api/user/profile', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        userInfo.value = res.data;
    } catch (error) { ElMessage.error('加载失败'); }
};

const handleAvatarSuccess = (res) => {
    userInfo.value.avatar_path = res.avatarPath;
    ElMessage.success('头像已更新');
};

const updatePassword = async () => {
    if (!pwdForm.value.oldPassword || !pwdForm.value.newPassword) return ElMessage.warning('请填写完整');
    try {
        await axios.post('/api/user/password', pwdForm.value, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        ElMessage.success('密码修改成功');
        localStorage.removeItem('token');
        router.push('/login');
    } catch (error) { ElMessage.error('原密码错误'); }
};

const updateEmail = async () => {
    if (!emailForm.value.newEmail || !emailForm.value.password) return ElMessage.warning('请填写完整');
    
    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailForm.value.newEmail)) return ElMessage.warning('邮箱格式不正确');
    
    try {
        await axios.post('/api/user/email', emailForm.value, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        ElMessage.success('邮箱修改成功，请重新登录');
        localStorage.removeItem('token');
        router.push('/login');
    } catch (error) { 
        if (error.response?.data) {
            ElMessage.error(error.response.data);
        } else {
            ElMessage.error('邮箱修改失败');
        }
    }
};

const getDays = (dateStr) => {
    if(!dateStr) return 0;
    const diff = new Date() - new Date(dateStr);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

onMounted(fetchProfile);
</script>

<style scoped>
.profile-container {
  padding: 20px;
  background: #f1f5f9;
  min-height: 100vh;
}
.header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 30px;
  padding: 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.back-btn {
  padding: 8px 12px;
  border-radius: 8px;
  background: #f1f5f9;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}
.back-btn:hover {
  background: #e2e8f0;
}
.header-content h1 {
  margin: 0 0 4px 0;
  font-size: 24px;
  color: #1e293b;
}
.header-content p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}
.content {
  display: flex;
  gap: 24px;
}
.sidebar {
  width: 280px;
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.avatar-section {
  text-align: center;
  margin-bottom: 30px;
}
.avatar-uploader {
  display: inline-block;
}
.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #f1f5f9;
}
.avatar-uploader-icon {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: #94a3b8;
  border: 4px dashed #cbd5e1;
}
.user-info h3 {
  margin: 0 0 16px 0;
  font-size: 20px;
  color: #1e293b;
}
.info-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}
.info-item:last-child {
  border-bottom: none;
}
.info-label {
  color: #64748b;
}
.info-value {
  color: #1e293b;
  font-weight: 500;
}
.main-content {
  flex: 1;
}
.card {
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  margin-bottom: 24px;
}
.card:last-child {
  margin-bottom: 0;
}
.card h2 {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 10px;
}
.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #334155;
  font-weight: 500;
}
:deep(.el-input__wrapper) {
  border-radius: 12px;
  box-shadow: 0 0 0 1px #e2e8f0 inset;
}
:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #818cf8 inset;
}
.warning-box {
  background: #fffbeb;
  border: 1px solid #fcd34d;
  color: #b45309;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}
.save-btn {
  width: 100%;
  border-radius: 8px;
  font-weight: 600;
  padding: 20px;
  margin-top: 10px;
}
.password-strength {
  font-size: 12px;
  margin-top: 6px;
}
.password-strength.weak {
  color: #ef4444;
}
.password-strength.medium {
  color: #f59e0b;
}
.password-strength.strong {
  color: #10b981;
}
.form-footer {
  margin-top: 30px;
}
</style>