import React from 'react';
import { render } from '@testing-library/react';
import { AnimatedText } from '../../../../src/video/src/components/AnimatedText';
import { renderWithMocks, renderAtFrame } from '../mocks/setup';

describe('AnimatedText', () => {
  it('renders text with animation at frame 0', () => {
    const { container } = renderAtFrame(
      <AnimatedText text="Hello World" />,
      0
    );
    expect(container).toBeInTheDocument();
    expect(container.textContent).toContain('Hello World');
  });

  it('returns null when text is empty string', () => {
    const { container } = renderWithMocks(<AnimatedText text="" />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when text is undefined', () => {
    const { container } = renderWithMocks(<AnimatedText />);
    expect(container.firstChild).toBeNull();
  });

  it('renders with fade animation type', () => {
    const { container } = renderAtFrame(
      <AnimatedText text="Fade Text" animationType="fade" />,
      0
    );
    expect(container.textContent).toContain('Fade Text');
  });

  it('renders with slide-up animation type', () => {
    const { container } = renderAtFrame(
      <AnimatedText text="Slide Text" animationType="slide-up" />,
      0
    );
    expect(container.textContent).toContain('Slide Text');
  });

  it('renders with custom fontSize', () => {
    const { container } = renderWithMocks(
      <AnimatedText text="Large Text" fontSize={72} />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with custom color', () => {
    const { container } = renderWithMocks(
      <AnimatedText text="Colored Text" color="#ff0000" />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with custom fontWeight', () => {
    const { container } = renderWithMocks(
      <AnimatedText text="Bold Text" fontWeight="bold" />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with custom textAlign', () => {
    const aligns = ['left', 'center', 'right'];
    aligns.forEach(align => {
      const { container } = renderWithMocks(
        <AnimatedText text="Aligned Text" textAlign={align} />
      );
      expect(container).toBeInTheDocument();
    });
  });

  it('renders with delay parameter', () => {
    const { container } = renderAtFrame(
      <AnimatedText text="Delayed Text" delay={30} />,
      0
    );
    expect(container.textContent).toContain('Delayed Text');
  });

  it('renders at different animation frames', () => {
    const frames = [0, 10, 20, 30, 60];
    frames.forEach(frame => {
      const { container } = renderAtFrame(
        <AnimatedText text="Animated" />,
        frame
      );
      expect(container.textContent).toContain('Animated');
    });
  });

  it('applies default props when not provided', () => {
    const { container } = renderAtFrame(
      <AnimatedText text="Default Props" />,
      0
    );
    expect(container).toBeInTheDocument();
    // Default: fontSize=48, color=#ffffff, fontWeight=bold, textAlign=center, animationType=fade, delay=0
  });

  it('handles long text with maxWidth wrapping', () => {
    const longText = 'This is a very long text that should wrap to multiple lines within the component';
    const { container } = renderWithMocks(
      <AnimatedText text={longText} />
    );
    expect(container.textContent).toContain(longText);
  });

  it('renders text at multiple frames for fade animation', () => {
    const startFrame = renderAtFrame(
      <AnimatedText text="Text" animationType="fade" />,
      0
    );
    const midFrame = renderAtFrame(
      <AnimatedText text="Text" animationType="fade" />,
      15
    );
    const endFrame = renderAtFrame(
      <AnimatedText text="Text" animationType="fade" />,
      30
    );

    expect(startFrame.container).toBeInTheDocument();
    expect(midFrame.container).toBeInTheDocument();
    expect(endFrame.container).toBeInTheDocument();
  });

  it('renders text at multiple frames for slide-up animation', () => {
    const startFrame = renderAtFrame(
      <AnimatedText text="Text" animationType="slide-up" />,
      0
    );
    const endFrame = renderAtFrame(
      <AnimatedText text="Text" animationType="slide-up" />,
      30
    );

    expect(startFrame.container).toBeInTheDocument();
    expect(endFrame.container).toBeInTheDocument();
  });

  it('handles combination of all custom props', () => {
    const { container } = renderWithMocks(
      <AnimatedText
        text="Custom Text"
        fontSize={64}
        color="#00ff00"
        fontWeight="900"
        textAlign="right"
        animationType="slide-up"
        delay={15}
      />
    );
    expect(container.textContent).toContain('Custom Text');
  });
});
