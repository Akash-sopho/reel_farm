import React from 'react';
import { render } from '@testing-library/react';
import { StaticImage } from '../../../../src/video/src/components/StaticImage';
import { renderWithMocks } from '../mocks/setup';

describe('StaticImage', () => {
  it('renders with valid src URL', () => {
    const { container } = renderWithMocks(
      <StaticImage src="https://example.com/image.jpg" />
    );
    // Component should render without crashing
    expect(container).toBeInTheDocument();
  });

  it('renders with all optional props omitted', () => {
    const { container } = renderWithMocks(<StaticImage />);
    // Should render placeholder div without crashing
    const placeholder = container.querySelector('div');
    expect(placeholder).toBeInTheDocument();
    expect(placeholder?.textContent).toContain('No image provided');
  });

  it('shows placeholder when src is missing', () => {
    const { container } = renderWithMocks(<StaticImage />);
    const placeholder = container.querySelector('div');
    expect(placeholder?.textContent).toContain('No image provided');
    expect(placeholder?.style.backgroundColor).toBe('rgb(204, 204, 204)'); // #cccccc
  });

  it('renders with custom objectFit', () => {
    const { container } = renderWithMocks(
      <StaticImage src="https://example.com/image.jpg" objectFit="contain" />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with custom opacity', () => {
    const { container } = renderWithMocks(
      <StaticImage src="https://example.com/image.jpg" opacity={0.5} />
    );
    expect(container).toBeInTheDocument();
  });

  it('applies opacity to placeholder', () => {
    const { container } = renderWithMocks(<StaticImage opacity={0.5} />);
    const placeholder = container.querySelector('[style*="opacity"]');
    expect(placeholder?.style.opacity).toBe('0.5');
  });

  it('renders with valid objectFit options', () => {
    const objectFits: Array<'cover' | 'contain' | 'fill'> = ['cover', 'contain', 'fill'];
    objectFits.forEach(fit => {
      const { container } = renderWithMocks(
        <StaticImage src="https://example.com/image.jpg" objectFit={fit} />
      );
      expect(container).toBeInTheDocument();
    });
  });

  it('renders with edge case opacity values', () => {
    // Opacity 0
    const { rerender: rerender0 } = renderWithMocks(<StaticImage opacity={0} />);
    expect(rerender0).toBeDefined();

    // Opacity 1
    const { rerender: rerender1 } = renderWithMocks(<StaticImage opacity={1} />);
    expect(rerender1).toBeDefined();
  });
});
