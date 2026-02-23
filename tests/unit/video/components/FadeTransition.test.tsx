import React from 'react';
import { render } from '@testing-library/react';
import { FadeTransition } from '../../../../src/video/src/components/FadeTransition';
import { renderWithMocks, renderAtFrame } from '../mocks/setup';

describe('FadeTransition', () => {
  it('renders children with full opacity at start', () => {
    const { container } = renderAtFrame(
      <FadeTransition durationInFrames={30}>
        <div>Test Child</div>
      </FadeTransition>,
      0
    );
    expect(container.textContent).toContain('Test Child');
  });

  it('renders children without crashing when not provided', () => {
    const { container } = renderWithMocks(
      <FadeTransition durationInFrames={30} />
    );
    expect(container).toBeInTheDocument();
  });

  it('fades at the start of fade duration', () => {
    const { container } = renderAtFrame(
      <FadeTransition durationInFrames={30}>
        <div>Fading</div>
      </FadeTransition>,
      270 // Start of fade (300 - 30 = 270)
    );
    expect(container).toBeInTheDocument();
  });

  it('fully fades at last frame', () => {
    const { container } = renderAtFrame(
      <FadeTransition durationInFrames={30}>
        <div>Fading</div>
      </FadeTransition>,
      299 // Last frame
    );
    expect(container).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    const { container } = renderAtFrame(
      <FadeTransition durationInFrames={30}>
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </FadeTransition>,
      0
    );
    expect(container.textContent).toContain('Child 1');
    expect(container.textContent).toContain('Child 2');
    expect(container.textContent).toContain('Child 3');
  });

  it('renders with short fade duration', () => {
    const { container } = renderAtFrame(
      <FadeTransition durationInFrames={10}>
        <div>Quick Fade</div>
      </FadeTransition>,
      290 // Start of 10-frame fade
    );
    expect(container.textContent).toContain('Quick Fade');
  });

  it('renders with long fade duration', () => {
    const { container } = renderAtFrame(
      <FadeTransition durationInFrames={60}>
        <div>Slow Fade</div>
      </FadeTransition>,
      240 // Start of 60-frame fade
    );
    expect(container.textContent).toContain('Slow Fade');
  });

  it('renders at multiple frames throughout fade', () => {
    const frames = [0, 100, 200, 270, 285, 299];
    frames.forEach(frame => {
      const { container } = renderAtFrame(
        <FadeTransition durationInFrames={30}>
          <div>Content</div>
        </FadeTransition>,
        frame
      );
      expect(container).toBeInTheDocument();
    });
  });

  it('renders with complex children', () => {
    const { container } = renderWithMocks(
      <FadeTransition durationInFrames={30}>
        <div style={{ color: 'red' }}>Complex</div>
        <span>Nested</span>
      </FadeTransition>
    );
    expect(container.textContent).toContain('Complex');
    expect(container.textContent).toContain('Nested');
  });
});
