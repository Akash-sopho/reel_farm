import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App from '../App';

describe('App', () => {
  it('should render without crashing', () => {
    render(<App />);
    expect(screen.getByText('Welcome to ReelForge')).toBeInTheDocument();
  });

  it('should render the Navbar', () => {
    render(<App />);
    expect(screen.getByText('ReelForge')).toBeInTheDocument();
  });

  it('should have a Browse Templates button', () => {
    render(<App />);
    const button = screen.getByRole('link', { name: /Browse Templates/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('href', '/templates');
  });
});
