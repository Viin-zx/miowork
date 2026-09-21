<template>
  <div class="relative h-full w-full flex flex-col window-drag-region">
    <div class="flex-1 flex flex-col items-center justify-center px-6">
      <!-- Logo -->
      <div class="mb-5">
        <img src="@/assets/logo.png" class="w-16 h-16" loading="lazy" />
      </div>

      <!-- Heading -->
      <h1 class="text-3xl font-semibold text-foreground mb-2">
        {{ t('register.title') }}
      </h1>
      <p class="text-sm text-muted-foreground text-center max-w-md mb-10">
        {{ t('register.description') }}
      </p>

      <!-- Register card -->
      <form
        data-testid="register-form"
        class="w-full max-w-sm rounded-2xl border border-border/70 bg-card/50 px-6 py-6 shadow-sm"
        @submit.prevent="handleSubmit"
      >
        <div class="flex flex-col gap-4">
          <!-- 手机号 -->
          <div class="flex flex-col gap-2">
            <Label for="reg-phone" class="text-xs text-muted-foreground">
              {{ t('register.phone') }}
            </Label>
            <Input
              id="reg-phone"
              v-model="phone"
              type="tel"
              maxlength="11"
              placeholder="请输入手机号"
              data-testid="register-phone-input"
              required
            />
          </div>

          <!-- 密码 -->
          <div class="flex flex-col gap-2">
            <Label for="reg-password" class="text-xs text-muted-foreground">
              {{ t('register.password') }}
            </Label>
            <Input
              id="reg-password"
              v-model="password"
              type="password"
              autocomplete="new-password"
              placeholder="请设置密码（至少8个字符）"
              data-testid="register-password-input"
              required
            />
          </div>

          <!-- 确认密码 -->
          <div class="flex flex-col gap-2">
            <Label for="reg-confirm" class="text-xs text-muted-foreground">
              {{ t('register.confirmPassword') }}
            </Label>
            <Input
              id="reg-confirm"
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              placeholder="请再次输入密码"
              data-testid="register-confirm-input"
              required
            />
          </div>

          <!-- 验证码 -->
          <div class="flex flex-col gap-2">
            <Label for="reg-code" class="text-xs text-muted-foreground">
              {{ t('register.code') }}
            </Label>
            <div class="flex gap-2">
              <Input
                id="reg-code"
                v-model="code"
                maxlength="6"
                placeholder="请输入验证码"
                data-testid="register-code-input"
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
                {{ countdown > 0 ? `${countdown}s` : t('register.getCode') }}
              </Button>
            </div>
          </div>

          <!-- 协议勾选 -->
          <div class="flex items-start gap-2">
            <Checkbox id="reg-agree" v-model:checked="agreed" class="mt-0.5" />
            <label for="reg-agree" class="text-xs text-muted-foreground leading-relaxed">
              {{ t('register.agreePrefix') }}
              <button
                type="button"
                class="text-primary hover:underline"
                @click="openAgreement('USER')"
              >
                {{ t('register.userAgreement') }}
              </button>
              {{ t('register.and') }}
              <button
                type="button"
                class="text-primary hover:underline"
                @click="openAgreement('PRIVACY')"
              >
                {{ t('register.privacyAgreement') }}
              </button>
            </label>
          </div>

          <p v-if="errorMessage" data-testid="register-error" class="text-xs text-destructive">
            {{ errorMessage }}
          </p>

          <Button type="submit" class="w-full" data-testid="register-submit" :disabled="submitting">
            <Spinner v-if="submitting" class="h-4 w-4" />
            <span>{{ submitting ? t('register.submitting') : t('register.submit') }}</span>
          </Button>

          <!-- 返回登录 -->
          <div class="text-center text-xs">
            <button type="button" class="text-muted-foreground hover:underline" @click="goLogin">
              {{ t('register.goLogin') }}
            </button>
          </div>
        </div>
      </form>
    </div>

    <!-- 协议弹窗（title 和 x 固定，只滚动内容） -->
    <Dialog v-model:open="showAgreement">
      <DialogContent class="max-w-2xl gap-0 p-0">
        <!-- 固定头部 -->
        <DialogHeader class="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle>{{ currentAgreementTitle }}</DialogTitle>
        </DialogHeader>
        <!-- 可滚动内容区 -->
        <div class="max-h-[70vh] overflow-y-auto px-6 py-4">
          <div
            class="prose prose-sm max-w-none text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline"
            v-html="currentAgreementContent"
          />
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Button } from '@shadcn/components/ui/button'
import { Input } from '@shadcn/components/ui/input'
import { Label } from '@shadcn/components/ui/label'
import { Spinner } from '@shadcn/components/ui/spinner'
import { Checkbox } from '@shadcn/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@shadcn/components/ui/dialog'
import { createAuthClient } from '@api/AuthClient'
import type { Agreement } from '@api/AuthClient'
import { setAuthState } from '@/router'

const emit = defineEmits<{
  authenticated: []
}>()

const { t } = useI18n()
const router = useRouter()
const authClient = createAuthClient()

const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const code = ref('')
const smsRequestId = ref('')
const agreed = ref(false)
const submitting = ref(false)
const sendingCode = ref(false)
const errorMessage = ref('')
const countdown = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

// ---- 协议数据 ----
const agreements = ref<Agreement[]>([])
const showAgreement = ref(false)
const activeAgreementType = ref<'USER' | 'PRIVACY' | 'SUBSCRIPTION'>('USER')

const agreementTitleMap: Record<string, string> = {
  USER: 'register.userAgreement',
  PRIVACY: 'register.privacyAgreement',
  SUBSCRIPTION: 'register.subscriptionAgreement'
}

const currentAgreement = computed(() =>
  agreements.value.find((a) => a.agreementType === activeAgreementType.value)
)

const currentAgreementTitle = computed(() => {
  const key = agreementTitleMap[activeAgreementType.value]
  return key ? t(key) : ''
})

const currentAgreementContent = computed(() => currentAgreement.value?.content ?? '')

function openAgreement(type: 'USER' | 'PRIVACY' | 'SUBSCRIPTION') {
  activeAgreementType.value = type
  showAgreement.value = true
}

onMounted(async () => {
  try {
    const result = await authClient.getAgreements()
    if (result.ok && result.agreements) {
      agreements.value = result.agreements
    }
  } catch (error) {
    console.error('Failed to load agreements:', error)
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

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
    const result = await authClient.sendCode(phone.value, 'REGISTER')
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
  if (password.value.length < 8) {
    errorMessage.value = '密码至少需要8个字符'
    return
  }
  if (password.value !== confirmPassword.value) {
    errorMessage.value = t('register.errorPasswordMismatch')
    return
  }
  if (!code.value) {
    errorMessage.value = '请输入验证码'
    return
  }
  if (!agreed.value) {
    errorMessage.value = t('register.errorNotAgreed')
    return
  }
  submitting.value = true
  errorMessage.value = ''
  try {
    const result = await authClient.register({
      mobile: phone.value,
      password: password.value,
      smsRequestId: smsRequestId.value || undefined,
      smsCode: code.value
    })
    if (result.ok) {
      setAuthState(true)
      emit('authenticated')
      await router.replace({ name: 'chat' })
    } else {
      errorMessage.value = result.msg || t('register.error')
    }
  } catch (error) {
    console.error('Register failed:', error)
    errorMessage.value = t('register.error')
  } finally {
    submitting.value = false
  }
}

function goLogin() {
  router.push({ name: 'login' })
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
