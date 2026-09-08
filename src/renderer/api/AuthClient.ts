import type { DeepchatBridge } from '@shared/contracts/bridge'
import { authGetStatusRoute, authLoginRoute } from '@shared/contracts/routes'
import { getDeepchatBridge } from './core'

export function createAuthClient(bridge: DeepchatBridge = getDeepchatBridge()) {
  async function getStatus() {
    const result = await bridge.invoke(authGetStatusRoute.name, {})
    return result.authenticated
  }

  async function login(username: string, password: string) {
    const result = await bridge.invoke(authLoginRoute.name, { username, password })
    return result.ok
  }

  return {
    getStatus,
    login
  }
}

export type AuthClient = ReturnType<typeof createAuthClient>
