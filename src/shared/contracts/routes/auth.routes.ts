import { z } from 'zod'
import { defineRouteContract } from '../common'

/** 短信验证码场景：注册 / 登录 */
export const smsSceneSchema = z.enum(['REGISTER', 'LOGIN'])

/** 当前登录用户信息（后端缺失字段会返回 null，因此均允许 null） */
export const authUserSchema = z.object({
  userId: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  maskedPhone: z.string().nullable().optional(),
  nickname: z.string().nullable().optional(),
  accountStatus: z.string().nullable().optional(),
  credentialStatus: z.string().nullable().optional()
})

export const authGetStatusRoute = defineRouteContract({
  name: 'auth.getStatus',
  input: z.object({}).default({}),
  output: z.object({
    authenticated: z.boolean(),
    user: authUserSchema.nullable().optional()
  })
})

/** 拉取最新用户资料（GET /users/me），失败时回退本地会话缓存 */
export const authGetMeRoute = defineRouteContract({
  name: 'auth.getMe',
  input: z.object({}).default({}),
  output: z.object({
    user: authUserSchema.nullable()
  })
})

/** 发送短信验证码 */
export const authSendCodeRoute = defineRouteContract({
  name: 'auth.sendCode',
  input: z.object({
    mobile: z.string().min(1),
    scene: smsSceneSchema
  }),
  output: z.object({
    ok: z.boolean(),
    smsRequestId: z.string().optional(),
    retryAfterSeconds: z.number().optional(),
    expiresIn: z.number().optional(),
    msg: z.string().optional()
  })
})

/** 手机号 + 密码登录 */
export const authLoginRoute = defineRouteContract({
  name: 'auth.login',
  input: z.object({
    mobile: z.string().min(1),
    password: z.string().min(1)
  }),
  output: z.object({
    ok: z.boolean(),
    msg: z.string().optional()
  })
})

/** 手机号 + 短信验证码登录 */
export const authLoginByCodeRoute = defineRouteContract({
  name: 'auth.loginByCode',
  input: z.object({
    mobile: z.string().min(1),
    smsRequestId: z.string().min(1),
    smsCode: z.string().min(1)
  }),
  output: z.object({
    ok: z.boolean(),
    msg: z.string().optional()
  })
})

/** 注册（成功即登录） */
export const authRegisterRoute = defineRouteContract({
  name: 'auth.register',
  input: z.object({
    mobile: z.string().min(1),
    password: z.string().min(1),
    smsRequestId: z.string().optional(),
    smsCode: z.string().optional(),
    nickname: z.string().optional()
  }),
  output: z.object({
    ok: z.boolean(),
    msg: z.string().optional()
  })
})

/** 退出登录 */
export const authLogoutRoute = defineRouteContract({
  name: 'auth.logout',
  input: z.object({}).default({}),
  output: z.object({
    ok: z.boolean()
  })
})
