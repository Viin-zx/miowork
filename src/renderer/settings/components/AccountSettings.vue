<template>
  <SettingsPageShell
    :title="t('routes.settings-account')"
    :eyebrow="t('settings.controlCenter.groups.overview')"
    data-testid="settings-account-page"
  >
    <div v-if="loading" class="flex items-center gap-2 py-16 text-sm text-muted-foreground">
      <Spinner class="size-4" />
      {{ t('account.loading') }}
    </div>

    <div v-else class="flex w-full max-w-2xl flex-col gap-4">
      <!-- 账号信息卡片 -->
      <div
        class="rounded-xl border border-border/80 bg-card/70 p-5 shadow-sm"
        data-testid="settings-account-card"
      >
        <div class="flex items-center gap-4">
          <Avatar class="size-14 border border-border/60">
            <AvatarFallback class="bg-primary/10 text-lg font-semibold text-primary">
              {{ avatarInitial }}
            </AvatarFallback>
          </Avatar>
          <div class="min-w-0 flex-1">
            <div class="truncate text-base font-semibold">
              {{ displayName }}
            </div>
            <div class="truncate text-sm text-muted-foreground">
              {{ user?.maskedPhone || t('account.notSet') }}
            </div>
          </div>
          <Badge v-if="accountActive" variant="secondary" class="shrink-0">
            {{ t('account.statusActive') }}
          </Badge>
        </div>

        <Separator class="my-4" />

        <div class="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-2 text-sm">
          <span class="text-muted-foreground">{{ t('account.nickname') }}</span>
          <span class="min-w-0 truncate">{{ user?.nickname || t('account.notSet') }}</span>
          <span class="text-muted-foreground">{{ t('account.phone') }}</span>
          <span class="min-w-0 truncate">{{ displayPhone }}</span>
          <span class="text-muted-foreground">{{ t('account.userId') }}</span>
          <span class="min-w-0 truncate font-mono text-xs">
            {{ user?.userId || t('account.notSet') }}
          </span>
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <DcButton
            variant="outline"
            size="sm"
            :disabled="loggingOut"
            data-testid="settings-account-switch"
            @click="confirmAction = 'switch'"
          >
            <Icon icon="lucide:repeat" class="mr-1 size-3.5" data-icon="inline-start" />
            {{ t('account.switchAccount') }}
          </DcButton>
          <DcButton
            variant="outline"
            size="sm"
            class="text-destructive hover:text-destructive"
            :disabled="loggingOut"
            data-testid="settings-account-logout"
            @click="confirmAction = 'logout'"
          >
            <Icon icon="lucide:log-out" class="mr-1 size-3.5" data-icon="inline-start" />
            {{ t('account.logout') }}
          </DcButton>
        </div>
      </div>

      <!-- 当前套餐卡片 -->
      <div
        class="rounded-xl border border-border/80 bg-card/70 p-5 shadow-sm"
        data-testid="settings-account-plan"
      >
        <div class="flex items-center gap-2">
          <Icon icon="lucide:gem" class="size-4 text-primary" />
          <span class="text-sm font-semibold">{{ t('account.planSection') }}</span>
          <Badge variant="outline" class="ml-1">
            {{ activeSubscription ? activeSubscription.planName : t('account.planFree') }}
          </Badge>
        </div>

        <!-- 有订阅：展示详情 -->
        <div v-if="activeSubscription" class="mt-3 space-y-2 text-sm">
          <div class="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-1.5">
            <span class="text-muted-foreground">{{ t('account.subQuotaTotal') }}</span>
            <span>{{ formatNumber(activeSubscription.amountTotal) }}</span>
            <span class="text-muted-foreground">{{ t('account.subQuotaUsed') }}</span>
            <span>{{ formatNumber(activeSubscription.amountUsed) }}</span>
            <span class="text-muted-foreground">{{ t('account.subRemaining') }}</span>
            <span class="font-medium text-primary">
              {{ formatNumber(activeSubscription.amountTotal - activeSubscription.amountUsed) }}
            </span>
            <span class="text-muted-foreground">{{ t('account.subStartTime') }}</span>
            <span>{{ formatDate(activeSubscription.startTime) }}</span>
            <span class="text-muted-foreground">{{ t('account.subEndTime') }}</span>
            <span>{{ formatDate(activeSubscription.endTime) }}</span>
            <span class="text-muted-foreground">{{ t('account.subStatus') }}</span>
            <span class="flex items-center gap-1">
              <span
                :class="[
                  'inline-block size-1.5 rounded-full',
                  activeSubscription.status === 'active' ? 'bg-green-500' : 'bg-muted-foreground'
                ]"
              />
              {{ activeSubscription.status }}
            </span>
          </div>
          <p v-if="!subscriptionsRealtime" class="text-xs text-muted-foreground">
            {{ t('account.subDataDelayed') }}
          </p>
        </div>

        <!-- 无订阅 -->
        <p v-else class="mt-3 text-sm text-muted-foreground">
          {{ t('account.planNoSubscription') }}
        </p>

        <div class="mt-4 flex justify-end">
          <DcButton
            size="sm"
            data-testid="settings-account-upgrade"
            @click="openSubscription"
          >
            <Icon icon="lucide:arrow-up-circle" class="mr-1 size-3.5" data-icon="inline-start" />
            {{ t('account.upgradeButton') }}
          </DcButton>
        </div>
      </div>
    </div>

    <!-- 退出/切换账号确认 -->
    <AlertDialog
      :open="confirmAction !== null"
      @update:open="(open: boolean) => !open && (confirmAction = null)"
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {{
              confirmAction === 'switch'
                ? t('account.switchConfirmTitle')
                : t('account.logoutConfirmTitle')
            }}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {{
              confirmAction === 'switch'
                ? t('account.switchConfirmDescription')
                : t('account.logoutConfirmDescription')
            }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ t('account.cancel') }}</AlertDialogCancel>
          <AlertDialogAsyncAction variant="destructive" :disabled="loggingOut" @click="doLogout">
            <Spinner v-if="loggingOut" class="mr-1 size-3" />
            {{ t('account.confirmLogout') }}
          </AlertDialogAsyncAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- 订阅/升级套餐弹窗 -->
    <Dialog :open="showSubscription" @update:open="showSubscription = $event">
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>{{ t('account.subscriptionTitle') }}</DialogTitle>
          <DialogDescription>{{ t('account.subscriptionDescription') }}</DialogDescription>
        </DialogHeader>

        <!-- 套餐列表 -->
        <div v-if="plansLoading" class="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Spinner class="size-4" />
          {{ t('account.plansLoading') }}
        </div>

        <div v-else-if="plans.length === 0" class="py-8 text-center text-sm text-muted-foreground">
          {{ t('account.plansEmpty') }}
        </div>

        <div v-else class="flex flex-col gap-2">
          <button
            v-for="plan in plans"
            :key="plan.planId"
            type="button"
            :class="[
              'flex items-center justify-between rounded-lg border px-4 py-3 transition-colors text-left',
              selectedPlanId === plan.planId
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border hover:border-primary/40'
            ]"
            @click="selectedPlanId = plan.planId"
          >
            <div class="min-w-0">
              <div class="truncate text-sm font-medium">{{ plan.planName }}</div>
              <div class="mt-0.5 text-xs text-muted-foreground">
                {{ t('account.planQuota') }}: {{ formatNumber(plan.quota) }}
                · {{ t('account.planDuration') }}: {{ plan.durationValue }}{{ plan.durationUnit }}
              </div>
            </div>
            <div class="ml-3 shrink-0 text-right">
              <span class="text-lg font-bold">¥{{ plan.price }}</span>
              <span class="text-xs text-muted-foreground">{{ plan.currency }}</span>
            </div>
          </button>
        </div>

        <!-- 购买结果 -->
        <div v-if="purchaseResult" class="rounded-lg border border-border/60 p-4">
          <p v-if="purchaseResult.ok" class="text-sm">
            <Icon icon="lucide:check-circle" class="mr-1 inline size-4 text-green-500" />
            {{ t('account.purchaseSuccess') }}
            <span v-if="purchaseResult.orderNo" class="ml-2 font-mono text-xs text-muted-foreground">
              {{ purchaseResult.orderNo }}
            </span>
          </p>
          <p v-else class="text-sm text-destructive">
            {{ purchaseResult.msg || t('account.purchaseFailed') }}
          </p>
        </div>

        <p v-if="purchaseNotice" class="text-center text-xs text-primary">
          {{ purchaseNotice }}
        </p>

        <DialogFooter>
          <DcButton
            class="w-full"
            :disabled="selectedPlanId === null || purchasing"
            @click="handlePurchase"
          >
            <Spinner v-if="purchasing" class="mr-1 size-3" />
            {{ purchasing ? t('account.purchasing') : t('account.upgradeNow') }}
          </DcButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </SettingsPageShell>
</template>

<script setup lang="ts">
import { createAuthClient, type AuthUser, type Plan, type Subscription } from '@api/AuthClient'
import { createWindowClient } from '@api/WindowClient'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { DcButton } from '@dc-ui/components/button'
import { Icon } from '@iconify/vue'
import { Avatar, AvatarFallback } from '@shadcn/components/ui/avatar'
import { Badge } from '@shadcn/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAsyncAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@shadcn/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@shadcn/components/ui/dialog'
import { Separator } from '@shadcn/components/ui/separator'
import { Spinner } from '@shadcn/components/ui/spinner'
import SettingsPageShell from './control-center/SettingsPageShell.vue'

const { t } = useI18n()
const authClient = createAuthClient()
const windowClient = createWindowClient()

const loading = ref(true)
const loggingOut = ref(false)
const user = ref<AuthUser | null>(null)
const confirmAction = ref<'logout' | 'switch' | null>(null)

// 订阅状态
const subscriptions = ref<Subscription[]>([])
const subscriptionsRealtime = ref(true)
const showSubscription = ref(false)
const plans = ref<Plan[]>([])
const plansLoading = ref(false)
const selectedPlanId = ref<number | null>(null)
const purchasing = ref(false)
const purchaseResult = ref<{
  ok: boolean
  msg?: string
  orderNo?: string
  grantStatus?: string
} | null>(null)
const purchaseNotice = ref('')

const activeSubscription = computed(
  () => subscriptions.value.find((s) => s.status === 'active') ?? null
)

const accountActive = computed(
  () => !user.value?.accountStatus || user.value.accountStatus === 'ACTIVE'
)
const displayName = computed(
  () => user.value?.nickname || user.value?.maskedPhone || t('account.notSet')
)
const displayPhone = computed(
  () => user.value?.mobile || user.value?.maskedPhone || t('account.notSet')
)
const avatarInitial = computed(() => {
  const name = displayName.value.trim()
  return name ? name.slice(0, 1).toUpperCase() : '?'
})

function formatNumber(n: number): string {
  return n.toLocaleString()
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

async function openSubscription() {
  showSubscription.value = true
  purchaseResult.value = null
  purchaseNotice.value = ''
  await loadPlans()
}

async function loadPlans() {
  plansLoading.value = true
  try {
    const result = await authClient.getPlans()
    if (result.ok && result.plans) {
      plans.value = result.plans
      if (plans.value.length > 0 && selectedPlanId.value === null) {
        selectedPlanId.value = plans.value[0]!.planId
      }
    } else {
      plans.value = []
    }
  } catch {
    plans.value = []
  } finally {
    plansLoading.value = false
  }
}

async function loadSubscriptions() {
  try {
    const result = await authClient.getSubscriptions()
    if (result.ok && result.items) {
      subscriptions.value = result.items
      subscriptionsRealtime.value = result.realtime ?? true
    }
  } catch {
    // 静默失败，保留旧数据
  }
}

async function handlePurchase() {
  if (selectedPlanId.value === null || purchasing.value) return
  purchasing.value = true
  purchaseResult.value = null
  purchaseNotice.value = ''
  const planId = selectedPlanId.value
  const requestId = `purchase_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  try {
    const result = await authClient.purchasePlan(planId, requestId)
    purchaseResult.value = result
    if (result.ok) {
      if (result.grantStatus === 'ACTIVE') {
        await loadSubscriptions()
      } else if (result.grantStatus === 'PENDING' || result.grantStatus === 'PROCESSING') {
        purchaseNotice.value = t('account.purchaseProcessing')
      }
    }
  } catch (error) {
    purchaseResult.value = { ok: false, msg: String(error) }
  } finally {
    purchasing.value = false
  }
}

async function doLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await authClient.logout()
    await windowClient.closeSettings()
  } catch (error) {
    console.error('[AccountSettings] Logout failed:', error)
    loggingOut.value = false
    confirmAction.value = null
  }
}

onMounted(async () => {
  try {
    const result = await authClient.getAccount()
    user.value = result.authenticated ? result.user : null
  } catch (error) {
    console.error('[AccountSettings] Failed to load account info:', error)
  } finally {
    loading.value = false
  }
  // 后台刷新最新资料（GET /users/me），失败时保留本地缓存
  try {
    const fresh = await authClient.getMe()
    if (fresh) {
      user.value = fresh
    }
  } catch {
    // 忽略
  }
  // 加载订阅信息
  await loadSubscriptions()
})
</script>
