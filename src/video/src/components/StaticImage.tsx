import React from 'react';
import { AbsoluteFill, Img } from 'remotion';

export interface StaticImageProps {
  src?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  opacity?: number;
}

/**
 * StaticImage component - renders a full-bleed image
 */
export const StaticImage: React.FC<StaticImageProps> = ({
  src,
  objectFit = 'cover',
  opacity = 1,
}) => {
  // Show placeholder if no src provided
  if (!src) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#cccccc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity,
        }}
      >
        <div style={{ color: '#999', fontSize: 24 }}>No image provided</div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: objectFit as any,
        }}
      />
    </AbsoluteFill>
  );
};
