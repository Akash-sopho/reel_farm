import React from 'react';

// Mock Remotion hooks for testing

export const mockVideoConfig = {
  durationInFrames: 300,
  fps: 30,
  width: 1080,
  height: 1920,
  defaultCodec: 'h264' as const,
};

export const mockUseVideoConfig = jest.fn(() => mockVideoConfig);
export const mockUseCurrentFrame = jest.fn((defaultValue = 0) => defaultValue);

// Mock interpolate function
export const mockInterpolate = jest.fn((frame: number, inputRange: number[], outputRange: number[], options?: any) => {
  // Simple linear interpolation
  const [inputStart, inputEnd] = inputRange;
  const [outputStart, outputEnd] = outputRange;
  if (frame <= inputStart) return outputStart;
  if (frame >= inputEnd) return outputEnd;
  const ratio = (frame - inputStart) / (inputEnd - inputStart);
  return outputStart + (outputEnd - outputStart) * ratio;
});

// Mock Remotion components
jest.mock('remotion', () => ({
  useVideoConfig: mockUseVideoConfig,
  useCurrentFrame: mockUseCurrentFrame,
  interpolate: mockInterpolate,
  Sequence: ({ children }: any) => children,
  Audio: () => null,
  Img: ({ src, style }: any) => <img src={src} style={style} />,
  AbsoluteFill: ({ children, style }: any) => (
    <div style={style}>
      {children}
    </div>
  ),
}));

// Export for test setup
export const resetMocks = () => {
  mockUseVideoConfig.mockClear();
  mockUseCurrentFrame.mockClear();
  mockInterpolate.mockClear();
};
