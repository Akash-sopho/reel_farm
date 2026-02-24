import { jsx as _jsx } from "react/jsx-runtime";
import { AbsoluteFill, useCurrentFrame } from 'remotion';
/**
 * GrainOverlay component - animated film grain effect overlay
 */
export const GrainOverlay = ({ opacity = 0.1, size = 2, }) => {
    const frame = useCurrentFrame();
    // Generate grain pattern SVG data URL
    // Use frame-based seed for animation effect
    const seed = frame % 10;
    const grainSVG = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="${seed}" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="200" height="200" fill="black" filter="url(#grain)" />
    </svg>
  `.replace(/\s+/g, ' ');
    const dataUrl = `data:image/svg+xml,${encodeURIComponent(grainSVG)}`;
    return (_jsx(AbsoluteFill, { style: {
            backgroundImage: `url("${dataUrl}")`,
            backgroundSize: `${size * 20}px ${size * 20}px`,
            backgroundRepeat: 'repeat',
            opacity,
            pointerEvents: 'none',
            mixBlendMode: 'multiply',
        } }));
};
