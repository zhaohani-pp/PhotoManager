import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Profile from '../views/Profile.vue' // 1. 引入 Profile 组件

const routes = [
  { path: '/', component: Home },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/profile', component: Profile } // 2. 定义 Profile 路由规则
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：防止未登录用户访问受保护页面
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  
  // 定义需要登录才能访问的页面
  const protectedPaths = ['/', '/profile'];

  // 如果要去受保护的页面，且没有 token，强制跳回登录页
  if (protectedPaths.includes(to.path) && !token) {
    next('/login');
  } else {
    next();
  }
})

export default router