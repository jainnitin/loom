#!/usr/bin/env ts-node

import { SessionFinder } from './src/utils/sessionFinder'
import { spawn } from 'child_process'
import * as path from 'path'

// Check CLAUDECODE environment variable
if (process.env.CLAUDECODE !== '1') {
  // If run outside Claude CLI, open app showing sessions for current project
  const currentProjectPath = process.cwd()
  const deepLink = `claude-viewer://open?projectPath=${encodeURIComponent(currentProjectPath)}`
  
  console.log(`Opening Claude Session Viewer for project: ${path.basename(currentProjectPath)}`)
  
  // Open deep link on macOS
  const openCommand = process.platform === 'darwin' ? 'open' : 
                     process.platform === 'win32' ? 'start' : 'xdg-open'
  
  const child = spawn(openCommand, [deepLink], {
    detached: true,
    stdio: 'ignore'
  })
  
  child.unref()
  
  // Allow time for app to open then exit
  setTimeout(() => {
    process.exit(0)
  }, 1000)
}

// Find session
const finder = new SessionFinder()
const sessionInfo = finder.findCurrentSession({ 
  keyword: 'claude-viewer',
  seconds: 30 
})

if (!sessionInfo) {
  console.error('No active Claude session found in current directory')
  console.log('Make sure you are in a directory with an active Claude session')
  process.exit(1)
}

// Generate deep link URL
const deepLink = `claude-viewer://open?sessionId=${encodeURIComponent(sessionInfo.sessionId)}&projectPath=${encodeURIComponent(sessionInfo.projectPath)}&jsonlFile=${encodeURIComponent(sessionInfo.jsonlFile)}`

console.log(`Opening Claude Session Viewer...`)
console.log(`Session ID: ${sessionInfo.sessionId}`)
console.log(`Project: ${path.basename(sessionInfo.projectPath)}`)

// Open deep link on macOS
const openCommand = process.platform === 'darwin' ? 'open' : 
                   process.platform === 'win32' ? 'start' : 'xdg-open'

const child = spawn(openCommand, [deepLink], {
  detached: true,
  stdio: 'ignore'
})

child.unref()

// Allow time for app to open then exit
setTimeout(() => {
  console.log('Claude Session Viewer should now be open with your session')
  process.exit(0)
}, 1000)