import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export interface AnimatedTextProps {
  text?: string;
  fontSize?: number;
  color?: string;
  fontWeight?: string;
  textAlign?: string;
  animationType?: 'fade' | 'slide-up';
  delay?: number;
}

/**
 * AnimatedText component - text with fade-in or slide-up animation
 */
export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text = '',
  fontSize = 48,
  color = '#ffffff',
  fontWeight = 'bold',
  textAlign = 'center',
  animationType = 'fade',
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Don't render if no text
  if (!text) {
    return null;
  }

  // Animation duration: 30 frames for fade-in
  const animationDuration = 30;
  const effectiveFrame = Math.max(0, frame - delay);

  // Opacity animation
  const opacity = interpolate(
    effectiveFrame,
    [0, animationDuration],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Slide-up animation (translateY)
  const translateY = animationType === 'slide-up'
    ? interpolate(
        effectiveFrame,
        [0, animationDuration],
        [50, 0],
        {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }
      )
    : 0;

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          fontSize,
          color,
          fontWeight,
          textAlign: textAlign as any,
          opacity,
          transform: `translateY(${translateY}px)`,
          maxWidth: '90%',
          wordWrap: 'break-word',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
