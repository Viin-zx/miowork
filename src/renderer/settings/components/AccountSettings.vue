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

      <!-- 当前套餐卡片（预留信息位） -->
      <div
        class="rounded-xl border border-border/80 bg-card/70 p-5 shadow-sm"
        data-testid="settings-account-plan"
      >
        <div class="flex items-center gap-2">
          <Icon icon="lucide:gem" class="size-4 text-primary" />
          <span class="text-sm font-semibold">{{ t('account.planSection') }}</span>
          <Badge variant="outline" class="ml-1">{{ t('account.planFree') }}</Badge>
        </div>
        <p class="mt-3 text-sm text-muted-foreground">
          {{ t('account.planReserved') }}
        </p>
        <!-- 预留：套餐详情（额度、有效期等）后续接入后端后展示 -->
        <div class="mt-4 flex justify-end">
          <DcButton
            size="sm"
            data-testid="settings-account-upgrade"
            @click="showSubscription = true"
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

        <!-- 套餐档位选择 -->
        <div class="flex justify-center gap-1 rounded-lg bg-muted/60 p-1">
          <button
            v-for="tier in tiers"
            :key="tier.key"
            type="button"
            :class="[
              'flex-1 rounded-md px-3 py-1.5 text-sm transition-colors',
              selectedTier === tier.key
                ? 'bg-background font-medium text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            ]"
            @click="selectTier(tier.key)"
          >
            {{ tier.label }}
          </button>
        </div>

        <!-- 计费周期选择 -->
        <div v-if="selectedTier !== 'free'" class="grid grid-cols-4 gap-2">
          <button
            v-for="(option, index) in billingOptions"
            :key="option.key"
            type="button"
            :class="[
              'flex flex-col items-center gap-0.5 rounded-lg border px-2 py-3 transition-colors',
              selectedBilling === option.key
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border hover:border-primary/40'
            ]"
            @click="selectedBilling = option.key"
          >
            <span v-if="option.continuous" class="text-[10px] font-medium text-primary">
              {{ t('account.billingContinuousPrefix') }}
            </span>
            <span class="text-xs text-muted-foreground">{{ option.label }}</span>
            <span class="text-lg font-bold">¥{{ option.price }}</span>
            <span class="text-[10px] text-muted-foreground">{{ option.suffix }}</span>
            <span v-if="index === 0" class="mt-0.5 text-[10px] text-primary">
              {{ t('account.billingRecommended') }}
            </span>
          </button>
        </div>

        <!-- 权益列表 -->
        <div class="max-h-52 overflow-y-auto rounded-lg border border-border/60 p-4">
          <p class="mb-2 text-xs font-medium text-muted-foreground">
            {{ selectedTierBenefitsTitle }}
          </p>
          <ul class="flex flex-col gap-2">
            <li
              v-for="benefit in currentBenefits"
              :key="benefit.key"
              class="flex items-center gap-2 text-sm"
            >
              <Icon
                :icon="benefit.enabled ? 'lucide:check' : 'lucide:minus'"
                :class="[
                  'size-3.5 shrink-0',
                  benefit.enabled ? 'text-primary' : 'text-muted-foreground/40'
                ]"
              />
              <span :class="benefit.enabled ? '' : 'text-muted-foreground/60'">
                {{ benefit.label }}
              </span>
            </li>
          </ul>
        </div>

        <p v-if="upgradeNotice" class="text-center text-xs text-primary">
          {{ t('account.upgradeNotice') }}
        </p>

        <DialogFooter>
          <DcButton
            v-if="selectedTier !== 'free'"
            class="w-full"
            :disabled="selectedTier === null"
            @click="handleUpgrade"
          >
            {{ t('account.upgradeNow') }}
          </DcButton>
          <p v-else class="w-full text-center text-xs text-muted-foreground">
            {{ t('account.freeTierHint') }}
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </SettingsPageShell>
</template>

<script setup lang="ts">
import { createAuthClient, type AuthUser } from '@api/AuthClient'
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

type TierKey = 'free' | 'standard' | 'plus' | 'advanced'
type BillingKey = 'continuous-monthly' | 'continuous-yearly' | 'monthly' | 'yearly'

const { t } = useI18n()
const authClient = createAuthClient()
const windowClient = createWindowClient()

const loading = ref(true)
const loggingOut = ref(false)
const user = ref<AuthUser | null>(null)
const confirmAction = ref<'logout' | 'switch' | null>(null)

// 订阅弹窗状态（占位数据，待接入后端套餐/支付接口后替换）
const showSubscription = ref(false)
const upgradeNotice = ref(false)
const selectedTier = ref<TierKey>('standard')
const selectedBilling = ref<BillingKey>('continuous-monthly')

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

const tiers = computed(() => [
  { key: 'free' as TierKey, label: t('account.tierFree') },
  { key: 'standard' as TierKey, label: t('account.tierStandard') },
  { key: 'plus' as TierKey, label: t('account.tierPlus') },
  { key: 'advanced' as TierKey, label: t('account.tierAdvanced') }
])

const billingOptions = computed(() => [
  {
    key: 'continuous-monthly' as BillingKey,
    label: t('account.billingMonthly'),
    suffix: t('account.perMonth'),
    price: '68',
    continuous: true
  },
  {
    key: 'continuous-yearly' as BillingKey,
    label: t('account.billingYearly'),
    suffix: t('account.perYear'),
    price: '688',
    continuous: true
  },
  {
    key: 'monthly' as BillingKey,
    label: t('account.billingSingleMonth'),
    suffix: t('account.perMonth'),
    price: '80',
    continuous: false
  },
  {
    key: 'yearly' as BillingKey,
    label: t('account.billingSingleYear'),
    suffix: t('account.perYear'),
    price: '828',
    continuous: false
  }
])

interface Benefit {
  key: string
  label: string
  enabled: boolean
}

const selectedTierBenefitsTitle = computed(() =>
  selectedTier.value === 'free'
    ? t('account.benefitsFreeTitle')
    : t('account.benefitsPaidTitle', {
        tier: tiers.value.find((tier) => tier.key === selectedTier.value)?.label ?? ''
      })
)

const currentBenefits = computed<Benefit[]>(() => {
  const all = [
    { key: 'basic', label: t('account.benefitBasic'), minTier: 0 },
    { key: 'priority', label: t('account.benefitPriority'), minTier: 1 },
    { key: 'quota5x', label: t('account.benefitQuota5x'), minTier: 1 },
    { key: 'proModel', label: t('account.benefitProModel'), minTier: 2 },
    { key: 'scheduled', label: t('account.benefitScheduled'), minTier: 2 },
    { key: 'docs', label: t('account.benefitDocs'), minTier: 3 },
    { key: 'records', label: t('account.benefitRecords'), minTier: 3 },
    { key: 'other', label: t('account.benefitOther'), minTier: 3 }
  ]
  const tierLevel: Record<TierKey, number> = {
    free: 0,
    standard: 1,
    plus: 2,
    advanced: 3
  }
  const level = tierLevel[selectedTier.value]
  return all.map((benefit) => ({
    key: benefit.key,
    label: benefit.label,
    enabled: level >= benefit.minTier
  }))
})

function selectTier(key: TierKey) {
  selectedTier.value = key
  upgradeNotice.value = false
}

function handleUpgrade() {
  // 占位：支付渠道接入后替换为真实下单流程
  upgradeNotice.value = true
}

async function doLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    // 主进程会清除会话并重载其他窗口（主窗口回到登录页）
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
    // 忽略：静默回退到登录时缓存的资料
  }
})
</script>
