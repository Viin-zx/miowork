import type { AuthService, MioModelVo, MioModelParameters } from './authService'
import { ModelType } from '@shared/model'
import type { MODEL_META } from '@shared/types/provider'
import { ZR_PROVIDER_ID } from './zrProviderSync'

export { ZR_PROVIDER_ID }

/**
 * 将 MioModelVo.modelType 字符串映射为 ModelType 枚举
 */
function mapModelType(rawType: string): ModelType | undefined {
  switch (rawType) {
    case 'LANGUAGE':
      return ModelType.Chat
    case 'EMBEDDING':
      return ModelType.Embedding
    case 'RERANK':
      return ModelType.Rerank
    case 'IMAGE':
      return ModelType.ImageGeneration
    case 'VIDEO':
      return ModelType.VideoGeneration
    case 'TTS':
      return ModelType.TTS
    default:
      return undefined
  }
}

/**
 * 从 MioModelParameters 中提取能力（vision / functionCall / reasoning）
 */
function extractCapabilities(params: MioModelParameters | undefined): {
  vision: boolean
  functionCall: boolean
  reasoning: boolean
  contextLength?: number
  maxTokens?: number
} {
  return {
    vision: params?.visionEnabled ?? false,
    functionCall: params?.functionCallingEnabled ?? false,
    reasoning: params?.reasoningEnabled ?? false,
    contextLength: params?.contextWindowTokens,
    maxTokens: params?.maxOutputTokens
  }
}

/**
 * 将单个 MioModelVo 转换为 MODEL_META
 */
export function mioModelVoToMeta(vo: MioModelVo, providerId: string): MODEL_META {
  const caps = extractCapabilities(vo.parameters)
  const type = mapModelType(vo.modelType)
  return {
    id: vo.modelId,
    name: vo.displayName || vo.modelId,
    group: vo.providerName || 'default',
    providerId,
    type,
    contextLength: caps.contextLength,
    maxTokens: caps.maxTokens,
    vision: caps.vision,
    functionCall: caps.functionCall,
    reasoning: caps.reasoning
  }
}

/**
 * 将 MioModelVo[] 转换为 MODEL_META[]
 */
export function mioModelListToMetas(models: MioModelVo[], providerId: string): MODEL_META[] {
  return models.map((vo) => mioModelVoToMeta(vo, providerId))
}

/**
 * 通过 AuthService 拉取 /models 并更新 zr provider 的模型列表
 *
 * @param auth AuthService 实例
 * @param setProviderModels 写 provider 模型列表的函数
 * @param notifyModelsChanged 通知渲染层模型列表已变更的函数
 * @returns 模型列表，失败返回 null
 */
export async function refreshZrModels(
  auth: AuthService,
  setProviderModels: (providerId: string, models: MODEL_META[]) => void,
  notifyModelsChanged: (providerId?: string) => void,
  setModelsEnabled?: (providerId: string, modelIds: string[], enabled: boolean) => void
): Promise<MODEL_META[] | null> {
  if (!auth.isAuthenticated()) {
    console.warn('[ZrModels] 跳过刷新：未登录')
    return null
  }

  const models = await auth.fetchModels()
  if (!models || models.length === 0) {
    console.warn('[ZrModels] 获取模型列表为空')
    return null
  }

  // /mio/client/v1/models 返回的都是服务端已启用的模型，这里全部标记为开启
  if (setModelsEnabled) {
    setModelsEnabled(
      ZR_PROVIDER_ID,
      models.map((vo) => vo.modelId),
      true
    )
  }

  const metas = mioModelListToMetas(models, ZR_PROVIDER_ID)
  console.info(`[ZrModels] 转换 ${metas.length} 个模型 MODEL_META`)

  setProviderModels(ZR_PROVIDER_ID, metas)
  notifyModelsChanged(ZR_PROVIDER_ID)

  return metas
}
