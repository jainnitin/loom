// Runs before `npm run dev` / `npm run build` (via `predev` / `prebuild` in
// package.json). Tauri shells out to `cargo` to compile the desktop binary —
// `npm install` only fetches JS deps, so on a fresh clone without Rust the
// user gets a confusing failure deep inside Tauri. Fail fast with a clear
// fix instead.
const { execSync } = require('node:child_process')
const { platform } = require('node:process')

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
  const url = 'https://rustup.rs'
  const installCmd =
    platform === 'win32'
      ? `Download and run rustup-init.exe from ${url}`
      : `curl --proto '=https' --tlsv1.2 -sSf ${url} | sh`

  console.error('')
  console.error(`${yellow}${bold}Loom needs the Rust toolchain to build the desktop binary.${reset}`)
  console.error(`${dim}npm install only handles JS deps; Tauri compiles a native shell with cargo.${reset}`)
  console.error('')
  console.error(`Install once:`)
  console.error(`  ${bold}${installCmd}${reset}`)
  console.error('')
  console.error(`Then restart your shell and re-run ${bold}npm run dev${reset}.`)
  console.error('')
  process.exit(1)
}
