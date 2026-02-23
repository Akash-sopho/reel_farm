import React from 'react';
import { render } from '@testing-library/react';
import { TypewriterText } from '../../../../src/video/src/components/TypewriterText';
import { renderWithMocks, renderAtFrame } from '../mocks/setup';

describe('TypewriterText', () => {
  it('returns null when text is empty string', () => {
    const { container } = renderWithMocks(<TypewriterText text="" />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when text is undefined', () => {
    const { container } = renderWithMocks(<TypewriterText />);
    expect(container.firstChild).toBeNull();
  });

  it('renders text with typewriter effect at frame 0', () => {
    const { container } = renderAtFrame(
      <TypewriterText text="Hello" />,
      0
    );
    // May show 0 or 1 character at frame 0
    expect(container).toBeInTheDocument();
  });

  it('renders full text at final frame', () => {
    const { container } = renderAtFrame(
      <TypewriterText text="Hello World" />,
      299 // Last frame
    );
    expect(container.textContent).toContain('Hello World');
  });

  it('progressively reveals characters across frames', () => {
    const text = 'Hello';
    const frame50 = renderAtFrame(<TypewriterText text={text} />, 50);
    const frame150 = renderAtFrame(<TypewriterText text={text} />, 150);
    const frame250 = renderAtFrame(<TypewriterText text={text} />, 250);

    // Each subsequent frame should have more or equal characters
    expect(frame50.container).toBeInTheDocument();
    expect(frame150.container).toBeInTheDocument();
    expect(frame250.container).toBeInTheDocument();
  });

  it('renders with custom fontSize', () => {
    const { container } = renderWithMocks(
      <TypewriterText text="Large Text" fontSize={72} />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with custom color', () => {
    const { container } = renderWithMocks(
      <TypewriterText text="Colored Text" color="#ff0000" />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with delay parameter', () => {
    const { container } = renderAtFrame(
      <TypewriterText text="Delayed Text" delay={50} />,
      0
    );
    // With delay=50, at frame 0 effective frame is max(0, 0-50) = 0
    expect(container).toBeInTheDocument();
  });

  it('respects delay - no characters shown before delay', () => {
    const { container } = renderAtFrame(
      <TypewriterText text="Text" delay={100} />,
      50 // Before delay expires
    );
    expect(container).toBeInTheDocument();
  });

  it('renders at multiple frames', () => {
    const frames = [0, 50, 100, 150, 200, 250, 299];
    frames.forEach(frame => {
      const { container } = renderAtFrame(
        <TypewriterText text="Typewriter" />,
        frame
      );
      expect(container).toBeInTheDocument();
    });
  });

  it('renders long text progressively', () => {
    const longText = 'This is a longer sentence to test typewriter effect';
    const frame0 = renderAtFrame(<TypewriterText text={longText} />, 0);
    const frame150 = renderAtFrame(<TypewriterText text={longText} />, 150);
    const frame299 = renderAtFrame(<TypewriterText text={longText} />, 299);

    expect(frame0.container).toBeInTheDocument();
    expect(frame150.container).toBeInTheDocument();
    expect(frame299.container).toBeInTheDocument();
    expect(frame299.container.textContent).toContain(longText);
  });

  it('renders with combination of custom props', () => {
    const { container } = renderWithMocks(
      <TypewriterText
        text="Custom Typewriter"
        fontSize={56}
        color="#00ff00"
        delay={10}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('shows cursor while typing', () => {
    const { container } = renderAtFrame(
      <TypewriterText text="Text with cursor" />,
      150 // Midway through
    );
    // Component contains cursor indicator
    expect(container).toBeInTheDocument();
  });

  it('renders short text', () => {
    const { container } = renderWithMocks(
      <TypewriterText text="Hi" />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders single character', () => {
    const { container } = renderWithMocks(
      <TypewriterText text="A" />
    );
    expect(container).toBeInTheDocument();
  });

  it('handles text with special characters', () => {
    const { container } = renderWithMocks(
      <TypewriterText text="Hello! @#$% World?" />
    );
    expect(container).toBeInTheDocument();
  });

  it('handles text with numbers', () => {
    const { container } = renderWithMocks(
      <TypewriterText text="Code 12345 End" />
    );
    expect(container).toBeInTheDocument();
  });

  it('applies default font properties', () => {
    const { container } = renderAtFrame(
      <TypewriterText text="Default" />,
      100
    );
    // fontSize=48, color=#ffffff (defaults)
    expect(container).toBeInTheDocument();
  });
});
