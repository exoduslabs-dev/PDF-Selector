import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Simple test component
const TestComponent = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="test-component">{children}</div>
);

describe('Material Components - Basic Test', () => {
  test('renders test component', () => {
    render(<TestComponent>Hello World</TestComponent>);
    
    expect(screen.getByTestId('test-component')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  test('API mock is working', () => {
    // Just test that our setup is working
    expect(jest).toBeDefined();
    expect(global.fetch).toBeDefined();
  });
});
