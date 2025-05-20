<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const transcribedText = ref('')
const interimText = ref('')

let fullText = ''  // 完整文本，用于比对新内容
let currentIndex = 0  // 打字机效果索引

// 打字机效果函数
const typeText = (newText) => {
  const chars = newText.split('')
  const typing = () => {
    if (currentIndex < chars.length) {
      interimText.value += chars[currentIndex]
      currentIndex++
      setTimeout(typing, 20)// 打字速度
    } else {
      transcribedText.value += interimText.value
      interimText.value = ''
      currentIndex = 0
    }
  }
  typing()
}

// 每 5 秒请求接口
const pollLatestText = async () => {
  try {
    const response = await axios.get('http://localhost:18081/api/latest')
    const latest = response.data || ''

    if (latest && latest !== fullText) {
      const newPart = latest.substring(fullText.length)
      if (newPart.length > 0) {
        fullText = latest
        typeText(newPart)
      }
    }
  } catch (error) {
    console.error('获取语音文本失败:', error)
  }
}

// 启动轮询
onMounted(() => {
  setInterval(pollLatestText, 5000)
})
</script>

<template>
  <div class="speech-to-text-fullpage">
    <div class="bg-effect"></div> <!-- 动态背景层 -->

    <div class="header-section">
      <h1 class="page-title">
        <span class="tech-prefix">VOICE</span>
        智能语音转文字系统
        <span class="tech-suffix">TEXT</span>
      </h1>
      <div class="title-underline"></div>
    </div>

    <div class="transcription-section">
      <div class="transcription-display">
        <!-- 已确认的文本 -->
        <div class="confirmed-text">
          <p>{{ transcribedText }}</p>
        </div>

        <!-- 实时输入的临时文本 -->
        <div
            v-if="interimText"
            class="interim-text"
        >
          <p>{{ interimText }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap');

.speech-to-text-fullpage {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: transparent;
  z-index: 1;
  color: #e2e8f0;
  font-family: 'Segoe UI', 'Roboto', sans-serif;
}

.header-section {
  background: linear-gradient(135deg, #0b1022 0%, #1e293b 100%);
  padding: 25px 20px;
  text-align: center;
  border-bottom: 1px solid #0ea5e9;
  position: relative;
  z-index: 1;
  box-shadow: 0 5px 15px rgba(10, 37, 64, 0.5);
}

.page-title {
  font-size: 34px;
  font-weight: 700;
  color: #f0fdfa;
  text-shadow: 0 0 10px rgba(14, 165, 233, 0.7);
  margin: 0;
  padding: 10px 0;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Orbitron', sans-serif;
}

.tech-prefix, .tech-suffix {
  color: #0ea5e9;
  font-size: 24px;
  font-weight: 700;
  margin: 0 15px;
  text-shadow: 0 0 8px rgba(14, 165, 233, 0.9);
  position: relative;
}

.tech-prefix::before, .tech-suffix::before {
  content: '[';
  opacity: 0.7;
  margin-right: 3px;
}

.tech-prefix::after, .tech-suffix::after {
  content: ']';
  opacity: 0.7;
  margin-left: 3px;
}

.title-underline {
  height: 3px;
  width: 60%;
  margin: 10px auto 0;
  background: linear-gradient(90deg,
  transparent 0%,
  #0ea5e9 20%,
  #0ea5e9 80%,
  transparent 100%);
  position: relative;
}

.title-underline::before, .title-underline::after {
  content: '';
  position: absolute;
  top: -3px;
  width: 10px;
  height: 10px;
  background: #0ea5e9;
  border-radius: 50%;
  box-shadow: 0 0 10px #0ea5e9;
}

.title-underline::before {
  left: 20%;
}

.title-underline::after {
  right: 20%;
}

.transcription-section {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: #0f172a;
}

.transcription-display {
  flex-grow: 1;
  background-color: #1e293b;
  border-radius: 16px;
  padding: 30px;
  margin-bottom: 20px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  border: 1px solid #0ea5e9;
  position: relative;
  z-index: 1;
}

.confirmed-text {
  font-size: 24px;
  color: #e2e8f0;
  margin-bottom: 10px;
  line-height: 1.6;
}

.interim-text {
  font-size: 20px;
  color: #94a3b8;
  font-style: italic;
  border-left: 3px solid #0ea5e9;
  padding-left: 10px;
  margin-top: 10px;
}

/* 背景动效层 */
.bg-effect {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
  top: 0;
  left: 0;
  z-index: 0;
  background: radial-gradient(ellipse at center, #0f172a 0%, #020617 100%);
}

.bg-effect::before,
.bg-effect::after {
  content: '';
  position: absolute;
  width: 200%;
  height: 200%;
  top: -50%;
  left: -50%;
  background-image:
      radial-gradient(#0ea5e9 1px, transparent 1px),
      linear-gradient(45deg, rgba(14, 165, 233, 0.05) 1px, transparent 1px),
      linear-gradient(-45deg, rgba(14, 165, 233, 0.05) 1px, transparent 1px);
  background-size: 20px 20px, 100px 100px, 100px 100px;
  animation: bgScroll 60s linear infinite;
  opacity: 0.15;
}

/* 星空粒子动画 */
.bg-effect::after {
  background-image: radial-gradient(#0ea5e9 1px, transparent 1px);
  background-size: 3px 3px;
  animation: starTwinkle 3s infinite alternate;
  opacity: 0.2;
}

@keyframes bgScroll {
  from {
    transform: rotate(0deg) translate(0, 0);
  }
  to {
    transform: rotate(360deg) translate(20px, 20px);
  }
}

@keyframes starTwinkle {
  0% {
    opacity: 0.1;
  }
  100% {
    opacity: 0.4;
  }
}
</style>