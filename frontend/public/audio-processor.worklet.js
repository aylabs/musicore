/**
 * AudioWorklet processor for microphone PCM capture.
 *
 * Accumulates 2048-sample batches from the 128-sample hardware render quantum
 * and posts each batch to the main thread as a transferable Float32Array.
 *
 * Message format posted to main thread:
 *   { type: 'pcm', buffer: Float32Array }
 *
 * The hardware render quantum is 128 samples at 44100 Hz (~2.9 ms).
 * 2048 samples = 16 quanta = ~46 ms — enough resolution for accurate pitch
 * detection down to C2 (≈65 Hz) without exceeding the 200 ms onset latency
 * requirement.
 */

const BATCH_SIZE = 2048;

class AudioCaptureProcessor extends AudioWorkletProcessor {
  /** Accumulator ring buffer */
  _buffer = new Float32Array(BATCH_SIZE);
  /** Write cursor */
  _cursor = 0;

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channel = input[0]; // Use first (mono) channel

    for (let i = 0; i < channel.length; i++) {
      this._buffer[this._cursor++] = channel[i];

      if (this._cursor === BATCH_SIZE) {
        // Copy and transfer to avoid retaining a reference to the internal buffer
        const slice = this._buffer.slice(0);
        this.port.postMessage({ type: 'pcm', buffer: slice }, [slice.buffer]);
        this._cursor = 0;
      }
    }

    return true; // Keep processor alive
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
