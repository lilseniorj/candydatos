import { useState } from 'react'
import { seedJobs } from '../scripts/seedJobs'

export default function SeedPage() {
  const [log, setLog] = useState([])
  const [running, setRunning] = useState(false)

  async function handleSeed() {
    setRunning(true)
    setLog(['Starting seed…'])

    // Override console.log temporarily to capture output
    const origLog = console.log
    console.log = (...args) => {
      origLog(...args)
      setLog(prev => [...prev, args.join(' ')])
    }

    try {
      await seedJobs()
      setLog(prev => [...prev, '✅ Seed complete!'])
    } catch (err) {
      setLog(prev => [...prev, `❌ Error: ${err.message}`])
    } finally {
      console.log = origLog
      setRunning(false)
    }
  }

  return (
    <div style={{ padding: 40, fontFamily: 'monospace', background: '#111', color: '#0f0', minHeight: '100vh' }}>
      <h1>Seed Job Offers</h1>
      <button onClick={handleSeed} disabled={running}
        style={{ padding: '10px 24px', fontSize: 16, cursor: running ? 'wait' : 'pointer', marginBottom: 20 }}>
        {running ? 'Seeding…' : 'Run Seed (20 jobs)'}
      </button>
      <pre style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
        {log.join('\n')}
      </pre>
    </div>
  )
}
