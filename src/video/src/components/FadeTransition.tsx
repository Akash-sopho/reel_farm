import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export interface FadeTransitionProps {
  durationInFrames: number;
  children?: React.ReactNode;
}

/**
 * FadeTransition component - wrapper that fades content in/out
 * Fades out over the last N frames of the scene
 */
export const FadeTransition: React.FC<FadeTransitionProps> = ({
  durationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames: totalDuration } = useVideoConfig();

  // Calculate fade-out start frame
  const fadeStartFrame = totalDuration - durationInFrames;

  // Opacity animation
  const opacity = interpolate(
    frame,
    [fadeStartFrame, totalDuration],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      {children}
    </AbsoluteFill>
  );
};
