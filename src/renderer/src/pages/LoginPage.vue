<template>
  <div class="relative h-full w-full flex flex-col window-drag-region">
    <div class="flex-1 flex flex-col items-center justify-center px-6">
      <!-- Logo -->
      <div class="mb-5">
        <img src="@/assets/logo.png" class="w-16 h-16" loading="lazy" />
      </div>

      <!-- Heading -->
      <h1 class="text-3xl font-semibold text-foreground mb-2">
        {{ t('login.title') }}
      </h1>
      <p class="text-sm text-muted-foreground text-center max-w-md mb-10">
        {{ t('login.description') }}
      </p>

      <!-- Login card -->
      <form
        data-testid="login-form"
        class="w-full max-w-sm rounded-2xl border border-border/70 bg-card/50 px-6 py-6 shadow-sm"
        @submit.prevent="handleSubmit"
      >
        <div class="flex flex-col gap-4">
          <!-- 手机号 -->
          <div class="flex flex-col gap-2">
            <Label for="login-phone" class="text-xs text-muted-foreground">
              {{ t('login.phone') }}
            </Label>
            <Input
              id="login-phone"
              v-model="phone"
              type="tel"
              maxlength="11"
              placeholder="请输入手机号"
              data-testid="login-phone-input"
              required
            />
          </div>

          <!-- 密码（密码模式） -->
          <div v-if="mode === 'password'" class="flex flex-col gap-2">
            <Label for="login-password" class="text-xs text-muted-foreground">
              {{ t('login.password') }}
            </Label>
            <Input
              id="login-password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              placeholder="请输入密码"
              data-testid="login-password-input"
              required
            />
          </div>

          <!-- 验证码（验证码模式） -->
          <div v-else class="flex flex-col gap-2">
            <Label for="login-code" class="text-xs text-muted-foreground">
              {{ t('login.code') }}
            </Label>
            <div class="flex gap-2">
              <Input
                id="login-code"
                v-model="code"
                maxlength="6"
                placeholder="请输入验证码"
                data-testid="login-code-input"
                class="flex-1"
                required
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="shrink-0"
                :disabled="countdown > 0 || sendingCode"
                @click="handleSendCode"
              >
                {{ countdown > 0 ? `${countdown}s` : t('login.getCode') }}
              </Button>
            </div>
          </div>

          <p v-if="errorMessage" data-testid="login-error" class="text-xs text-destructive">
            {{ errorMessage }}
          </p>

          <!-- 模式切换 -->
          <div class="flex items-center justify-between text-xs">
            <button type="button" class="text-primary hover:underline" @click="toggleMode">
              {{ mode === 'password' ? t('login.switchToCode') : t('login.switchToPassword') }}
            </button>
            <button type="button" class="text-muted-foreground hover:underline" @click="goRegister">
              {{ t('login.goRegister') }}
            </button>
          </div>

          <Button type="submit" class="w-full" data-testid="login-submit" :disabled="submitting">
            <Spinner v-if="submitting" class="h-4 w-4" />
            <span>{{ submitting ? t('login.submitting') : t('login.submit') }}</span>
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Button } from '@shadcn/components/ui/button'
import { Input } from '@shadcn/components/ui/input'
import { Label } from '@shadcn/components/ui/label'
import { Spinner } from '@shadcn/components/ui/spinner'
import { createAuthClient } from '@api/AuthClient'
import { setAuthState } from '@/router'

const emit = defineEmits<{
  authenticated: []
}>()

const { t } = useI18n()
const router = useRouter()
const authClient = createAuthClient()

type LoginMode = 'password' | 'code'
const mode = ref<LoginMode>('password')
const phone = ref('')
const password = ref('')
const code = ref('')
const smsRequestId = ref('')
const submitting = ref(false)
const sendingCode = ref(false)
const errorMessage = ref('')
const countdown = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  phone.value = ''
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function toggleMode() {
  mode.value = mode.value === 'password' ? 'code' : 'password'
  errorMessage.value = ''
  code.value = ''
  password.value = ''
  smsRequestId.value = ''
}

function startCountdown(seconds = 60) {
  countdown.value = seconds
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

async function handleSendCode() {
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    errorMessage.value = '请输入有效的手机号'
    return
  }
  sendingCode.value = true
  errorMessage.value = ''
  try {
    const result = await authClient.sendCode(phone.value, 'LOGIN')
    if (result.ok) {
      smsRequestId.value = result.smsRequestId ?? ''
      startCountdown(result.retryAfterSeconds ?? 60)
    } else {
      errorMessage.value = result.msg || '验证码发送失败'
    }
  } catch (error) {
    console.error('Send code failed:', error)
    errorMessage.value = '验证码发送失败，请重试'
  } finally {
    sendingCode.value = false
  }
}

async function handleSubmit() {
  if (submitting.value) return
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    errorMessage.value = '请输入有效的手机号'
    return
  }
  submitting.value = true
  errorMessage.value = ''
  try {
    let result: { ok: boolean; msg?: string }
    if (mode.value === 'password') {
      result = await authClient.login(phone.value, password.value)
    } else {
      if (!smsRequestId.value) {
        errorMessage.value = '请先获取验证码'
        submitting.value = false
        return
      }
      result = await authClient.loginByCode(phone.value, smsRequestId.value, code.value)
    }
    if (result.ok) {
      setAuthState(true)
      emit('authenticated')
      await router.replace({ name: 'chat' })
    } else {
      errorMessage.value = result.msg || t('login.error')
    }
  } catch (error) {
    console.error('Login failed:', error)
    errorMessage.value = t('login.error')
  } finally {
    submitting.value = false
  }
}

function goRegister() {
  router.push({ name: 'register' })
}
</script>

<style scoped>
.window-drag-region {
  -webkit-app-region: drag;
}

form,
button,
input {
  -webkit-app-region: no-drag;
}
</style>
