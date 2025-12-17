<template>
  <div class="app-wrapper">
    <nav class="navbar">
      <div class="nav-content">
        <div class="brand" @click="fetchImages">
          <div class="brand-logo">
            <el-icon :size="24"><CameraFilled /></el-icon>
          </div>
          <span class="brand-text">CloudGallery</span>
        </div>
        
        <div class="search-container">
          <el-input 
            v-model="searchText" 
            placeholder="Search memories..." 
            prefix-icon="Search"
            class="mac-search"
            @keyup.enter="fetchImages"
            clearable
            @clear="fetchImages"
          />
        </div>

        <div class="user-actions">
          <el-dropdown trigger="click" @command="handleCommand" popper-class="custom-dropdown-popper">
            <div class="user-pill">
              <el-avatar 
                :size="32" 
                :src="userInfo.avatar_path ? `http://10.162.15.4:3000/${userInfo.avatar_path}` : ''"
                class="nav-avatar"
              >
                 {{ userInfo.username?.charAt(0).toUpperCase() }}
              </el-avatar>
              <span class="username">{{ userInfo.username }}</span>
              <el-icon class="caret-icon"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile" icon="User">个人中心</el-dropdown-item>
                <el-dropdown-item divided command="logout" icon="SwitchButton" class="danger-item">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </nav>
    
    <main class="main-container">
      <div class="hero-section">
        <div class="profile-hero">
          <div class="profile-main">
            <el-avatar 
              :size="56" 
              :src="userInfo.avatar_path ? `http://10.162.15.4:3000/${userInfo.avatar_path}` : ''"
              class="profile-avatar"
            >
              {{ userInfo.username?.charAt(0).toUpperCase() }}
            </el-avatar>
            <div class="profile-texts">
              <div class="hello">嗨，{{ userInfo.username || '朋友' }}</div>
              <div class="subtitle">这里是你的个人相册，已经收藏了 {{ images.length }} 个瞬间</div>
            </div>
          </div>
          <div class="profile-meta">
            <div class="meta-line">
              <span class="meta-label">今日</span>
              <span class="meta-value">{{ todayText }}</span>
            </div>
            <div class="meta-line" v-if="userInfo.created_at">
              <span class="meta-label">已陪你</span>
              <span class="meta-value">{{ accountDays }} 天</span>
            </div>
          </div>
        </div>

        <div class="upload-controls">
          <el-radio-group v-model="uploadVisibility" size="small" class="visibility-toggle">
            <el-radio-button label="private">私密</el-radio-button>
            <el-radio-button label="public">公开</el-radio-button>
          </el-radio-group>
        </div>
        <el-upload
          class="upload-widget"
          drag
          action="http://10.162.15.4:3000/api/upload"
          :headers="uploadHeaders" 
          :show-file-list="false"
          :on-success="handleSuccess"
          :on-error="handleError"
          :data="{ visibility: uploadVisibility }"
          :accept="'.jpg,.jpeg,.png,.heic,.mp4,.mov,.avi,.wmv'"
          multiple
        >
          <div class="upload-inner">
            <div class="icon-circle">
              <el-icon><UploadFilled /></el-icon>
            </div>
            <div class="text-group">
              <h3>上传照片和视频</h3>
              <p>支持 JPG/PNG/HEIC 和 MP4/MOV/AVI 等格式</p>
              <p class="visibility-hint">当前设置: {{ uploadVisibility === 'public' ? '公开' : '私密' }}</p>
            </div>
          </div>
        </el-upload>
      </div>

      <div class="album-tabs-wrapper">
        <el-tabs v-model="activeAlbum" @tab-change="handleAlbumChange" class="album-tabs">
          <el-tab-pane label="全部照片" name="all" />
          <el-tab-pane 
            v-for="album in albums" 
            :key="album.slug" 
            :name="album.slug"
            :label="`${album.title} (${album.total})`"
          />
        </el-tabs>
      </div>

      <div class="gallery-toolbar">
        <div class="left">
            <h2 class="section-title">
              {{ activeAlbum === 'all' ? '我的照片' : (albums.find(a => a.slug === activeAlbum)?.title || '智能相册') }}
            </h2>
            <span class="badge">{{ images.length }} 张</span>
        </div>
        <el-button circle icon="Refresh" @click="fetchImages" class="glass-btn" />
      </div>

      <div class="gallery-grid" v-loading="loading">
        <div v-for="(img, index) in images" :key="img.id" class="pin-card" @click="showDetail(img)">
          <div class="pin-image-wrapper">
             <div v-if="isVideoFile(img.original_filename)" class="video-thumbnail-container">
                <el-image 
                  class="pin-image"
                  :src="`http://10.162.15.4:3000/${img.thumbnail_path}?t=${img.updatedKey || ''}`" 
                  fit="cover" 
                  lazy
                />
                <div class="video-overlay">
                  <el-icon class="play-icon"><VideoPlay /></el-icon>
                </div>
             </div>
             <el-image v-else
                class="pin-image"
                :src="`http://10.162.15.4:3000/${img.thumbnail_path}?t=${img.updatedKey || ''}`" 
                fit="cover" 
                lazy
              />
              <div class="pin-overlay">
                <div class="pin-actions">
                    <button v-if="!isVideoFile(img.original_filename)" class="action-btn" @click.stop="openEditor(img)" title="编辑"><el-icon><Edit /></el-icon></button>
                    <button class="action-btn" @click.stop="copyLink(img.file_path)" title="复制链接"><el-icon><CopyDocument /></el-icon></button>
                    <el-popconfirm title="确定删除?" @confirm="deleteImage(img.id)" width="180">
                        <template #reference>
                            <button class="action-btn delete" @click.stop><el-icon><Delete /></el-icon></button>
                        </template>
                    </el-popconfirm>
                </div>
              </div>
          </div>
          <div class="pin-info">
             <div class="pin-title">{{ img.original_filename }}</div>
             <div class="pin-meta">{{ formatDate(img.capture_time) }}</div>
             <div class="pin-author" v-if="img.visibility === 'public'">by {{ img.author_name }}</div>
          </div>
        </div>
      </div>
      
      <el-empty v-if="images.length === 0 && !loading" description="暂无照片，记录当下的美好吧" :image-size="200" />
    </main>

    <el-backtop :right="40" :bottom="40" class="custom-backtop" />

    <el-dialog v-model="detailVisible" :title="isVideoFile(selectedImage?.original_filename) ? '视频详情' : '照片详情'" width="500px" align-center class="glass-dialog">
      <div v-if="selectedImage" class="detail-content">
          <div class="detail-preview">
              <video v-if="isVideoFile(selectedImage.original_filename)" controls class="detail-video">
                  <source :src="`http://10.162.15.4:3000/${selectedImage.file_path}`" type="video/mp4">
                  您的浏览器不支持视频播放。
              </video>
              <img v-else :src="`http://10.162.15.4:3000/${selectedImage.thumbnail_path}?t=${selectedImage.updatedKey || ''}`" />
          </div>
          <div class="detail-grid">
              <div class="d-item full">
                  <label>AI 识别</label>
                  <div class="tags">
                      <el-tag v-for="tag in selectedImage.tags" :key="tag" type="primary" effect="light" size="small" round>{{ tag }}</el-tag>
                      
                      <!-- 添加手动标签功能 -->
                      <el-input
                          v-if="inputVisible"
                          v-model="inputValue"
                          ref="InputRef"
                          size="small"
                          style="width: 70px"
                          @keyup.enter="handleInputConfirm"
                          @blur="handleInputConfirm"
                      />
                      <el-button v-else size="small" @click="showInput">+ New Tag</el-button>
                      
                      <span v-if="!selectedImage.tags?.length" class="no-data">无标签</span>
                  </div>
              </div>
              <div class="d-item">
                  <label>文件名</label>
                  <span>{{ selectedImage.original_filename }}</span>
              </div>
                 <div class="d-item">
                    <label>拍摄时间</label>
                    <span>{{ formatDate(selectedImage.capture_time, true) }}</span>
                </div>
                <div class="d-item">
                    <label>分辨率</label>
                    <span>{{ selectedImage.resolution }}</span>
                </div>
                 <div class="d-item">
                    <label>大小</label>
                    <span>{{ formatFileSize(selectedImage.file_size) }}</span>
                </div>
                <div class="d-item">
                    <label>可见性</label>
                    <span>
                        <el-tag :type="selectedImage.visibility === 'public' ? 'success' : 'info'" size="small">
                            {{ selectedImage.visibility === 'public' ? '公开' : '私密' }}
                        </el-tag>
                    </span>
                </div>
                <div class="d-item">
                   <label>操作</label>
                   <span>
                        <el-button 
                            v-if="selectedImage.user_id === userInfo.id"
                            type="primary" 
                            link 
                            size="small" 
                            @click="openEditor(selectedImage)"
                        >
                            编辑图片
                        </el-button>
                   </span>
                </div>
            </div>
        </div>
    </el-dialog>

    <el-dialog 
      v-model="editorVisible" 
      title="编辑图片" 
      fullscreen
      class="editor-dialog"
      :close-on-click-modal="false"
      destroy-on-close
      @opened="handleEditorOpened"
      @closed="cleanupEditor"
    >
      <div class="editor-layout" v-loading="saving">
        <div class="editor-main">
          <div class="img-container">
             <img ref="editorImageRef" class="source-img" />
          </div>
        </div>
        
        <div class="editor-sidebar">
          <div class="sidebar-content-scroll">
              <div class="sidebar-header">
                <div class="info">
                  <h3>参数调整</h3>
                  <p class="sub">
                    {{ currentEditingImage?.original_filename }} 
                    <span v-if="currentEditingImage?.resolution">（{{ currentEditingImage.resolution }}）</span>
                  </p>
                </div>
                <el-button link type="primary" @click="resetFilters" size="small">重置参数</el-button>
              </div>

              <div class="preset-row">
                <span class="preset-label">一键风格</span>
                <div class="preset-buttons">
                  <el-tag size="small" effect="plain" round @click="applyPreset('original')">原图</el-tag>
                  <el-tag size="small" effect="plain" round @click="applyPreset('warm')">暖色</el-tag>
                  <el-tag size="small" effect="plain" round @click="applyPreset('cool')">冷色</el-tag>
                  <el-tag size="small" effect="plain" round @click="applyPreset('bw')">黑白</el-tag>
                </div>
              </div>
              
              <div class="control-group">
                <span class="label"><span>亮度</span> <span>{{ filters.brightness }}%</span></span>
                <el-slider v-model="filters.brightness" :min="50" :max="150" size="small" @input="updateFilterPreview" />
              </div>
              
              <div class="control-group">
                <span class="label"><span>对比度</span> <span>{{ filters.contrast }}%</span></span>
                <el-slider v-model="filters.contrast" :min="50" :max="150" size="small" @input="updateFilterPreview" />
              </div>
              
              <div class="control-group">
                <span class="label"><span>饱和度</span> <span>{{ filters.saturate }}%</span></span>
                <el-slider v-model="filters.saturate" :min="0" :max="200" size="small" @input="updateFilterPreview" />
              </div>

              <div class="control-group">
                <span class="label"><span>色相</span> <span>{{ filters.hue }}°</span></span>
                <el-slider v-model="filters.hue" :min="-180" :max="180" size="small" @input="updateFilterPreview" />
              </div>
          </div>

          <div class="editor-actions">
            <div class="hint">将生成新照片，不覆盖原图。</div>
            <div class="btns">
              <el-button @click="closeEditor">取消</el-button>
              <el-button type="primary" @click="saveEditedImage" :loading="saving">保存新照片</el-button>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
    
    <!-- 添加图片查看器用于轮播功能 -->
    <el-image-viewer
      v-if="viewerVisible"
      :url-list="previewList" 
      :initial-index="previewIndex"
      @close="viewerVisible = false"
    />
    
    <ChatWidget />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick, watch, toRaw } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElInput } from 'element-plus';
import { 
    Search, Delete, UploadFilled, CopyDocument, 
    CameraFilled, ArrowDown, User, SwitchButton, Refresh, Edit, RefreshLeft, VideoPlay 
} from '@element-plus/icons-vue';
import axios from 'axios';
import Cropper from 'cropperjs';
import ChatWidget from '../components/ChatWidget.vue';

const router = useRouter();
const images = ref([]);
const loading = ref(false);
const searchText = ref('');
const albums = ref([]);
const activeAlbum = ref('all');
const userInfo = ref({});
const detailVisible = ref(false);
const selectedImage = ref(null);
const uploadVisibility = ref('private');

// 判断是否为视频文件
const isVideoFile = (filename) => {
  if (!filename) return false;
  const videoExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm'];
  return videoExtensions.some(ext => filename.toLowerCase().endsWith(ext));
};

// =========================================================
// === 编辑器核心逻辑 ===
// =========================================================

let cropperInstance = null;

const editorVisible = ref(false);
const editorImageRef = ref(null);
const currentEditingImage = ref(null);
const editorBlobUrl = ref(''); 
const saving = ref(false);

const filters = ref({
    brightness: 100,
    contrast: 100,
    saturate: 100,
    hue: 0
});

const uploadHeaders = computed(() => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`
}));

// 顶部欢迎信息用
const todayText = computed(() => new Date().toLocaleDateString());
const accountDays = computed(() => {
  if (!userInfo.value?.created_at) return 0;
  const diff = Date.now() - new Date(userInfo.value.created_at).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
});

const fetchUserInfo = async () => {
    try {
        const res = await axios.get('/api/user/profile', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        userInfo.value = res.data;
    } catch(e) {}
};

const fetchAlbums = async () => {
    try {
        const res = await axios.get('/api/albums', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        albums.value = res.data;
    } catch (e) {
        console.error(e);
    }
};

const fetchImages = async () => {
    loading.value = true;
    try {
        let url = '/api/images';
        if (activeAlbum.value !== 'all') {
            url = `/api/albums/${activeAlbum.value}`;
        }

        const res = await axios.get(url, { 
            params: { q: searchText.value },
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        images.value = res.data.map(img => ({...img, updatedKey: Date.now()}));
    } catch(e) { ElMessage.error('无法连接到画廊'); } 
    finally { loading.value = false; }
};

const handleAlbumChange = () => {
    fetchImages();
};

const handleCommand = (command) => {
    if (command === 'logout') {
        localStorage.removeItem('token');
        router.push('/login');
    } else if (command === 'profile') router.push('/profile');
};

const showDetail = (img) => { 
    selectedImage.value = img; 
    // 找到当前点击图片在列表中的索引，传给 viewer 实现从当前图开始轮播
    previewIndex.value = images.value.findIndex(i => i.id === img.id);
    viewerVisible.value = true; // 使用图片查看器替代原来的dialog
};

const deleteImage = async (id) => {
    try {
        await axios.delete(`http://10.162.15.4:3000/api/images/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        ElMessage.success('照片已移除');
        images.value = images.value.filter(img => img.id !== id);
    } catch (error) { ElMessage.error('删除失败'); }
};

const copyLink = (path) => {
    navigator.clipboard.writeText(`http://10.162.15.4:3000/${path}`)
        .then(() => ElMessage.success('链接已复制'));
};

const handleSuccess = (res) => { 
    ElMessage.success(`上传成功! 发现: ${res.aiTags?.slice(0,2).join(', ')}...`); 
    // 刷新当前视图
    fetchImages(); 
    // 同时刷新相册列表以更新各相册的计数
    fetchAlbums();
};
const handleError = () => ElMessage.error('上传失败');

const formatDate = (str, full = false) => {
    if (!str) return '-';
    return full ? new Date(str).toLocaleString() : new Date(str).toLocaleDateString();
};

const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
};

// --- 编辑器核心逻辑 ---

const handleEditorOpened = async () => {
    if (!currentEditingImage.value || !editorImageRef.value) return;
    cleanupEditor(false); 

    const loadingMsg = ElMessage({
        message: '正在加载原图...',
        type: 'info',
        duration: 0,
    });
    
    try {
        const imgRes = await axios.get(
            `http://10.162.15.4:3000/${currentEditingImage.value.file_path}?t=${Date.now()}`,
            { responseType: 'blob' }
        );

        editorBlobUrl.value = URL.createObjectURL(imgRes.data);
        
        editorImageRef.value.onload = () => {
            nextTick(() => {
                initCropper(); 
                loadingMsg.close();
            });
        };
        
        editorImageRef.value.src = editorBlobUrl.value;

    } catch (e) {
        loadingMsg.close();
        ElMessage.error('图片加载失败');
        console.error(e);
    }
};

const cleanupEditor = (closeModal = true) => {
    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }
    if (editorBlobUrl.value) {
        URL.revokeObjectURL(editorBlobUrl.value);
        editorBlobUrl.value = '';
    }
    if (editorImageRef.value) {
        editorImageRef.value.src = '';
    }
    if (closeModal) {
        editorVisible.value = false;
    }
};

const openEditor = (img) => {
    currentEditingImage.value = img;
    filters.value = { brightness: 100, contrast: 100, saturate: 100, hue: 0 };
    editorVisible.value = true;
};

const updateFilterPreview = () => {
    const filterString = `brightness(${filters.value.brightness}%) contrast(${filters.value.contrast}%) saturate(${filters.value.saturate}%) hue-rotate(${filters.value.hue}deg)`;
    const cropperCanvas = document.querySelector('.cropper-canvas img');
    const cropperViewBox = document.querySelector('.cropper-view-box img');
    
    if (cropperCanvas) {
        cropperCanvas.style.transition = 'filter 0.15s ease-out';
        cropperCanvas.style.filter = filterString;
    }
    if (cropperViewBox) {
        cropperViewBox.style.transition = 'filter 0.15s ease-out';
        cropperViewBox.style.filter = filterString;
    }
};

// 修正后的初始化函数
const initCropper = () => {
    if (cropperInstance && typeof cropperInstance.destroy === 'function') {
        cropperInstance.destroy();
        cropperInstance = null;
    }

    if (!editorImageRef.value || !editorImageRef.value.src) return;

    cropperInstance = new Cropper(editorImageRef.value, {
        viewMode: 1, // 限制在容器内
        dragMode: 'move', // 允许拖动画布
        background: false,
        autoCropArea: 0.8,
        responsive: true,
        restore: false,
        checkCrossOrigin: false,
        modal: true,
        guides: true,
        center: true,
        highlight: false,
        movable: true,
        rotatable: false,
        scalable: false,
        zoomable: true,
        zoomOnTouch: true,
        zoomOnWheel: true,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        
        // 移除了 cropBoxMaxWidth/Height 的手动设置，交给 Cropper 自动计算
        
        ready() {
            updateFilterPreview();
        }
    });

    if (cropperInstance && typeof cropperInstance.getData !== 'function' && cropperInstance.cropper) {
        cropperInstance = cropperInstance.cropper;
    }
};

const resetFilters = () => {
    filters.value = { brightness: 100, contrast: 100, saturate: 100, hue: 0 };
    updateFilterPreview();
};

const applyPreset = (type) => {
    if (type === 'original') {
        filters.value = { brightness: 100, contrast: 100, saturate: 100, hue: 0 };
    } else if (type === 'warm') {
        filters.value = { brightness: 105, contrast: 110, saturate: 120, hue: -15 };
    } else if (type === 'cool') {
        filters.value = { brightness: 95, contrast: 110, saturate: 110, hue: 15 };
    } else if (type === 'bw') {
        filters.value = { brightness: 100, contrast: 130, saturate: 0, hue: 0 };
    }
    updateFilterPreview();
};

const closeEditor = () => {
    cleanupEditor(true);
};

const saveEditedImage = async () => {
    if (!cropperInstance) {
        ElMessage.warning('编辑器未就绪，请稍后再试');
        return;
    }
    if (typeof cropperInstance.getData !== 'function') {
        ElMessage.error('编辑器内部错误：实例方法丢失');
        return;
    }

    saving.value = true;

    try {
        const cropData = cropperInstance.getData(true);
        const payload = {
            crop: {
                x: cropData.x,
                y: cropData.y,
                width: cropData.width,
                height: cropData.height
            },
            filters: {
                brightness: Number(filters.value.brightness),
                contrast: Number(filters.value.contrast),
                saturate: Number(filters.value.saturate),
                hue: Number(filters.value.hue)
            }
        };

        await axios.post(
            `/api/images/${currentEditingImage.value.id}/process`, 
            payload, 
            { 
                headers: { 
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        ElMessage.success('图片修改成功');
        cleanupEditor(true);
        await fetchImages();
        
    } catch (error) {
        console.error('保存失败:', error);
        ElMessage.error(error.response?.data || '保存失败');
    } finally {
        saving.value = false;
    }
};

onMounted(() => { 
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/cropperjs@1.5.12/dist/cropper.min.css';
  document.head.appendChild(link);
  
  fetchUserInfo(); 
  fetchAlbums();
  fetchImages(); 
});

watch(editorVisible, (val) => {
  if (!val) cleanupEditor();
});

const inputVisible = ref(false);
const inputValue = ref('');
const InputRef = ref(null);
const viewerVisible = ref(false);
const previewIndex = ref(0);

// 计算属性用于图片预览列表
const previewList = computed(() => images.value.map(img => `http://10.162.15.4:3000/${img.file_path}`));

// 显示输入框用于添加标签
const showInput = () => {
    inputVisible.value = true;
    nextTick(() => {
        InputRef.value.focus();
    });
};

// 确认添加标签
const handleInputConfirm = async () => {
    const inputVal = inputValue.value.trim();
    if (inputVal) {
        try {
            await axios.post(`http://10.162.15.4:3000/api/images/${selectedImage.value.id}/tags`, 
                { tagName: inputVal },
                {
                    headers: { 
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            // 更新本地标签显示
            if (!selectedImage.value.tags) {
                selectedImage.value.tags = [];
            }
            selectedImage.value.tags.push(inputVal);
            
            ElMessage.success('标签添加成功');
        } catch (error) {
            ElMessage.error('标签添加失败');
        }
    }
    inputVisible.value = false;
    inputValue.value = '';
};
</script>

<style scoped>
/* 原有基础样式保持不变 */
.app-wrapper { 
  min-height: 100vh; 
  background: radial-gradient(circle at 20% 20%, #dbeafe 0%, #f5f3ff 30%, #f8fafc 65%, #f8fafc 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
  color: #1f2937; 
}
.navbar { position: sticky; top: 0; z-index: 100; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(0,0,0,0.05); padding: 0 24px; height: 64px; display: flex; justify-content: center; }
.nav-content { width: 100%; max-width: 1400px; display: flex; align-items: center; justify-content: space-between; }
.brand { display: flex; align-items: center; gap: 10px; cursor: pointer; transition: opacity 0.2s; }
.brand:hover { opacity: 0.8; }
.brand-logo { width: 36px; height: 36px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; }
.brand-text { font-size: 18px; font-weight: 700; color: #1e293b; letter-spacing: -0.5px; }
.search-container { flex: 1; max-width: 400px; margin: 0 20px; }
:deep(.mac-search .el-input__wrapper) { border-radius: 20px; background: #f1f5f9; box-shadow: none; padding: 4px 15px; transition: all 0.3s ease; }
:deep(.mac-search .el-input__wrapper.is-focus) { background: #fff; box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2); }
.user-pill { display: flex; align-items: center; gap: 8px; padding: 4px 12px 4px 4px; background: #fff; border: 1px solid #e2e8f0; border-radius: 30px; cursor: pointer; transition: all 0.2s; }
.user-pill:hover { border-color: #cbd5e1; box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
.nav-avatar { background: #6366f1; color: white; font-weight: 600; font-size: 14px; }
.username { font-size: 14px; font-weight: 500; color: #334155; max-width: 100px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.caret-icon { font-size: 12px; color: #94a3b8; }
.main-container { max-width: 1400px; margin: 0 auto; padding: 24px; }
.hero-section { 
  margin-bottom: 28px; 
  padding: 22px 26px;
  border-radius: 26px;
  background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(236,252,203,0.18));
  border: 1px solid rgba(99,102,241,0.12);
  box-shadow: 0 24px 60px rgba(15,23,42,0.08);
}

.profile-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.profile-main {
  display: flex;
  align-items: center;
  gap: 16px;
}

.profile-avatar {
  background: linear-gradient(135deg, #6366f1, #a855f7);
  font-size: 22px;
  font-weight: 600;
  color: #fff;
}

.profile-texts .hello {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
}

.profile-texts .subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #64748b;
}

.profile-meta {
  text-align: right;
  font-size: 12px;
  color: #64748b;
}

.meta-line { display: flex; justify-content: flex-end; gap: 6px; }
.meta-label { opacity: 0.8; }
.meta-value { font-weight: 600; color: #111827; }
.upload-widget :deep(.el-upload-dragger) { border: 2px dashed #e2e8f0; border-radius: 20px; background: #fff; height: 120px; display: flex; align-items: center; justify-content: center; transition: all 0.3s; }
.upload-widget :deep(.el-upload-dragger:hover) { border-color: #8b5cf6; background: #f5f3ff; box-shadow: 0 12px 30px rgba(99,102,241,0.12); transform: translateY(-2px); }
.upload-inner { display: flex; align-items: center; gap: 20px; }
.icon-circle { width: 50px; height: 50px; border-radius: 50%; background: #e0e7ff; color: #6366f1; font-size: 24px; display: flex; align-items: center; justify-content: center; }
.text-group h3 { margin: 0; font-size: 16px; color: #1e293b; }
.text-group p { margin: 4px 0 0; font-size: 13px; color: #64748b; }
.gallery-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.left { display: flex; align-items: center; gap: 12px; }
.section-title { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0; }
.badge { background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; }
.glass-btn { border: none; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.album-tabs-wrapper { margin-bottom: 10px; }
.album-tabs :deep(.el-tabs__item) { font-size: 13px; padding: 0 12px; }
.album-tabs :deep(.el-tabs__nav-wrap::after) { height: 1px; background-color: #e5e7eb; }
.album-tabs :deep(.el-tabs__item.is-active) { color: #4f46e5; font-weight: 700; }
.album-tabs :deep(.el-tabs__active-bar) { background: linear-gradient(90deg, #6366f1, #a855f7); height: 3px; border-radius: 999px; }
.gallery-grid { column-count: 5; column-gap: 18px; }
@media (max-width: 1200px) { .gallery-grid { column-count: 4; } }
@media (max-width: 900px) { .gallery-grid { column-count: 3; } }
@media (max-width: 600px) { .gallery-grid { column-count: 2; column-gap: 12px; } }
.pin-card { 
  break-inside: avoid; margin-bottom: 18px; 
  background: rgba(255,255,255,0.86); 
  border-radius: 18px; 
  overflow: hidden; 
  box-shadow: 0 14px 40px rgba(15,23,42,0.08);
  border: 1px solid rgba(148,163,184,0.15);
  cursor: zoom-in; 
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; 
  backdrop-filter: blur(6px);
}
.pin-card:hover { 
  transform: translateY(-6px); 
  box-shadow: 0 18px 55px rgba(99,102,241,0.18);
  border-color: rgba(99,102,241,0.2);
}
.pin-image-wrapper { position: relative; overflow: hidden; }
.pin-image { display: block; width: 100%; transition: transform 0.5s ease, filter 0.3s ease; }
.pin-card:hover .pin-image { transform: scale(1.04); filter: brightness(0.98); }
.pin-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.32) 100%); opacity: 0; transition: opacity 0.2s; display: flex; align-items: flex-end; justify-content: flex-end; padding: 12px; }
.pin-card:hover .pin-overlay { opacity: 1; }
.pin-actions { display: flex; gap: 8px; }
.action-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: rgba(255,255,255,0.9); color: #475569; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.action-btn:hover { background: #fff; color: #6366f1; transform: scale(1.1); }
.action-btn.delete:hover { color: #ef4444; }

/* 视频缩略图样式 */
.video-thumbnail-container { position: relative; }
.video-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; }
.play-icon { font-size: 48px; color: rgba(255,255,255,0.8); }
.pin-info { padding: 12px 12px 14px; }
.pin-title { font-size: 14px; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pin-meta { font-size: 11px; color: #94a3b8; margin-top: 4px; }
.pin-author { font-size: 11px; color: #818cf8; margin-top: 6px; font-weight: 600; }
:deep(.glass-dialog) { border-radius: 20px; overflow: hidden; }
:deep(.el-dialog__header) { margin: 0; padding: 20px; border-bottom: 1px solid #f1f5f9; }
.detail-content { padding: 10px 0; }
.detail-preview { background: #f8fafc; border-radius: 12px; padding: 10px; text-align: center; margin-bottom: 20px; }
.detail-preview img { max-height: 260px; max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.d-item { display: flex; flex-direction: column; }
.d-item.full { grid-column: span 2; }
.d-item label { font-size: 12px; color: #94a3b8; margin-bottom: 4px; }
.d-item span { font-size: 14px; color: #334155; font-weight: 500; font-family: monospace; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.no-data { font-size: 12px; color: #cbd5e1; font-style: italic; }
.danger-item { color: #ef4444 !important; }
.upload-controls { display: flex; justify-content: center; margin-bottom: 20px; }
.visibility-toggle { background: #fff; border-radius: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
.visibility-hint { font-size: 12px; color: #64748b; margin-top: 5px; }

/* ================== 编辑器专用样式修复版 ================== */
.editor-dialog :deep(.el-dialog__body) {
  padding: 0; 
  display: flex;
  flex-direction: column;
  height: calc(100vh - 54px); 
  background: #0f172a; 
}

.editor-layout {
  display: flex;
  flex: 1; 
  flex-direction: column; 
  width: 100%;
  height: 100%;
  overflow: hidden;
}

@media (min-width: 768px) {
    .editor-layout {
        flex-direction: row; 
    }
}

.editor-main {
    flex: 1;
    position: relative;
    background: #0f172a; 
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 20px; 
    min-height: 0;
    min-width: 0;
}

.img-container {
    max-width: 100%;
    max-height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}

.source-img {
    display: block;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    opacity: 0; 
    transition: opacity 0.2s;
}

.source-img[src] {
    opacity: 1;
}

.editor-sidebar {
  width: 100%;
  max-height: 35vh;
  overflow: hidden; /* 由内部 scroll div 负责滚动 */
  background: #fff;
  display: flex;
  flex-direction: column;
  z-index: 10;
}

@media (min-width: 768px) {
    .editor-sidebar {
        width: 320px;
        max-height: none; 
        height: 100%;
        border-left: 1px solid #e2e8f0;
    }
}

.sidebar-content-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
}

.sidebar-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.sidebar-header .info h3 { margin: 0; color: #334155; font-size: 18px; }
.sidebar-header .sub { margin: 4px 0 0; font-size: 12px; color: #94a3b8; line-height: 1.4; }

.control-group { margin-bottom: 24px; padding: 0 4px; }
.control-group .label { display: flex; justify-content: space-between; font-size: 13px; color: #64748b; margin-bottom: 10px; }

.preset-row { margin-bottom: 24px; }
.preset-label { display: block; font-size: 13px; color: #64748b; margin-bottom: 10px; padding-left: 4px;}
.preset-buttons { display: flex; gap: 8px; flex-wrap: wrap; padding: 0 4px; }
.preset-buttons .el-tag { cursor: pointer; transition: all 0.2s; }
.preset-buttons .el-tag:hover { transform: translateY(-2px); }

.editor-actions {
    margin-top: auto; 
    border-top: 1px solid #f1f5f9;
    padding: 16px 20px;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
}
.editor-actions .hint { font-size: 12px; color: #94a3b8; max-width: 50%; }
.editor-actions .btns { display: flex; gap: 10px; }

/* 视频详情样式 */
.detail-video { max-width: 100%; max-height: 300px; border-radius: 8px; }

/* CropperJS 样式定制 */
:deep(.cropper-container) {
    max-width: 100% !important;
    max-height: 100% !important;
}

:deep(.cropper-view-box) {
    outline: 1px solid rgba(255, 255, 255, 0.8);
    outline-color: rgba(255, 255, 255, 0.8);
}
:deep(.cropper-line) { background-color: rgba(255, 255, 255, 0.6); }
:deep(.cropper-point) { background-color: rgba(255, 255, 255, 0.8); opacity: 1; }
:deep(.cropper-point.point-se) { width: 10px; height: 10px; } 

:deep(.cropper-canvas img),
:deep(.cropper-view-box img) {
    transition: filter 0.15s ease-out;
    object-fit: contain;
}

.grid-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: 100%;
  display: flex;
  flex-direction: column;
}
.grid-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.12);
}
.album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  padding: 20px;
}
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
  padding: 20px;
}
.image-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.image-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.12);
}
.album-cover {
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
  display: block;
}
.album-info {
  padding: 20px;
}
.album-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #1e293b;
}
.album-desc {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 12px 0;
  line-height: 1.5;
}
.album-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  color: #94a3b8;
  font-size: 13px;
}
.image-placeholder {
  width: 100%;
  aspect-ratio: 4/3;
  background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}
.image-thumb {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
  display: block;
}
.image-info {
  padding: 16px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}
.image-name {
  font-size: 15px;
  font-weight: 500;
  margin: 0 0 8px 0;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.image-meta {
  display: flex;
  justify-content: space-between;
  color: #94a3b8;
  font-size: 12px;
  margin-top: auto;
}
.image-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}
.image-tag {
  background: #f1f5f9;
  color: #475569;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
}
.detail-dialog {
  border-radius: 20px;
  overflow: hidden;
  max-width: 90vw;
  max-height: 90vh;
}
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}
.detail-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #1e293b;
}
.detail-content {
  display: flex;
  padding: 24px;
  gap: 32px;
}
.detail-image-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.detail-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.detail-info {
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.info-section {
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px;
}
.info-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #1e293b;
}
.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}
.info-label {
  color: #64748b;
}
.info-value {
  color: #1e293b;
  font-weight: 500;
  text-align: right;
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag-item {
  background: #e0f2fe;
  color: #0369a1;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}
.delete-btn {
  color: #ef4444;
  cursor: pointer;
  transition: color 0.2s;
}
.delete-btn:hover {
  color: #b91c1c;
}
.editor-dialog {
  border-radius: 20px;
  overflow: hidden;
  max-width: 90vw;
  max-height: 90vh;
}
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}
.editor-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #1e293b;
}
.editor-content {
  display: flex;
  padding: 24px;
  gap: 32px;
}
.editor-image-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.editor-preview {
  max-width: 100%;
  max-height: 70vh;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.editor-controls {
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.control-group {
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px;
}
.control-group h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #1e293b;
}
.slider-control {
  margin-bottom: 16px;
}
.slider-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}
.slider-value {
  color: #64748b;
  font-weight: 500;
}
.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: auto;
}
.reset-btn {
  flex: 1;
}
.save-btn {
  flex: 2;
}
.video-thumbnail {
  width: 100%;
  aspect-ratio: 16/9;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  font-weight: 500;
}
.video-icon {
  font-size: 32px;
  margin-right: 8px;
}
.manual-tag-input {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.tag-input {
  flex: 1;
}
.add-tag-btn {
  padding: 0 16px;
}
:deep(.el-dialog__header) {
  display: none;
}
:deep(.el-slider__button) {
  width: 16px;
  height: 16px;
}
:deep(.cropper-view-box img) {
  transition: filter 0.15s ease-out;
  object-fit: contain;
}
