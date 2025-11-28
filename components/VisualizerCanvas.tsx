import React, { useEffect, useRef } from 'react';
import { Theme, VisualizerMode } from '../types';
import { audioController } from '../services/audioService';

interface VisualizerCanvasProps {
  theme: Theme;
  isActive: boolean;
}

const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({ theme, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<{x: number, y: number, size: number, speedX: number, speedY: number, color: string}[]>([]);

  // Initialize particles
  useEffect(() => {
    if (theme.mode === VisualizerMode.PARTICLES) {
      particlesRef.current = Array.from({ length: 100 }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 2,
        speedY: (Math.random() - 0.5) * 2,
        color: theme.colors[Math.floor(Math.random() * theme.colors.length)]
      }));
    }
  }, [theme.mode, theme.colors]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handler
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Pre-allocate data array to avoid GC in loop
    // FFT Size is 2048 in AudioController, so bin count is 1024
    let dataArray = new Uint8Array(1024);

    const render = () => {
      animationRef.current = requestAnimationFrame(render);
      
      const analyser = audioController.getAnalyser();
      
      // Update data logic
      if (analyser) {
        // Ensure array size matches (in case fftSize changed, though currently constant)
        if (dataArray.length !== analyser.frequencyBinCount) {
          dataArray = new Uint8Array(analyser.frequencyBinCount);
        }

        if (theme.mode === VisualizerMode.WAVE) {
            analyser.getByteTimeDomainData(dataArray);
        } else {
            analyser.getByteFrequencyData(dataArray);
        }
      } else {
        dataArray.fill(0);
      }

      // Clear canvas logic
      if (theme.backgroundImage) {
         ctx.clearRect(0, 0, canvas.width, canvas.height);
         // Optional: Add a dark overlay to make visuals pop
         ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
         ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
         ctx.fillStyle = theme.backgroundColor;
         if (theme.mode === VisualizerMode.PARTICLES) {
            ctx.fillStyle = `${theme.backgroundColor}40`; // Hex alpha for trails
         } 
         ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const len = dataArray.length;

      // Draw based on mode
      switch (theme.mode) {
        case VisualizerMode.BARS:
          const barWidth = (canvas.width / len) * 2.5;
          let barX = 0;
          
          for (let i = 0; i < len; i++) {
            const val = dataArray[i];
            const barHeight = (val / 255) * canvas.height * 0.8;
            
            // Gradient fill
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
            gradient.addColorStop(0, theme.colors[0]);
            gradient.addColorStop(0.5, theme.colors[2]);
            gradient.addColorStop(1, theme.colors[4]);

            ctx.fillStyle = gradient;
            ctx.fillRect(barX, canvas.height - barHeight, barWidth, barHeight);
            
            // Mirror reflection
            ctx.globalAlpha = 0.2;
            ctx.fillRect(barX, canvas.height, barWidth, barHeight * 0.5);
            ctx.globalAlpha = 1.0;

            barX += barWidth + 1;
            if (barX > canvas.width) break;
          }
          break;

        case VisualizerMode.WAVE:
          ctx.lineWidth = 3;
          ctx.strokeStyle = theme.colors[1];
          ctx.beginPath();
          
          const sliceWidth = canvas.width / len;
          let x = 0;
          
          for (let i = 0; i < len; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * cy; // Centered vertically
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            
            x += sliceWidth;
          }
          
          ctx.lineTo(canvas.width, cy);
          ctx.stroke();
          
          // Glow effect
          ctx.shadowBlur = 15;
          ctx.shadowColor = theme.colors[0];
          ctx.stroke();
          ctx.shadowBlur = 0;
          break;

        case VisualizerMode.CIRCLE:
          const radius = Math.min(cx, cy) * 0.4;
          
          for (let i = 0; i < len; i += 4) { // Skip some for performance/aesthetics
            const val = dataArray[i];
            const barHeight = (val / 255) * (Math.min(cx, cy) * 0.5);
            
            const rad = (i / len) * Math.PI * 2;
            
            const x1 = cx + Math.cos(rad) * radius;
            const y1 = cy + Math.sin(rad) * radius;
            const x2 = cx + Math.cos(rad) * (radius + barHeight);
            const y2 = cy + Math.sin(rad) * (radius + barHeight);
            
            ctx.strokeStyle = theme.colors[i % theme.colors.length];
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
          // Inner glow
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 0.9, 0, Math.PI * 2);
          ctx.fillStyle = theme.colors[0];
          ctx.shadowBlur = 20;
          ctx.shadowColor = theme.colors[1];
          ctx.fill();
          ctx.shadowBlur = 0;
          break;

        case VisualizerMode.PARTICLES:
          // Use low frequency avg to pump particles
          let bassSum = 0;
          for(let i=0; i<50; i++) bassSum += dataArray[i];
          const bassAvg = bassSum / 50;
          const pump = (bassAvg / 255) * 1.5;

          particlesRef.current.forEach((p, idx) => {
             p.x += p.speedX * (1 + pump);
             p.y += p.speedY * (1 + pump);

             // Bounce
             if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
             if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;

             const size = p.size * (1 + pump);
             
             ctx.beginPath();
             ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
             ctx.fillStyle = p.color;
             ctx.fill();

             // Connect nearby particles
             for(let j=idx+1; j<particlesRef.current.length; j++) {
                const p2 = particlesRef.current[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < 100) {
                    ctx.beginPath();
                    ctx.strokeStyle = p.color;
                    ctx.globalAlpha = 1 - (dist / 100);
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                    ctx.globalAlpha = 1.0;
                }
             }
          });
          break;
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [theme]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none"
    />
  );
};

export default VisualizerCanvas;