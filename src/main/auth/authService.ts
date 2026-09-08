export const DEFAULT_ADMIN_USERNAME = 'admin'
export const DEFAULT_ADMIN_PASSWORD = 'admin123'

/**
 * 内存态登录门禁：应用每次启动都需要重新登录。
 */
export class AuthService {
  private authenticated = false

  isAuthenticated(): boolean {
    return this.authenticated
  }

  login(username: string, password: string): boolean {
    if (username !== DEFAULT_ADMIN_USERNAME || password !== DEFAULT_ADMIN_PASSWORD) {
      return false
    }
    this.authenticated = true
    return true
  }
}
