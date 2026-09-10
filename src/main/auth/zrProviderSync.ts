import type { MioModelConfig } from './authService'
import type { AuthService } from './authService'
import type { ProviderSettingsPort } from '../provider/settings'
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
 * 将 mioagent 后端返回的模型网关配置同步到本地 SQLite 的 zr 自定义 provider。
 * 启动时/登录成功后调用；内部会根据 expiresAt + credentialVersion 判断是否需要重拉。
 */
export async function syncZrProvider(
  auth: AuthService | ZrProviderAuthPort,
  providerSettings: ProviderSettingsPort,
  options: { force?: boolean } = {}
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
  let existing = providerSettings.getProviderById(ZR_PROVIDER_ID)
  if (!existing) {
    existing = providerSettings
      .getProviders()
      .find((p) => p.name.toLowerCase() === ZR_PROVIDER_NAME.toLowerCase())
  }

  if (existing) {
    // 3a. 更新已有 provider：只改 apiKey / baseUrl，保留用户其他设置
    providerSettings.updateProviderAtomic(existing.id, {
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
  providerSettings.addProviderAtomic(newProvider)
  return { ok: true, providerId: ZR_PROVIDER_ID }
}
