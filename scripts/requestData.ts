import WebSocket from 'ws'

function formatBytes(bytes: number) {
  return `${(bytes).toFixed(2)} MB`
}

function formatTime(ms: number) {
  return `${(ms / 1000).toFixed(2)}s`
}

const ws = new WebSocket('ws://localhost:8081')

ws.on('open', () => {
  console.log('Connected to metrics server, waiting for metrics...')
})

ws.on('message', (data) => {
  try {
    const metrics = JSON.parse(data.toString())
    console.log('\nPerformance Metrics:')
    console.log('------------------')
    console.log(`Load Time: ${formatTime(metrics.loadTime)}`)
    console.log(`Memory Usage: ${formatBytes(metrics.memoryUsage)}`)
    console.log(`Timestamp: ${new Date(metrics.timestamp).toLocaleString()}`)
    if (!process.argv.includes('-f')) { // follow mode
      process.exit(0)
    }
  } catch (error) {
    console.error('Error parsing metrics:', error)
  }
})

ws.on('error', (error) => {
  console.error('WebSocket error:', error)
  process.exit(1)
})

// Exit if no metrics received after 5 seconds
setTimeout(() => {
  console.error('Timeout waiting for metrics')
  process.exit(1)
}, 5000)
