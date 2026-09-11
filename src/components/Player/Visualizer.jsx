import React, { useRef, useEffect } from 'react';

export default function Visualizer({ isPlaying }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const barCount = 32;
      const barWidth = (width / barCount) * 0.6;
      const spacing = width / barCount;

      for (let i = 0; i < barCount; i++) {
        let barHeight;
        if (isPlaying) {
          // Dynamic sine + harmonic wave simulation for energetic visual response
          const wave1 = Math.sin(phase + i * 0.25) * 0.5 + 0.5;
          const wave2 = Math.cos(phase * 1.5 + i * 0.4) * 0.5 + 0.5;
          barHeight = Math.max(4, (wave1 * 0.6 + wave2 * 0.4) * height * 0.85);
        } else {
          barHeight = 4;
        }

        const x = i * spacing + (spacing - barWidth) / 2;
        const y = height - barHeight;

        // Romantic gradient
        const grad = ctx.createLinearGradient(0, height, 0, 0);
        grad.addColorStop(0, 'rgba(255, 59, 104, 0.8)');
        grad.addColorStop(0.5, 'rgba(255, 117, 140, 0.9)');
        grad.addColorStop(1, 'rgba(162, 56, 255, 0.7)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 4);
        ctx.fill();
      }

      if (isPlaying) {
        phase += 0.08;
      }
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPlaying]);

  return (
    <div style={{ width: '100%', height: '24px', margin: '2px 0 8px 0' }}>
      <canvas
        ref={canvasRef}
        width={340}
        height={24}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}
