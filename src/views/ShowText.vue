<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const transcribedText = ref('')
const interimText = ref('')
const summarizedText = ref('')
const translatedText = ref('')
const isSummarizing = ref(false)
const isTranslating = ref(false)
const activeRightPanel = ref('summary') // 'summary' or 'translation'
const selectedSourceLang = ref('cn') // 源语言
const selectedTargetLang = ref('en') // 目标语言
const translationHistory = ref([]) // 翻译历史
const showTranslateDialog = ref(false)
const tempSourceLang = ref(selectedSourceLang.value)
const tempTargetLang = ref(selectedTargetLang.value)

let fullText = ''  // 完整文本，用于比对新内容
let currentIndex = 0  // 打字机效果索引

// 支持的语言列表（部分，按你的表格可自行补充）
const supportedLanguages = [
  { code: 'auto', name: '自动检测', flag: '🌐' },
  { code: 'cn', name: '中文（简体）', flag: '🇨🇳' },
  { code: 'en', name: '英语', flag: '🇺🇸' },
  { code: 'yue', name: '粤语', flag: '🇨🇳' },
  { code: 'ja', name: '日语', flag: '🇯🇵' },
  { code: 'ru', name: '俄语', flag: '🇷🇺' },
  { code: 'fr', name: '法语', flag: '🇫🇷' },
  { code: 'es', name: '西班牙语', flag: '🇪🇸' },
  { code: 'de', name: '德语', flag: '🇩🇪' },
  { code: 'ko', name: '韩语', flag: '🇰🇷' },
  { code: 'it', name: '意大利语', flag: '🇮🇹' },
  { code: 'pt', name: '葡萄牙语', flag: '🇵🇹' },
  { code: 'ar', name: '阿拉伯语', flag: '🇸🇦' },
  { code: 'th', name: '泰语', flag: '🇹🇭' },
  { code: 'vi', name: '越南语', flag: '🇻🇳' },
  // ...可继续补充
]

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
    const response = await axios.get('http://47.98.147.82:18081/api/latest')
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

// 生成总结
const generateSummary = async () => {
  if (!transcribedText.value || isSummarizing.value) return

  isSummarizing.value = true
  activeRightPanel.value = 'summary'

  try {
    const response = await axios.post('http://47.98.147.82:8080/api/summarize', {
      text: transcribedText.value
    })

    summarizedText.value = response.data || '无法生成总结'
  } catch (error) {
    console.error('生成总结失败:', error)
    summarizedText.value = '总结生成失败，请稍后再试'
  } finally {
    isSummarizing.value = false
  }
}

// 翻译文本
const translateText = async () => {
  if (!transcribedText.value || isTranslating.value) return

  isTranslating.value = true
  activeRightPanel.value = 'translation'

  try {
    const response = await axios.post('http://47.98.147.82:8080/api/translate', {
      text: transcribedText.value,
      from_lang: selectedSourceLang.value,
      to_lang: selectedTargetLang.value
    })

    let translationResult = ''
    let detectedLang = ''

    if (response.data && typeof response.data === 'object') {
      translationResult = response.data.translated_text || response.data.text || '翻译失败'
      detectedLang = response.data.from_lang || response.data.source_lang || selectedSourceLang.value
    } else {
      translationResult = response.data || '翻译失败'
    }

    translatedText.value = translationResult

    // 添加到翻译历史
    const historyItem = {
      id: Date.now(),
      originalText: transcribedText.value.substring(0, 100) + (transcribedText.value.length > 100 ? '...' : ''),
      translatedText: translationResult.substring(0, 150) + (translationResult.length > 150 ? '...' : ''),
      fromLang: detectedLang,
      toLang: selectedTargetLang.value,
      timestamp: new Date().toLocaleString()
    }

    translationHistory.value.unshift(historyItem)
    // 只保留最近10条记录
    if (translationHistory.value.length > 10) {
      translationHistory.value = translationHistory.value.slice(0, 10)
    }

  } catch (error) {
    console.error('翻译失败:', error)
    if (error.response?.status === 429) {
      translatedText.value = '翻译请求过于频繁，请稍后再试'
    } else if (error.response?.status === 500) {
      translatedText.value = '服务器内部错误，请稍后再试'
    } else {
      translatedText.value = '翻译失败，请检查网络连接或稍后再试'
    }
  } finally {
    isTranslating.value = false
  }
}

// 快速翻译到指定语言
const quickTranslate = async (targetLang) => {
  selectedTargetLang.value = targetLang
  await translateText()
}

// 清空翻译历史
const clearHistory = () => {
  translationHistory.value = []
}

// 复制文本到剪贴板
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    // 可加提示
  } catch (error) {
    console.error('复制失败:', error)
  }
}

// 获取语言名称
const getLanguageName = (code) => {
  const lang = supportedLanguages.find(l => l.code === code)
  return lang ? lang.name : code
}

// 获取语言旗帜
const getLanguageFlag = (code) => {
  const lang = supportedLanguages.find(l => l.code === code)
  return lang ? lang.flag : '🌐'
}

// 打开翻译弹窗
const openTranslateDialog = () => {
  tempSourceLang.value = selectedSourceLang.value
  tempTargetLang.value = selectedTargetLang.value
  showTranslateDialog.value = true
}

// 确认翻译
const confirmTranslate = async () => {
  selectedSourceLang.value = tempSourceLang.value
  selectedTargetLang.value = tempTargetLang.value
  showTranslateDialog.value = false
  await translateText()
}

// 取消翻译
const cancelTranslate = () => {
  showTranslateDialog.value = false
}

// 启动轮询
onMounted(() => {
  setInterval(pollLatestText, 5000)
})
</script>

<template>
  <div class="speech-to-text-fullpage">
    <div class="bg-effect"></div>
    <div class="header-section">
      <h1 class="page-title">
        <span class="tech-prefix">VOICE</span>
        智能语音转文字系统
        <span class="tech-suffix">TEXT</span>
      </h1>
      <div class="title-underline"></div>
    </div>
    <div class="content-section">
      <!-- 左侧 - 语音转文字 -->
      <div class="transcription-panel">
        <h2 class="panel-title">实时语音转写</h2>
        <div class="transcription-display">
          <div class="confirmed-text">
            <p>{{ transcribedText }}</p>
          </div>
          <div v-if="interimText" class="interim-text">
            <p>{{ interimText }}</p>
          </div>
        </div>
      </div>
      <!-- 中间 - 控制面板 -->
      <div class="control-panel">
        <div class="buttons-container">
          <button
            class="action-button summarize-button"
            @click="generateSummary"
            :disabled="isSummarizing || !transcribedText"
          >
            <div class="button-content">
              <span class="button-icon">✓</span>
              <span class="button-text">一键总结</span>
            </div>
            <div class="button-effect"></div>
          </button>
          <!-- 翻译语言选择弹窗触发按钮 -->
          <button
            class="action-button translate-button"
            @click="openTranslateDialog"
            :disabled="isTranslating || !transcribedText"
          >
            <div class="button-content">
              <span class="button-icon">⟳</span>
              <span class="button-text">开始翻译</span>
            </div>
            <div class="button-effect"></div>
          </button>
        </div>
      </div>
      <!-- 翻译弹窗 -->
      <div v-if="showTranslateDialog" class="translate-dialog-mask">
        <div class="translate-dialog">
          <div class="dialog-title">选择翻译语言</div>
          <div class="dialog-body">
            <div class="dialog-row">
              <label>源语言</label>
              <select v-model="tempSourceLang" class="lang-select">
                <option v-for="lang in supportedLanguages" :key="lang.code" :value="lang.code">
                  {{ lang.flag }} {{ lang.name }}
                </option>
              </select>
            </div>
            <div class="dialog-row">
              <label>目标语言</label>
              <select v-model="tempTargetLang" class="lang-select">
                <option v-for="lang in supportedLanguages.filter(l => l.code !== 'auto')" :key="lang.code" :value="lang.code">
                  {{ lang.flag }} {{ lang.name }}
                </option>
              </select>
            </div>
          </div>
          <div class="dialog-actions">
            <button class="dialog-btn confirm" @click="confirmTranslate">确认</button>
            <button class="dialog-btn cancel" @click="cancelTranslate">取消</button>
          </div>
        </div>
      </div>
      <!-- 右侧 - 总结/翻译内容 -->
      <div class="summary-panel">
        <div class="panel-header">
          <button
            class="tab-button"
            :class="{ active: activeRightPanel === 'summary' }"
            @click="activeRightPanel = 'summary'"
          >
            内容概括
          </button>
          <button
            class="tab-button"
            :class="{ active: activeRightPanel === 'translation' }"
            @click="activeRightPanel = 'translation'"
          >
            翻译内容
          </button>
        </div>
        <!-- 总结内容 -->
        <div v-if="activeRightPanel === 'summary'" class="summary-display">
          <div v-if="summarizedText" class="content-box">
            <div class="content-header">
              <span class="icon">📝</span>
              <span>内容总结</span>
              <button class="copy-btn" @click="copyToClipboard(summarizedText)" title="复制">📋</button>
            </div>
            <p>{{ summarizedText }}</p>
          </div>
          <p v-else-if="isSummarizing" class="loading-text">正在生成总结...</p>
          <p v-else class="empty-text">点击"一键总结"生成内容概括</p>
        </div>
        <!-- 翻译内容 -->
        <div v-if="activeRightPanel === 'translation'" class="summary-display">
          <div v-if="translatedText" class="content-box">
            <div class="content-header">
              <span class="icon">🌐</span>
              <span>翻译结果 ({{ getLanguageFlag(selectedSourceLang) }}{{ getLanguageName(selectedSourceLang) }} → {{ getLanguageFlag(selectedTargetLang) }}{{ getLanguageName(selectedTargetLang) }})</span>
              <button class="copy-btn" @click="copyToClipboard(translatedText)" title="复制">📋</button>
            </div>
            <p>{{ translatedText }}</p>
          </div>
          <p v-else-if="isTranslating" class="loading-text">正在翻译中...</p>
          <p v-else class="empty-text">选择语言并点击"开始翻译"</p>
          <!-- 翻译历史 -->
          <div v-if="translationHistory.length > 0" class="history-section">
            <div class="history-header">
              <span class="icon">📚</span>
              <span>翻译历史</span>
              <button class="clear-btn" @click="clearHistory" title="清空历史">🗑️</button>
            </div>
            <div class="history-list">
              <div v-for="item in translationHistory" :key="item.id" class="history-item">
                <div class="history-meta">
                  <span class="lang-info">{{ getLanguageFlag(item.fromLang) }}{{ getLanguageName(item.fromLang) }} → {{ getLanguageFlag(item.toLang) }}{{ getLanguageName(item.toLang) }}</span>
                  <span class="timestamp">{{ item.timestamp }}</span>
                </div>
                <div class="history-content">
                  <div class="original">{{ item.originalText }}</div>
                  <div class="translated">{{ item.translatedText }}</div>
                </div>
              </div>
            </div>
          </div>
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

/* 内容区布局 */
.content-section {
  flex-grow: 1;
  display: flex;
  background-color: #0f172a;
  padding: 20px;
  gap: 20px;
}

/* 面板共有样式 */
.transcription-panel, .control-panel, .summary-panel {
  border-radius: 16px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  border: 1px solid #0ea5e9;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-size: 20px;
  color: #0ea5e9;
  margin: 0;
  padding: 15px;
  text-align: center;
  border-bottom: 1px solid rgba(14, 165, 233, 0.3);
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  border-radius: 15px 15px 0 0;
  font-family: 'Orbitron', sans-serif;
  letter-spacing: 1px;
  text-shadow: 0 0 5px rgba(14, 165, 233, 0.5);
}

/* 左侧转写区域 */
.transcription-panel {
  flex: 5;
  background-color: #1e293b;
}

.transcription-display {
  flex-grow: 1;
  padding: 20px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.confirmed-text {
  font-size: 22px;
  color: #e2e8f0;
  margin-bottom: 10px;
  line-height: 1.6;
}

.interim-text {
  font-size: 18px;
  color: #94a3b8;
  font-style: italic;
  border-left: 3px solid #0ea5e9;
  padding-left: 10px;
  margin-top: 10px;
}

/* 中间控制区域 */
.control-panel {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  padding: 15px;
}

.buttons-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  align-items: center;
}

.action-button {
  position: relative;
  width: 100%;
  max-width: 180px;
  height: 70px;
  background: linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%);
  border: none;
  border-radius: 12px;
  color: #f0fdfa;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 0 15px rgba(14, 165, 233, 0.5);
  transition: all 0.3s ease;
  font-family: 'Orbitron', sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.action-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #0369a1 0%, #0284c7 100%);
  transform: translateY(-2px);
  box-shadow: 0 0 20px rgba(14, 165, 233, 0.7);
}

.action-button:active:not(:disabled) {
  transform: translateY(1px);
}

.action-button:disabled {
  background: linear-gradient(135deg, #475569 0%, #334155 100%);
  cursor: not-allowed;
  opacity: 0.7;
}

.translate-button {
  background: linear-gradient(135deg, #155e75 0%, #0891b2 100%);
}

.translate-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
}

.button-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.button-icon {
  font-size: 26px;
}

.button-text {
  font-size: 16px;
  letter-spacing: 1px;
}

.button-effect {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background: radial-gradient(circle, transparent 40%, rgba(14, 165, 233, 0.2) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.action-button:hover:not(:disabled) .button-effect {
  opacity: 1;
  animation: pulse 2s infinite;
}

/* 右侧总结/翻译区域 */
.summary-panel {
  flex: 5;
  background-color: #1e293b;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  border-bottom: 1px solid rgba(14, 165, 233, 0.3);
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  border-radius: 15px 15px 0 0;
}

.tab-button {
  flex: 1;
  padding: 15px;
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 18px;
  font-family: 'Orbitron', sans-serif;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.tab-button.active {
  color: #0ea5e9;
  text-shadow: 0 0 5px rgba(14, 165, 233, 0.5);
  box-shadow: inset 0 -3px 0 #0ea5e9;
}

.tab-button:hover:not(.active) {
  color: #e2e8f0;
  background-color: rgba(14, 165, 233, 0.05);
}

.summary-display {
  flex-grow: 1;
  padding: 20px;
  overflow: auto;
  font-size: 20px;
  line-height: 1.6;
  color: #e2e8f0;
}

.loading-text {
  color: #94a3b8;
  font-style: italic;
  text-align: center;
  animation: pulse 1.5s infinite;
}

.empty-text {
  color: #64748b;
  text-align: center;
  margin-top: 40px;
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
  background-image: radial-gradient(#0ea5e9 1px, transparent 1px),
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

@keyframes pulse {
  0% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.5;
  }
}

/* 移除 quick-translate 区域相关样式（如有可直接删除） */

/* 翻译弹窗样式 */
.translate-dialog-mask {
  position: fixed;
  z-index: 9999;
  left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}
.translate-dialog {
  background: #1e293b;
  border-radius: 12px;
  /* 新增科技感描边和发光效果 */
  border: 2px solid #38bdf8;
  box-shadow: 0 0 24px 4px #38bdf8, 0 8px 32px rgba(14,165,233,0.25);
  padding: 32px 28px 20px 28px;
  min-width: 320px;
  max-width: 90vw;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.dialog-title {
  font-size: 20px;
  font-weight: bold;
  color: #0ea5e9;
  margin-bottom: 10px;
  text-align: center;
}
.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.dialog-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.dialog-row label {
  min-width: 60px;
  color: #94a3b8;
}
.lang-select {
  flex: 1;
  padding: 8px 12px;
  background: #0f172a;
  border: 1px solid #0ea5e9;
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 15px;
}
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 10px;
}
.dialog-btn {
  min-width: 70px;
  padding: 7px 0;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s;
}
.dialog-btn.confirm {
  background: #0ea5e9;
  color: #fff;
}
.dialog-btn.confirm:hover {
  background: #38bdf8;
}
.dialog-btn.cancel {
  background: #334155;
  color: #e2e8f0;
}
.dialog-btn.cancel:hover {
  background: #64748b;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .content-section {
    flex-direction: column;
  }

  .transcription-panel, .control-panel, .summary-panel {
    flex: none;
  }

  .control-panel {
    padding: 15px 0;
  }

  .buttons-container {
    flex-direction: row;
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .buttons-container {
    flex-direction: column;
  }
}
</style>