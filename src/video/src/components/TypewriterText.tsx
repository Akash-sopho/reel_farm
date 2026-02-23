import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export interface TypewriterTextProps {
  text?: string;
  fontSize?: number;
  color?: string;
  delay?: number;
}

/**
 * TypewriterText component - text revealed character by character
 */
export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text = '',
  fontSize = 48,
  color = '#ffffff',
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Don't render if no text
  if (!text) {
    return null;
  }

  // Calculate how many characters to show
  const effectiveFrame = Math.max(0, frame - delay);
  const charsPerFrame = text.length / (durationInFrames - delay);
  const charsToShow = Math.ceil(effectiveFrame * charsPerFrame);
  const displayText = text.slice(0, Math.min(charsToShow, text.length));

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
          fontWeight: 'bold',
          textAlign: 'center',
          maxWidth: '90%',
          wordWrap: 'break-word',
          fontFamily: 'monospace',
        }}
      >
        {displayText}
        {charsToShow < text.length && (
          <span style={{ animation: 'blink 0.5s infinite' }}>|</span>
        )}
      </div>
    </AbsoluteFill>
  );
};
