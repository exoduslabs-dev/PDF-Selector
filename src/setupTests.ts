import '@testing-library/jest-dom';

// Mock fetch properly for Bun types
Object.defineProperty(global, 'fetch', {
  writable: true,
  value: jest.fn(),
});

// Mock apiCall function
jest.mock('./config/api', () => ({
  apiCall: jest.fn(),
}));

// Mock window.alert and window.confirm
Object.defineProperty(window, 'alert', {
  writable: true,
  value: jest.fn(),
});

Object.defineProperty(window, 'confirm', {
  writable: true,
  value: jest.fn(),
});

// Reset mocks between tests
afterEach(() => {
  jest.clearAllMocks();
});
