// Runs before `npm run dev` / `npm run build` (via `predev` / `prebuild` in
// package.json). Tauri shells out to `cargo` to compile the desktop binary —
// `npm install` only fetches JS deps, so on a fresh clone without Rust the
// user gets a confusing failure deep inside Tauri. Fail fast with a clear
// fix instead.
const { execSync } = require('node:child_process')
const { platform, env } = require('node:process')
const { existsSync } = require('node:fs')
const { join } = require('node:path')
const { homedir } = require('node:os')

function has(cmd) {
  try {
    execSync(`${platform === 'win32' ? 'where' : 'command -v'} ${cmd}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

if (!has('cargo')) {
  const reset = '\x1b[0m'
  const dim = '\x1b[2m'
  const yellow = '\x1b[33m'
  const bold = '\x1b[1m'

  const cargoBin = join(homedir(), '.cargo', 'bin', platform === 'win32' ? 'cargo.exe' : 'cargo')
  const installedButNotOnPath = existsSync(cargoBin)

  console.error('')
  console.error(`${yellow}${bold}Loom needs the Rust toolchain to build the desktop binary.${reset}`)
  console.error(`${dim}npm install only handles JS deps; Tauri compiles a native shell with cargo.${reset}`)
  console.error('')

  if (installedButNotOnPath) {
    const isFish = (env.SHELL || '').endsWith('/fish')
    const sourceCmd = isFish ? `source "$HOME/.cargo/env.fish"` : `. "$HOME/.cargo/env"`
    console.error(`Rust is installed at ${cargoBin}, but not on this shell's PATH.`)
    console.error(`Activate it in this shell, then re-run:`)
    console.error(`  ${bold}${sourceCmd}${reset}`)
  } else if (platform === 'win32') {
    console.error(`Install once:`)
    console.error(`  ${bold}Download and run rustup-init.exe from https://rustup.rs${reset}`)
    console.error('')
    console.error(`Then open a new terminal and re-run ${bold}npm run dev${reset}.`)
  } else {
    console.error(`Install once:`)
    console.error(`  ${bold}brew install rust${reset}`)
  }

  console.error('')
  process.exit(1)
}
