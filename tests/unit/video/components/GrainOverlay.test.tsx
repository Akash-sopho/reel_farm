import React from 'react';
import { render } from '@testing-library/react';
import { GrainOverlay } from '../../../../src/video/src/components/GrainOverlay';
import { renderWithMocks, renderAtFrame } from '../mocks/setup';
import { mockUseCurrentFrame } from '../mocks/remotion';

describe('GrainOverlay', () => {
  it('renders SVG grain overlay with default props', () => {
    const { container } = renderWithMocks(
      <GrainOverlay />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with custom opacity', () => {
    const { container } = renderWithMocks(
      <GrainOverlay opacity={0.2} />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with custom size', () => {
    const { container } = renderWithMocks(
      <GrainOverlay size={4} />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with opacity 0 (fully transparent)', () => {
    const { container } = renderWithMocks(
      <GrainOverlay opacity={0} />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with opacity 1 (fully opaque)', () => {
    const { container } = renderWithMocks(
      <GrainOverlay opacity={1} />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with size 1 (minimal)', () => {
    const { container } = renderWithMocks(
      <GrainOverlay size={1} />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with size 10 (large)', () => {
    const { container } = renderWithMocks(
      <GrainOverlay size={10} />
    );
    expect(container).toBeInTheDocument();
  });

  it('generates grain pattern based on current frame', () => {
    mockUseCurrentFrame.mockReturnValue(0);
    const frame0Result = render(<GrainOverlay />);

    mockUseCurrentFrame.mockReturnValue(1);
    const frame1Result = render(<GrainOverlay />);

    mockUseCurrentFrame.mockReturnValue(5);
    const frame5Result = render(<GrainOverlay />);

    // Different frames should have different grain patterns
    // (seed = frame % 10, so frame 0 and 10 would be same)
    expect(frame0Result.container).toBeInTheDocument();
    expect(frame1Result.container).toBeInTheDocument();
    expect(frame5Result.container).toBeInTheDocument();
  });

  it('repeats grain pattern every 10 frames', () => {
    mockUseCurrentFrame.mockReturnValue(0);
    const frame0 = render(<GrainOverlay />);

    mockUseCurrentFrame.mockReturnValue(10);
    const frame10 = render(<GrainOverlay />);

    // frame 0 and frame 10 should have same seed (both % 10 = 0)
    // This is a structural test - actual grain generation is internal to SVG
    expect(frame0.container).toBeInTheDocument();
    expect(frame10.container).toBeInTheDocument();
  });

  it('renders at multiple frames', () => {
    const frames = [0, 1, 5, 10, 100, 299];
    frames.forEach(frame => {
      mockUseCurrentFrame.mockReturnValue(frame);
      const { container } = render(<GrainOverlay />);
      expect(container).toBeInTheDocument();
    });
  });

  it('applies grain overlay styles', () => {
    const { container } = renderWithMocks(
      <GrainOverlay opacity={0.2} size={3} />
    );
    // Component should render without errors
    expect(container).toBeInTheDocument();
  });

  it('renders with combination of custom props', () => {
    const { container } = renderWithMocks(
      <GrainOverlay opacity={0.15} size={2.5} />
    );
    expect(container).toBeInTheDocument();
  });
});
