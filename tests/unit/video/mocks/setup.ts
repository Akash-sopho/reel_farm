import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockUseCurrentFrame, resetMocks } from './remotion';

// Reset mocks before each test
beforeEach(() => {
  resetMocks();
  jest.clearAllMocks();
});

// Test helper to render with mocked frame number
export const renderWithMocks = (component: React.ReactElement, frameNumber = 0) => {
  mockUseCurrentFrame.mockReturnValue(frameNumber);
  return render(component);
};

// Test helper to render at specific frame
export const renderAtFrame = (component: React.ReactElement, frame: number) => {
  mockUseCurrentFrame.mockReturnValue(frame);
  return render(component);
};
