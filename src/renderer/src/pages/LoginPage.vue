<template>
  <div class="relative h-full w-full flex flex-col window-drag-region">
    <div class="flex-1 flex flex-col items-center justify-center px-6">
      <!-- Logo -->
      <div class="mb-5">
        <img src="@/assets/logo-dark.png" class="w-16 h-16" loading="lazy" />
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
          <div class="flex flex-col gap-2">
            <Label for="login-username" class="text-xs text-muted-foreground">
              {{ t('login.username') }}
            </Label>
            <Input
              id="login-username"
              ref="usernameInputRef"
              v-model="username"
              name="username"
              autocomplete="username"
              data-testid="login-username-input"
              required
            />
          </div>

          <div class="flex flex-col gap-2">
            <Label for="login-password" class="text-xs text-muted-foreground">
              {{ t('login.password') }}
            </Label>
            <Input
              id="login-password"
              v-model="password"
              name="password"
              type="password"
              autocomplete="current-password"
              data-testid="login-password-input"
              required
            />
          </div>

          <p v-if="errorMessage" data-testid="login-error" class="text-xs text-destructive">
            {{ errorMessage }}
          </p>

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
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@shadcn/components/ui/button'
import { Input } from '@shadcn/components/ui/input'
import { Label } from '@shadcn/components/ui/label'
import { Spinner } from '@shadcn/components/ui/spinner'
import { createAuthClient } from '@api/AuthClient'

const emit = defineEmits<{
  authenticated: []
}>()

const { t } = useI18n()

const authClient = createAuthClient()

const username = ref('')
const password = ref('')
const submitting = ref(false)
const errorMessage = ref('')
const usernameInputRef = ref<{ $el: HTMLInputElement } | null>(null)

onMounted(() => {
  usernameInputRef.value?.$el?.focus()
})

async function handleSubmit() {
  if (submitting.value) return
  submitting.value = true
  errorMessage.value = ''
  try {
    const ok = await authClient.login(username.value.trim(), password.value)
    if (ok) {
      emit('authenticated')
    } else {
      errorMessage.value = t('login.error')
    }
  } catch (error) {
    console.error('Login failed:', error)
    errorMessage.value = t('login.error')
  } finally {
    submitting.value = false
  }
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
