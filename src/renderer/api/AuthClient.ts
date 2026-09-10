import type { DeepchatBridge } from '@shared/contracts/bridge'
import {
  authGetStatusRoute,
  authGetMeRoute,
  authLoginRoute,
  authLoginByCodeRoute,
  authRegisterRoute,
  authSendCodeRoute,
  authLogoutRoute,
  type authUserSchema
} from '@shared/contracts/routes'
import type { z } from 'zod'
import { getDeepchatBridge } from './core'

/** 短信验证码场景 */
export type SmsScene = 'REGISTER' | 'LOGIN'

/** 当前登录用户信息 */
export type AuthUser = z.output<typeof authUserSchema>

export function createAuthClient(bridge: DeepchatBridge = getDeepchatBridge()) {
  async function getStatus(): Promise<boolean> {
    const result = await bridge.invoke(authGetStatusRoute.name, {})
    return result.authenticated
  }

  /** 获取登录状态与当前用户信息 */
  async function getAccount(): Promise<{ authenticated: boolean; user: AuthUser | null }> {
    const result = await bridge.invoke(authGetStatusRoute.name, {})
    return { authenticated: result.authenticated, user: result.user ?? null }
  }

  /** 拉取最新用户资料（GET /users/me），失败时回退本地缓存 */
  async function getMe(): Promise<AuthUser | null> {
    const result = await bridge.invoke(authGetMeRoute.name, {})
    return result.user ?? null
  }

  /** 发送短信验证码，返回 smsRequestId 供注册/短信登录使用 */
  async function sendCode(mobile: string, scene: SmsScene) {
    return await bridge.invoke(authSendCodeRoute.name, { mobile, scene })
  }

  /** 手机号 + 密码登录 */
  async function login(mobile: string, password: string) {
    return await bridge.invoke(authLoginRoute.name, { mobile, password })
  }

  /** 手机号 + 短信验证码登录 */
  async function loginByCode(mobile: string, smsRequestId: string, smsCode: string) {
    return await bridge.invoke(authLoginByCodeRoute.name, { mobile, smsRequestId, smsCode })
  }

  /** 注册（成功即登录） */
  async function register(input: {
    mobile: string
    password: string
    smsRequestId?: string
    smsCode?: string
    nickname?: string
  }) {
    return await bridge.invoke(authRegisterRoute.name, input)
  }

  async function logout(): Promise<boolean> {
    const result = await bridge.invoke(authLogoutRoute.name, {})
    return result.ok
  }

  return {
    getStatus,
    getAccount,
    getMe,
    sendCode,
    login,
    loginByCode,
    register,
    logout
  }
}

export type AuthClient = ReturnType<typeof createAuthClient>
