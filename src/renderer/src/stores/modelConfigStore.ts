import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ModelConfig, IModelConfig } from '@shared/types/provider'
import { createModelClient } from '../../api/ModelClient'

export const useModelConfigStore = defineStore('modelConfig', () => {
  const modelClient = createModelClient()

  const cache = ref<Record<string, ModelConfig>>({})

  const getCacheKey = (modelId: string, providerId?: string) =>
    `${providerId ?? 'default'}:${modelId}`

  // 主进程侧配置变更（含 zr-mioagent 接口同步 setModelConfig）后失效对应缓存，
  // 否则设置对话框会一直读到旧值，直到重新登录/重启清空内存缓存。
  modelClient.onModelConfigChanged(({ changeType, providerId, modelId }) => {
    if (changeType === 'imported') {
      cache.value = {}
      return
    }
    if (providerId && modelId) {
      delete cache.value[getCacheKey(modelId, providerId)]
    }
  })

  const getModelConfig = async (modelId: string, providerId?: string): Promise<ModelConfig> => {
    const key = getCacheKey(modelId, providerId)
    if (cache.value[key]) {
      return cache.value[key]
    }
    const config = await modelClient.getModelConfig(modelId, providerId)
    cache.value[key] = config
    return config
  }

  const setModelConfig = async (modelId: string, providerId: string, config: ModelConfig) => {
    await modelClient.setModelConfig(modelId, providerId, config)
    cache.value[getCacheKey(modelId, providerId)] = config
  }

  const resetModelConfig = async (modelId: string, providerId: string) => {
    await modelClient.resetModelConfig(modelId, providerId)
    delete cache.value[getCacheKey(modelId, providerId)]
  }

  const getProviderModelConfigs = async (providerId: string) => {
    return await modelClient.getProviderModelConfigs(providerId)
  }

  const hasUserModelConfig = async (modelId: string, providerId: string) => {
    return await modelClient.hasUserModelConfig(modelId, providerId)
  }

  const importConfigs = async (configs: Record<string, IModelConfig>, overwrite = false) => {
    await modelClient.importModelConfigs(configs, overwrite)
  }

  const exportConfigs = async () => {
    return await modelClient.exportModelConfigs()
  }

  return {
    getModelConfig,
    setModelConfig,
    resetModelConfig,
    getProviderModelConfigs,
    hasUserModelConfig,
    importConfigs,
    exportConfigs
  }
})
