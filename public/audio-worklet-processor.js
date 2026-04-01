/**
 * AudioWorklet processor that captures PCM16 audio chunks
 * and sends them to the main thread as Int16Array buffers.
 */
class PCM16Processor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._buffer = []
    this._bufferSize = 2400 // ~150ms at 16kHz
  }

  process(inputs) {
    const input = inputs[0]
    if (!input || !input[0]) return true

    const samples = input[0]
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]))
      this._buffer.push(s < 0 ? s * 0x8000 : s * 0x7FFF)
    }

    if (this._buffer.length >= this._bufferSize) {
      const chunk = new Int16Array(this._buffer.splice(0, this._bufferSize))
      // Send raw Int16Array to main thread — base64 conversion happens there
      this.port.postMessage({ pcm16: chunk }, [chunk.buffer])
    }

    return true
  }
}

registerProcessor('pcm16-processor', PCM16Processor)
