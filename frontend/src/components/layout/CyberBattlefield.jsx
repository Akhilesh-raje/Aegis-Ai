import React, { useEffect, useRef } from 'react';
import { useAura } from './AuraProvider';

export default function CyberBattlefield() {
  const canvasRef = useRef(null);
  const { aura, intensity } = useAura();
  const particles = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    // Create particles
    const particleCount = 60;
    particles.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.5 + 0.1
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Battlefield Speed Multiplier
      const speedMult = 1 + (intensity * 5);
      
      particles.current.forEach((p, i) => {
        // Draw Packet
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = aura.accent;
        ctx.globalAlpha = p.opacity;
        ctx.fill();

        // Subtle Glow
        if (intensity > 0.5) {
            ctx.shadowBlur = 10 * intensity;
            ctx.shadowColor = aura.accent;
        } else {
            ctx.shadowBlur = 0;
        }

        // Move
        p.x += p.speedX * speedMult;
        p.y += p.speedY * speedMult;

        // Wrap
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Connect lines if close (Cyber Mesh)
        for (let j = i + 1; j < particles.current.length; j++) {
          const p2 = particles.current[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = aura.accent;
            ctx.globalAlpha = (1 - dist / 150) * 0.15;
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [aura.accent, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-40 transition-opacity duration-1000"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
