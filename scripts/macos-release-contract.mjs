export function isReleaseNotarizationEnabled(env = process.env) {
  return typeof env.build_for_release === 'string' && env.build_for_release.length > 0
}

export const APPLE_SIGNING_ENVIRONMENT_VARIABLES = [
  'CSC_LINK',
  'CSC_KEY_PASSWORD',
  'DEEPCHAT_APPLE_NOTARY_USERNAME',
  'DEEPCHAT_APPLE_NOTARY_TEAM_ID',
  'DEEPCHAT_APPLE_NOTARY_PASSWORD'
]

export function hasAppleSigningCredentials(env = process.env) {
  return APPLE_SIGNING_ENVIRONMENT_VARIABLES.some((name) => {
    const value = env[name]
    return typeof value === 'string' && value.length > 0
  })
}
