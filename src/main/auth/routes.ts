import { authGetStatusRoute, authLoginRoute } from '@shared/contracts/routes'
import { createRouteMap, type DeepchatRouteMap } from '@/routes/routeRegistry'
import type { AuthService } from './authService'

export function createAuthRoutes(auth: AuthService): DeepchatRouteMap {
  return createRouteMap([
    [
      authGetStatusRoute.name,
      async (rawInput) => {
        authGetStatusRoute.input.parse(rawInput)
        return authGetStatusRoute.output.parse({ authenticated: auth.isAuthenticated() })
      }
    ],
    [
      authLoginRoute.name,
      async (rawInput) => {
        const input = authLoginRoute.input.parse(rawInput)
        const ok = auth.login(input.username, input.password)
        return authLoginRoute.output.parse({ ok })
      }
    ]
  ])
}
