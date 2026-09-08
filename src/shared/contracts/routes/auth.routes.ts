import { z } from 'zod'
import { defineRouteContract } from '../common'

export const authGetStatusRoute = defineRouteContract({
  name: 'auth.getStatus',
  input: z.object({}).default({}),
  output: z.object({
    authenticated: z.boolean()
  })
})

export const authLoginRoute = defineRouteContract({
  name: 'auth.login',
  input: z.object({
    username: z.string().min(1),
    password: z.string().min(1)
  }),
  output: z.object({
    ok: z.boolean()
  })
})
