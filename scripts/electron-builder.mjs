#!/usr/bin/env node
/**
 * electron-builder 包装入口。
 *
 * 默认把 Electron 本体与 electron-builder 辅助二进制（winCodeSign / nsis 等）的
 * 下载源指向 npmmirror 国内镜像，解决打包阶段回源 GitHub Releases 超时
 * （connect ETIMEDOUT … github.com 下载 CDN）的问题。
 *
 * 仅在用户未显式设置对应环境变量时注入默认值，因此 CI 或海外环境可用
 * ELECTRON_MIRROR / ELECTRON_BUILDER_BINARIES_MIRROR 覆盖或置空，不影响其网络策略。
 */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)

const electronBuilderPkgPath = require.resolve('electron-builder/package.json')
const electronBuilderPkg = require(electronBuilderPkgPath)
const binField = electronBuilderPkg.bin
const binRelative =
  typeof binField === 'string'
    ? binField
    : (binField?.['electron-builder'] ?? Object.values(binField ?? {})[0])

if (!binRelative) {
  console.error('[electron-builder wrapper] 无法解析 electron-builder 可执行入口。')
  process.exit(1)
}

const electronBuilderCli = path.join(path.dirname(electronBuilderPkgPath), binRelative)

process.env.ELECTRON_MIRROR ??= 'https://npmmirror.com/mirrors/electron/'
process.env.ELECTRON_BUILDER_BINARIES_MIRROR ??=
  'https://npmmirror.com/mirrors/electron-builder-binaries/'

const result = spawnSync(process.execPath, [electronBuilderCli, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env
})

process.exit(result.status ?? 1)
