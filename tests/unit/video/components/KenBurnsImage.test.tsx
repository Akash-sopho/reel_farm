import React from 'react';
import { render } from '@testing-library/react';
import { KenBurnsImage } from '../../../../src/video/src/components/KenBurnsImage';
import { renderWithMocks, renderAtFrame } from '../mocks/setup';

describe('KenBurnsImage', () => {
  it('renders with valid src URL', () => {
    const { container } = renderWithMocks(
      <KenBurnsImage src="https://example.com/image.jpg" />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with all optional props omitted', () => {
    const { container } = renderWithMocks(<KenBurnsImage />);
    // Should render placeholder without crashing
    const placeholder = container.querySelector('div');
    expect(placeholder?.textContent).toContain('No image provided');
  });

  it('shows placeholder when src is missing', () => {
    const { container } = renderWithMocks(<KenBurnsImage />);
    const placeholder = container.querySelector('div');
    expect(placeholder?.textContent).toContain('No image provided');
  });

  it('renders with zoom-in direction at frame 0', () => {
    const { container } = renderAtFrame(
      <KenBurnsImage src="https://example.com/image.jpg" direction="in" scale={1.1} />,
      0
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with zoom-in direction at final frame', () => {
    const { container } = renderAtFrame(
      <KenBurnsImage src="https://example.com/image.jpg" direction="in" scale={1.1} />,
      299 // Last frame of 300-frame default video
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with zoom-out direction', () => {
    const { container } = renderWithMocks(
      <KenBurnsImage src="https://example.com/image.jpg" direction="out" scale={1.15} />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with custom scale value', () => {
    const { container } = renderWithMocks(
      <KenBurnsImage src="https://example.com/image.jpg" scale={1.2} />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with scale values between 1.0 and 1.5', () => {
    const scales = [1.0, 1.05, 1.1, 1.15, 1.2, 1.5];
    scales.forEach(scale => {
      const { container } = renderWithMocks(
        <KenBurnsImage src="https://example.com/image.jpg" scale={scale} />
      );
      expect(container).toBeInTheDocument();
    });
  });

  it('has overflow hidden on container', () => {
    const { container } = renderAtFrame(
      <KenBurnsImage src="https://example.com/image.jpg" />,
      150
    );
    const fillDiv = container.firstChild as HTMLElement;
    expect(fillDiv?.style.overflow).toBe('hidden');
  });

  it('renders at different frames during zoom animation', () => {
    const frames = [0, 75, 150, 225, 299];
    frames.forEach(frame => {
      const { container } = renderAtFrame(
        <KenBurnsImage src="https://example.com/image.jpg" direction="in" />,
        frame
      );
      expect(container).toBeInTheDocument();
    });
  });
});
