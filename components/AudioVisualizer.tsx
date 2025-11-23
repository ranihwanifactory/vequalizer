import React, { useEffect, useRef } from 'react';
import { VisualizerMode } from '../types';

interface AudioVisualizerProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  colors: string[];
  mode: VisualizerMode;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  dataArrayRef: React.MutableRefObject<Uint8Array | null>;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ 
  audioRef, 
  isPlaying, 
  colors, 
  mode,
  analyserRef,
  dataArrayRef
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const draw = () => {
    // Defensive checks
    if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) {
        // If playing but refs aren't ready, try again next frame
        if (isPlaying) {
            animationRef.current = requestAnimationFrame(draw);
        }
        return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    // Get fresh data
    analyser.getByteFrequencyData(dataArray);

    // Clear logic
    ctx.clearRect(0, 0, width, height);

    const bufferLength = analyser.frequencyBinCount;

    if (mode === VisualizerMode.BARS) {
      // Adjusted for full screen width
      const barWidth = (width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] * (height / 400); // Scale height based on window height

        // Dynamic gradient for bars
        const barGradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        barGradient.addColorStop(0, colors[0]);
        barGradient.addColorStop(0.5, colors[1]);
        barGradient.addColorStop(1, colors[2]);

        ctx.fillStyle = barGradient;
        
        // Draw centered bars for a more cinematic look
        // ctx.fillRect(x, height - barHeight, barWidth, barHeight); // Bottom aligned
        
        // Alternative: Center aligned bars
         ctx.fillRect(x, (height - barHeight), barWidth, barHeight);

        x += barWidth + 2; // More spacing
      }
    } 
    else if (mode === VisualizerMode.WAVE) {
      analyser.getByteTimeDomainData(dataArray);
      ctx.lineWidth = 5; // Thicker line
      ctx.strokeStyle = colors[1];
      ctx.shadowBlur = 15;
      ctx.shadowColor = colors[1];
      
      ctx.beginPath();

      const sliceWidth = (width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          // Smooth curves
          // const xc = (x + (x + sliceWidth)) / 2;
          // const yc = (y + dataArray[i+1] / 128.0 * height / 2) / 2;
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset
    }
    else if (mode === VisualizerMode.CIRCULAR) {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 3.5;
        
        // Center Glow
        const centerGlow = ctx.createRadialGradient(centerX, centerY, radius * 0.5, centerX, centerY, radius * 1.2);
        centerGlow.addColorStop(0, `${colors[0]}00`);
        centerGlow.addColorStop(1, `${colors[0]}44`);
        ctx.fillStyle = centerGlow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 1.2, 0, 2 * Math.PI);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = colors[0];
        ctx.lineWidth = 3;
        ctx.stroke();

        const bars = 120;
        const step = Math.floor(bufferLength / bars);
        
        for(let i = 0; i < bars; i++) {
            const value = dataArray[i * step];
            const angle = (i / bars) * 2 * Math.PI;
            // Scale the beat more aggressively
            const barHeight = (value / 255) * (radius * 1.0); 
            
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + barHeight);
            
            ctx.strokeStyle = i % 2 === 0 ? colors[1] : colors[2];
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }
    else if (mode === VisualizerMode.ORB) {
        let sum = 0;
        for(let i=0; i<bufferLength; i++) {
            sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = Math.min(width, height) / 5;
        // More reactive pulse
        const dynamicRadius = baseRadius + (average / 255) * baseRadius * 2.5;

        const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.1, centerX, centerY, dynamicRadius);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(0.4, colors[1]);
        gradient.addColorStop(0.8, `${colors[2]}88`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, dynamicRadius, 0, 2 * Math.PI);
        ctx.fill();

        // Particles
        ctx.fillStyle = colors[2];
        // Use frame time or similar for particle rotation in future, 
        // currently just random positions based on bass for "glitter" effect
        const particleCount = Math.floor(average / 5); // More loudness = more particles
        
        for(let i=0; i< Math.min(particleCount, 50); i++) {
           const angle = Math.random() * Math.PI * 2;
           const dist = dynamicRadius + Math.random() * 100;
           const size = Math.random() * 4;
           ctx.globalAlpha = Math.random();
           ctx.beginPath();
           ctx.arc(centerX + Math.cos(angle) * dist, centerY + Math.sin(angle) * dist, size, 0, Math.PI*2);
           ctx.fill();
           ctx.globalAlpha = 1.0;
        }
    }

    animationRef.current = requestAnimationFrame(draw);
  };

  // Handle resize and full screen canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      // Make canvas effectively full screen based on window
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Start/Stop Loop
  useEffect(() => {
    if (isPlaying) {
      draw();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, colors, mode]); // Re-bind if props change

  return (
    <canvas 
        ref={canvasRef} 
        className="block fixed inset-0 w-full h-full pointer-events-none z-0"
        style={{ 
            // Hardware acceleration hints
            transform: 'translateZ(0)', 
            backfaceVisibility: 'hidden' 
        }}
    />
  );
};

export default AudioVisualizer;