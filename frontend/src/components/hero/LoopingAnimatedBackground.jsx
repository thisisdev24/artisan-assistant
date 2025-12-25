import React from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

/**
 * LoopingAnimatedBackground.jsx
 * Responsive, framer-motion-enhanced, looping diagonal background.
 *
 * Props:
 * - speed: number (seconds per vertical loop on desktop)
 * - mobileSpeed: number (seconds per vertical loop on mobile)
 * - opacity: number (0-1) base opacity for layers
 * - mobileOpacity: number (0-1) opacity override for mobile
 * - colors: array of color strings used for layers (will be used as gradients)
 * - density: number (how many shapes across the width)
 *
 * Notes:
 * - Uses CSS marquee (translateY) for continuous vertical looping and framer-motion for
 *   gentle per-shape sway for smoother, physics-based motion.
 * - Responsive tuning: speeds, blur, opacity and sizes adjust using CSS media queries.
 */

export default function LoopingAnimatedBackground({
  children,
  speed = 18,
  mobileSpeed = 18,
  opacity = 0.2,
  mobileOpacity = 0.12,
  colors = ["#FFAA00"],
  density = 5,
}) {
  // Generate positions across a wide area so tiled copies loop seamlessly
  const positions = Array.from({ length: density }).map((_, i) => ({
    // spread across 0..100% and slightly beyond for overlap
    left: `${(-10 + (i / Math.max(1, density - 1)) * 120).toFixed(2)}%`,
    // stagger top offsets
    top: `${(-30 + (i % 3) * 18).toFixed(2)}%`,
    scale: (0.8 + (i % 3) * 0.12).toFixed(2),
    rotate: (38 + (i % 5) * 4).toFixed(2),
  }));

  // Inline styles + responsive variables
  const style = `
    /* responsive animation variables */
    :root {
      --loop-speed: ${speed}s;
      --mobile-loop-speed: ${mobileSpeed}s;
      --base-opacity: ${opacity};
      --mobile-opacity: ${mobileOpacity};
    }

    /* marquee moves the inner container up by 50% so the duplicated copy flows in. */
    .marquee-vertical {
      animation: marquee var(--loop-speed) linear infinite;
      will-change: transform;
    }

    /* keyframes for vertical loop */
    @keyframes marquee {
      0% { transform: translateY(0%); }
      100% { transform: translateY(-50%); }
    }

    /* adjust speed for small screens */
    @media (max-width: 768px) {
      .marquee-vertical { animation-duration: var(--mobile-loop-speed); }
    }

    /* subtle drop shadow and backdrop blur on layers */
    .bg-shape {
      box-shadow: 0 20px 60px rgba(0,0,0,0.08);
      border-radius: 1.5rem;
      mix-blend-mode: screen;
      filter: blur(2px);
    }

    @media (max-width: 768px) {
      .bg-shape { filter: blur(1.25px); }
    }

    /* reduce opacity on mobile for less visual noise */
    .layer-opacity { opacity: var(--base-opacity); }
    @media (max-width: 768px) { .layer-opacity { opacity: var(--mobile-opacity); } }

  `;

  // framer-motion variants for sway (gentle y oscillation + tiny rotation tweak)
  const swayVariant = (i) => ({
    animate: {
      y: [0, 6, 0],
      rotate: [0, 1.2, 0],
      transition: {
        duration: 4 + (i % 3) * 0.8,
        repeat: Infinity,
        repeatType: "loop",
        ease: "easeInOut",
        delay: (i % 5) * 0.2,
      },
    },
  });

  return (
    <div className="relative overflow-hidden min-h-full min-w-full md:min-h-full md:min-w-full bg-transparent">
      <style>{style}</style>

      {/* Pattern container: two identical stacked rows for a seamless vertical loop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="w-full h-[200%] marquee-vertical">
          {[0, 1].map((copyIdx) => (
            <div key={copyIdx} className="w-full h-1/2 relative">
              {colors.map((col, layerIdx) => (
                <div
                  key={layerIdx}
                  className={`absolute inset-0 layer-opacity bg-shape`}
                  style={{
                    // Slightly offset layers vertically so gradients look layered
                    transform: `translateZ(0) translateY(${layerIdx * 2}%)`,
                    opacity: opacity,
                  }}
                >
                  {/* each layer places shapes across the width */}
                  {positions.map((pos, i) => (
                    <motion.div
                      key={`${copyIdx}-${layerIdx}-${i}`}
                      className="absolute bg-shape"
                      variants={swayVariant(i)}
                      animate="animate"
                      style={{
                        left: pos.left,
                        top: pos.top,
                        width: "62vw",
                        height: "42vh",
                        transform: `translateX(-50%) scale(${pos.scale}) rotate(${pos.rotate}deg)`,
                        background: `linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.0)), linear-gradient(135deg, ${col}, ${colors[(layerIdx + 1) % colors.length]})`,
                        borderRadius: "1.5rem",
                        mixBlendMode: "screen",
                        // stagger start using CSS animationDelay fallback so initial layout isn't identical
                        // (framer-motion handles continuous sway)
                        transition: "transform 0.3s linear",
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* CONTENT SLOT */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
