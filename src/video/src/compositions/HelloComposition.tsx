import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const HelloComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Fade in animation for title (0-30 frames)
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Fade in animation for subtitle (30-60 frames)
  const subtitleOpacity = interpolate(frame, [30, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 'bold',
          color: 'white',
          marginBottom: 20,
          opacity: titleOpacity,
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        Hello ReelForge
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 36,
          color: '#e0e0e0',
          opacity: subtitleOpacity,
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        Your video creation workspace
      </div>
    </AbsoluteFill>
  );
};
