import { ChildProcess, spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'
import { downloadServer } from 'minecraft-wrap'
import * as waitOn from 'wait-on'

let prevProcess: ChildProcess | null = null
export const startMinecraftServer = async (version: string, port: number) => {
  if (prevProcess) return null
  const jar = `./server-jar/${version}.jar`

  const start = () => {
    // if (prevProcess) {
    //   prevProcess.kill()
    // }

    prevProcess = spawn('java', ['-jar', path.basename(jar), 'nogui', '--port', `${port}`], {
      stdio: 'inherit',
      cwd: path.dirname(jar),
    })
  }

  let coldStart = false
  if (fs.existsSync(jar)) {
    start()
  } else {
    coldStart = true
    promisify(downloadServer)(version, jar).then(() => {
      // add eula.txt
      fs.writeFileSync(path.join(path.dirname(jar), 'eula.txt'), 'eula=true')
      // copy cypress/plugins/server.properties
      fs.copyFileSync(path.join(__dirname, 'server.properties'), path.join(path.dirname(jar), 'server.properties'))
      // copy ops.json
      fs.copyFileSync(path.join(__dirname, 'ops.json'), path.join(path.dirname(jar), 'ops.json'))
      start()
    })
  }

  return new Promise<null>((res) => {
    waitOn({ resources: [`tcp:localhost:${port}`] }, () => {
      setTimeout(() => res(null), coldStart ? 6500 : 2000) // todo retry instead of timeout
    })
  })
}
