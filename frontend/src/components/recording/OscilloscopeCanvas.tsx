/**
 * OscilloscopeCanvas — live PCM waveform visualiser
 *
 * US3: Renders incoming Float32Array samples as a scrolling waveform.
 * Uses requestAnimationFrame for smooth updates at ≥30 fps.
 * Draws a flat centre line when waveform is null or all zeros.
 *
 * T019: Core canvas component
 * T020: Wired into RecordingView with waveform state from useAudioRecorder
 */
import { useEffect, useRef } from 'react';

interface OscilloscopeCanvasProps {
  /** PCM amplitude samples in [-1, 1], or null when not recording */
  waveform: Float32Array | null;
  width?: number;
  height?: number;
  /** Stroke colour (CSS color string) */
  color?: string;
}

export function OscilloscopeCanvas({
  waveform,
  width = 350,
  height = 80,
  color = '#4caf50',
}: OscilloscopeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function draw() {
      if (!ctx || !canvas) return;
      const w = canvas.width;
      const h = canvas.height;
      const mid = h / 2;

      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;

      const data = waveform;
      if (!data || data.length === 0) {
        // Flat line
        ctx.moveTo(0, mid);
        ctx.lineTo(w, mid);
      } else {
        const step = w / data.length;
        for (let i = 0; i < data.length; i++) {
          const x = i * step;
          const y = mid - data[i] * mid;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
    }

    function loop() {
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [waveform, color]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="oscilloscope-canvas"
      aria-label="Oscilloscope waveform"
    />
  );
}
