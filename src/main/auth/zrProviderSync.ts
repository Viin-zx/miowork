import type { MioModelConfig } from './authService'
import type { AuthService } from './authService'
import type { LLM_PROVIDER } from '@shared/types/provider'

/** zr provider 的固定 id，同时用 id 和 name 查找/创建 */
export const ZR_PROVIDER_ID = 'zr-mioagent'
export const ZR_PROVIDER_NAME = 'zr'

/** 需要从 AuthService 拿到的最小接口 */
export interface ZrProviderAuthPort {
  isAuthenticated(): boolean
  getCachedModelConfig(): MioModelConfig | null
  modelConfigNeedsRefresh(force?: boolean): boolean
  fetchModelConfig(force?: boolean): Promise<MioModelConfig | null>
}

/**
 * provider 写入端口。必须传 ProviderRuntime（而非 ProviderSettings），
 * 因为只有运行时版本会在 apiKey/baseUrl 变更时重建 provider 实例，
 * 否则内存中的旧实例会继续使用上一个账号的凭据。
 */
export interface ZrProviderStorePort {
  getProviders(): LLM_PROVIDER[]
  updateProviderAtomic(id: string, updates: Partial<LLM_PROVIDER>): boolean
  addProviderAtomic(provider: LLM_PROVIDER): void
}

/**
 * 将 mioagent 后端返回的模型网关配置同步到本地 SQLite 的 zr 自定义 provider。
 * 启动时/登录成功后调用；内部会根据 expiresAt + credentialVersion 判断是否需要重拉。
 */
export async function syncZrProvider(
  auth: AuthService | ZrProviderAuthPort,
  providerStore: ZrProviderStorePort,
  options: {
    force?: boolean
    /** provider 首次创建后触发的回调（如刷新模型列表） */
    onProviderCreated?: (providerId: string) => void | Promise<void>
  } = {}
): Promise<{ ok: boolean; reason?: string; providerId?: string }> {
  if (!auth.isAuthenticated()) {
    return { ok: false, reason: 'not-authenticated' }
  }

  // 1. 拿配置：缓存可用直接用，否则 fetch
  let config = auth.getCachedModelConfig()
  if (options.force || auth.modelConfigNeedsRefresh(options.force)) {
    config = await auth.fetchModelConfig(options.force)
  }
  if (!config) {
    return { ok: false, reason: 'no-model-config' }
  }

  // 2. 找现有 zr provider：优先按固定 id，其次按 name='zr'
  const providers = providerStore.getProviders()
  const existing =
    providers.find((p) => p.id === ZR_PROVIDER_ID) ??
    providers.find((p) => p.name.toLowerCase() === ZR_PROVIDER_NAME.toLowerCase())

  if (existing) {
    // 3a. 更新已有 provider：只改 apiKey / baseUrl，保留用户其他设置。
    // 走运行时 update 会触发实例重建，确保新账号的 apiKey 立即生效。
    providerStore.updateProviderAtomic(existing.id, {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl
    })
    return { ok: true, providerId: existing.id }
  }

  // 3b. 创建新 provider
  const newProvider: LLM_PROVIDER = {
    id: ZR_PROVIDER_ID,
    name: ZR_PROVIDER_NAME,
    apiType: 'openai',
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    custom: true,
    enable: true
  }
  providerStore.addProviderAtomic(newProvider)

  // 首次创建后触发模型刷新
  if (options.onProviderCreated) {
    try {
      console.info('[ZrProvider] 首次创建，自动刷新模型列表...')
      await options.onProviderCreated(ZR_PROVIDER_ID)
    } catch (e) {
      console.warn('[ZrProvider] 自动刷新模型失败:', e)
    }
  }

  return { ok: true, providerId: ZR_PROVIDER_ID }
}
