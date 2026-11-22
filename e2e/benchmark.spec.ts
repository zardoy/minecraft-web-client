import fs from 'fs'
import { test } from '@playwright/test'
import { getAllInfoLines, type BenchmarkAdapterInfo } from '../src/benchmarkAdapter'
import { openApp, waitForWorld } from './shared'

test('Benchmark rendering performance', async ({ page }) => {
  await openApp(page, '/?openBenchmark=true&renderDistance=5')
  await waitForWorld(page, 180_000)
  // the adapter's getters read live renderer state: copy their current values out of the page
  const collect = async (delayed: boolean) => {
    const adapter = await page.evaluate(() => JSON.parse(JSON.stringify((window as unknown as { benchmarkAdapter: BenchmarkAdapterInfo }).benchmarkAdapter)))
    return getAllInfoLines(adapter, delayed)
  }
  const messages = await collect(false)
  await page.waitForTimeout(10_000)
  const messages2 = await collect(true)
  for (const message of [...messages, ...messages2]) console.log(message)
  fs.writeFileSync('benchmark.txt', [...messages, ...messages2].join('\n'))
})
