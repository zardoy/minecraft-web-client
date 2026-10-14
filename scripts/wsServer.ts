import {WebSocketServer} from 'ws'

export function startWsServer(port: number = 8081, tryOtherPort: boolean = true): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryPort = (currentPort: number) => {
      const wss = new WebSocketServer({ port: currentPort })
        .on('listening', () => {
          console.log(`WebSocket server started on port ${currentPort}`)
          resolve(currentPort)
        })
        .on('error', (err: any) => {
          if (err.code === 'EADDRINUSE' && tryOtherPort) {
            console.log(`Port ${currentPort} in use, trying ${currentPort + 1}`)
            wss.close()
            tryPort(currentPort + 1)
          } else {
            reject(err)
          }
        })

      wss.on('connection', (ws) => {
        console.log('Client connected')

        ws.on('message', (message) => {
          try {
            // Simply relay the message to all connected clients except sender
            wss.clients.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message.toString())
              }
            })
          } catch (error) {
            console.error('Error processing message:', error)
          }
        })

        ws.on('close', () => {
          console.log('Client disconnected')
        })
      })
    }

    tryPort(port)
  })
}
