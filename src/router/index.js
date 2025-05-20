import { createRouter, createWebHistory } from 'vue-router'
import ShowText from "@/views/ShowText.vue";


const routes = [
  {
    path: '/',
    name: 'home',
    component: ShowText
  },

]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
