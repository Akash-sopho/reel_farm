import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export interface KenBurnsImageProps {
  src?: string;
  direction?: 'in' | 'out';
  scale?: number;
}

/**
 * KenBurnsImage component - slow zoom in or out with image
 */
export const KenBurnsImage: React.FC<KenBurnsImageProps> = ({
  src,
  direction = 'in',
  scale = 1.1,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Zoom animation
  const zoomScale = interpolate(
    frame,
    [0, durationInFrames],
    direction === 'in' ? [1, scale] : [scale, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Show placeholder if no src provided
  if (!src) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#cccccc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: '#999', fontSize: 24 }}>No image provided</div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
      }}
    >
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${zoomScale})`,
          transformOrigin: 'center',
        }}
      />
    </AbsoluteFill>
  );
};
