<template>
  <div 
    class="chat-wrapper" 
    :class="expandDirection" 
    :style="positionStyle" 
    ref="widgetRef"
  >
    <div 
      class="chat-trigger" 
      @mousedown="startDrag" 
      @touchstart.passive="startDrag"
      @click="handleClick"
      v-if="!isOpen"
    >
      <el-icon :size="24"><ChatDotRound /></el-icon>
    </div>

    <transition name="slide-up">
      <div class="chat-window" v-if="isOpen">
        <div class="chat-header" @mousedown="startDrag" @touchstart.passive="startDrag" style="cursor: move;">
           <span>✨ 智能助手</span>
           <div class="header-actions" @mousedown.stop>
             <el-icon class="reset-btn" title="清空本次对话" @click.stop="clearChat"><RefreshLeft /></el-icon>
             <el-icon class="close-btn" @click="toggleChat"><Close /></el-icon>
           </div>
        </div>

        <div class="chat-messages" ref="msgContainer">
          <div v-for="(msg, index) in messages" :key="index" :class="['message', msg.role]">
            <div class="avatar" v-if="msg.role === 'assistant'">AI</div>
            <div class="bubble">
              <div class="text">{{ msg.content }}</div>
              
              <div v-if="msg.images && msg.images.length" class="chat-gallery">
                <div v-for="img in msg.images" :key="img.id" class="mini-card" @click="viewImage(img)">
                  <img :src="`http://localhost:3000/${img.thumbnail_path}`" loading="lazy" />
                  <span class="img-date">{{ new Date(img.capture_time).toLocaleDateString() }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-if="loading" class="message assistant">
             <div class="avatar">AI</div>
             <div class="bubble loading-dots">
               <span>.</span><span>.</span><span>.</span>
             </div>
          </div>
        </div>

        <div class="chat-input" @mousedown.stop>
          <el-input 
            v-model="inputMsg" 
            placeholder="帮我找找去年爬山的照片..." 
            @keyup.enter="sendMessage"
            :disabled="loading"
          >
            <template #suffix>
              <el-icon class="send-icon" @click="sendMessage"><Position /></el-icon>
            </template>
          </el-input>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, nextTick, computed, onUnmounted, watch } from 'vue';
import { ChatDotRound, Close, Position, RefreshLeft } from '@element-plus/icons-vue';
import axios from 'axios';

// --- 状态定义 ---
const isOpen = ref(false);
const inputMsg = ref('');
const loading = ref(false);
const messages = ref([
  { role: 'assistant', content: '你好！我是你的相册助手。' }
]);
const msgContainer = ref(null);

// --- 拖拽逻辑状态 ---
const widgetRef = ref(null);
const pos = ref({ right: 30, bottom: 30 }); // 初始位置
let isDragging = false;
let hasMoved = false; // 用于区分是"拖拽"还是"点击"
let startX = 0;
let startY = 0;
let startRight = 0;
let startBottom = 0;

// 计算属性：将位置对象转换为样式
const positionStyle = computed(() => ({
  right: `${pos.value.right}px`,
  bottom: `${pos.value.bottom}px`
}));

// --- 新增：点击空白处关闭逻辑 ---

const handleClickOutside = (e) => {
  // 如果当前没打开，或者 ref 不存在，直接返回
  if (!isOpen.value || !widgetRef.value) return;

  // 核心逻辑：判断点击的目标(e.target) 是否包含在组件(widgetRef)内部
  // 如果包含（点击的是聊天框本身或图标），什么都不做
  if (widgetRef.value.contains(e.target)) {
    return;
  }

  // 如果不包含（说明点击了外部空白处），则关闭
  toggleChat();
};

// 使用 watch 监听 isOpen 的变化，动态添加/移除事件监听
watch(isOpen, (val) => {
  if (val) {
    // 延迟添加监听器，防止点击"打开图标"的那一次点击事件冒泡立即触发"关闭"
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
  } else {
    document.removeEventListener('click', handleClickOutside);
  }
});

// --- 拖拽处理函数 ---

const startDrag = (e) => {
  // 只有左键可以拖拽
  if (e.type === 'mousedown' && e.button !== 0) return;

  isDragging = true;
  hasMoved = false;
  
  // 兼容触摸屏和鼠标
  const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
  const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

  startX = clientX;
  startY = clientY;
  startRight = pos.value.right;
  startBottom = pos.value.bottom;

  // 添加全局监听，防止鼠标移出组件导致拖拽中断
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('touchmove', onDrag, { passive: false });
  document.addEventListener('mouseup', stopDrag);
  document.addEventListener('touchend', stopDrag);
};

const onDrag = (e) => {
  if (!isDragging) return;

  const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
  const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

  // 计算位移 (注意：向左移动，right 增加；向上移动，bottom 增加)
  const deltaX = startX - clientX;
  const deltaY = startY - clientY;

  // 只要移动超过 5 像素，就认为是拖拽行为，而不是点击
  if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
    hasMoved = true;
  }

  pos.value.right = startRight + deltaX;
  pos.value.bottom = startBottom + deltaY;
  
  // 防止默认滚动行为 (主要针对移动端)
  if(e.cancelable) e.preventDefault();
};

const stopDrag = () => {
  isDragging = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('touchmove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.removeEventListener('touchend', stopDrag);
};

// --- 点击处理 ---

// 只有在没有发生拖拽（位移很小）的情况下，才触发切换窗口
const handleClick = () => {
  if (!hasMoved) {
    toggleChat();
  }
};

const toggleChat = () => {
  isOpen.value = !isOpen.value;
  if(isOpen.value) scrollToBottom();
};

// 清空当前会话历史，保留欢迎语
const clearChat = () => {
  messages.value = [{ role: 'assistant', content: '你好！我是你的相册助手。' }];
  inputMsg.value = '';
  scrollToBottom();
};

// --- 其它原有逻辑 (保持不变) ---
const scrollToBottom = () => {
  nextTick(() => {
    if (msgContainer.value) {
      msgContainer.value.scrollTop = msgContainer.value.scrollHeight;
    }
  });
};

const sendMessage = async () => {
  if (!inputMsg.value.trim() || loading.value) return;
  const userText = inputMsg.value;
  messages.value.push({ role: 'user', content: userText });
  inputMsg.value = '';
  scrollToBottom();
  loading.value = true;

  try {
    const history = messages.value.filter(m => !m.images).slice(-6).map(m => ({ role: m.role, content: m.content }));
    const res = await axios.post('http://localhost:3000/api/chat', { message: userText, history }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    messages.value.push({ role: 'assistant', content: res.data.text, images: res.data.images || [] });
  } catch (error) {
    messages.value.push({ role: 'assistant', content: '服务繁忙，请稍后...' });
  } finally {
    loading.value = false;
    scrollToBottom();
  }
};

const viewImage = (img) => {
    window.open(`http://localhost:3000/${img.file_path}`, '_blank');
};

// 组件卸载时清理所有监听
onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.removeEventListener('touchmove', onDrag);
  document.removeEventListener('touchend', stopDrag);
  document.removeEventListener('click', handleClickOutside); // 清理点击监听
});
</script>

<style scoped>
.chat-wrapper {
  position: fixed; 
  /* right/bottom 现在通过内联样式 :style 控制，这里不需要写默认值了，或者写个兜底 */
  z-index: 2000;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  touch-action: none; /* 防止触摸拖拽时触发浏览器滚动 */
}

/* 悬浮按钮 */
.chat-trigger {
  width: 60px; height: 60px; background: #6366f1; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; color: white;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4); 
  cursor: move; /* 鼠标变为移动图标 */
  transition: transform 0.1s; /* 稍微调快动画，避免拖拽延迟感 */
  user-select: none; /* 防止拖拽时选中文字 */
}
.chat-trigger:active { transform: scale(0.95); }

/* 聊天窗口 */
.chat-window {
  width: 380px; height: 550px; background: #fff; border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15); display: flex; flex-direction: column;
  overflow: hidden; border: 1px solid #f1f5f9;
  /* 确保窗口打开时是在按钮原来的位置上方展开 */
  position: absolute; 
  bottom: 0; 
  right: 0;
}

.chat-header {
  padding: 15px 20px; background: #6366f1; color: white; font-weight: 600;
  display: flex; justify-content: space-between; align-items: center;
  user-select: none;
}
.header-actions { display: flex; align-items: center; gap: 10px; }
.reset-btn { cursor: pointer; opacity: 0.9; }
.reset-btn:hover { opacity: 1; }
.close-btn { cursor: pointer; opacity: 0.8; }
.close-btn:hover { opacity: 1; }

.chat-messages {
  flex: 1; padding: 20px; overflow-y: auto; background: #f8fafc;
}

.message { display: flex; gap: 10px; margin-bottom: 20px; }
.message.user { flex-direction: row-reverse; }

.avatar {
  width: 32px; height: 32px; background: #e0e7ff; color: #6366f1;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: bold; flex-shrink: 0;
}

.bubble {
  max-width: 80%; padding: 12px 16px; border-radius: 16px; font-size: 14px; line-height: 1.5;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05); position: relative;
}
.message.assistant .bubble { background: #fff; border-top-left-radius: 4px; color: #334155; }
.message.user .bubble { background: #6366f1; border-top-right-radius: 4px; color: #fff; }

.chat-gallery {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 10px;
}
.mini-card {
  position: relative; border-radius: 8px; overflow: hidden; cursor: pointer; aspect-ratio: 1;
}
.mini-card img { width: 100%; height: 100%; object-fit: cover; }
.img-date {
  position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6);
  color: #fff; font-size: 10px; padding: 2px 4px; text-align: center;
}

.chat-input { padding: 15px; background: #fff; border-top: 1px solid #f1f5f9; }
.send-icon { cursor: pointer; color: #6366f1; font-size: 18px; }

/* 动画 */
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1); }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(20px) scale(0.95); }

.loading-dots span { animation: bounce 1.4s infinite ease-in-out both; margin: 0 2px; }
.loading-dots span:nth-child(1) { animation-delay: -0.32s; }
.loading-dots span:nth-child(2) { animation-delay: -0.16s; }
@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
</style>