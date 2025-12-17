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
.profile-layout {
  min-height: 100vh; background: #f1f5f9; padding: 40px 20px;
  font-family: -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
}
.content-wrapper { max-width: 960px; margin: 0 auto; }
.back-link { font-size: 14px; color: #64748b; margin-bottom: 20px; }
.back-link:hover { color: #6366f1; }

/* 左侧卡片 */
.profile-card {
  background: #fff; border-radius: 20px; overflow: hidden;
  box-shadow: 0 10px 30px -10px rgba(0,0,0,0.05); position: relative;
  text-align: center; height: 100%;
}
.card-bg {
    height: 100px; background: linear-gradient(135deg, #a5b4fc, #6366f1);
}
.card-content { padding: 0 30px 40px; margin-top: -50px; }
.avatar-section { position: relative; margin-bottom: 15px; display: inline-block; }
.avatar-ring {
    padding: 4px; background: #fff; border-radius: 50%; 
    box-shadow: 0 4px 12px rgba(0,0,0,0.1); position: relative; cursor: pointer;
}
.main-avatar { background: #e0e7ff; color: #6366f1; font-size: 36px; font-weight: 600; }
.camera-icon {
    position: absolute; bottom: 0; right: 0; background: #1e293b; color: #fff;
    width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    border: 3px solid #fff; font-size: 14px;
}

.user-name { margin: 10px 0 5px; color: #1e293b; font-size: 20px; font-weight: 700; }
.user-email { margin: 0; color: #64748b; font-size: 14px; }

.info-badges {
    display: flex; justify-content: center; align-items: center; margin-top: 30px;
    background: #f8fafc; padding: 15px; border-radius: 12px;
}
.badge-item { display: flex; flex-direction: column; width: 80px; }
.badge-item .num { font-weight: 700; color: #334155; font-size: 18px; }
.badge-item .txt { font-size: 11px; color: #94a3b8; margin-top: 4px; }
.divider { width: 1px; height: 24px; background: #e2e8f0; }

/* 右侧设置 */
.settings-card {
    background: #fff; border-radius: 20px; min-height: 400px;
    box-shadow: 0 10px 30px -10px rgba(0,0,0,0.05); padding: 30px;
}
:deep(.custom-tabs .el-tabs__nav-wrap::after) { height: 1px; background-color: #f1f5f9; }
:deep(.custom-tabs .el-tabs__item) { font-size: 15px; color: #64748b; }
:deep(.custom-tabs .el-tabs__item.is-active) { color: #6366f1; font-weight: 600; }
:deep(.custom-tabs .el-tabs__active-bar) { background-color: #6366f1; height: 3px; border-radius: 3px; }

.tab-inner { padding-top: 20px; max-width: 420px; }
.tab-title { font-size: 16px; margin-bottom: 24px; color: #1e293b; }

.minimal-form :deep(.el-form-item__label) { color: #64748b; padding-bottom: 4px; }
.minimal-form :deep(.el-input__wrapper) {
    box-shadow: none; background: #f8fafc; border: 1px solid transparent; padding: 8px 12px;
    border-radius: 8px; transition: all 0.3s;
}
.minimal-form :deep(.el-input__wrapper.is-focus) {
    background: #fff; border-color: #c7d2fe; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.alert-box {
    background: #fffbeb; border: 1px solid #fcd34d; color: #b45309;
    padding: 10px 14px; border-radius: 8px; font-size: 13px; display: flex; align-items: center; gap: 8px; margin-bottom: 20px;
}
.save-btn { width: 100%; border-radius: 8px; font-weight: 600; padding: 20px; margin-top: 10px; }