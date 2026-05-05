let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function noise(duration: number, gain: number, freq: number, type: BiquadFilterType) {
  const c = getCtx()
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * duration), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++)
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 5)
  const src = c.createBufferSource()
  src.buffer = buf
  const filt = c.createBiquadFilter()
  filt.type = type; filt.frequency.value = freq; filt.Q.value = 0.7
  const g = c.createGain()
  g.gain.setValueAtTime(gain, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
  src.connect(filt); filt.connect(g); g.connect(c.destination)
  src.start()
}

function thump(freq: number, duration: number, gain: number) {
  const c = getCtx()
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(freq * 0.25, c.currentTime + duration)
  const g = c.createGain()
  g.gain.setValueAtTime(gain, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
  osc.connect(g); g.connect(c.destination)
  osc.start(); osc.stop(c.currentTime + duration)
}

export const SFX = {
  click()  { try { noise(0.022, 0.10, 3200, 'highpass') } catch {} },
  press()  { try { noise(0.042, 0.14, 1600, 'bandpass'); thump(110, 0.038, 0.07) } catch {} },
  toggle() { try { noise(0.058, 0.17, 800,  'bandpass'); thump(75,  0.052, 0.11) } catch {} },
  blip()   {
    try {
      const c = getCtx()
      const osc = c.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1200, c.currentTime)
      osc.frequency.exponentialRampToValueAtTime(880, c.currentTime + 0.05)
      const g = c.createGain()
      g.gain.setValueAtTime(0.07, c.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.07)
      osc.connect(g); g.connect(c.destination)
      osc.start(); osc.stop(c.currentTime + 0.075)
    } catch {}
  },
}
