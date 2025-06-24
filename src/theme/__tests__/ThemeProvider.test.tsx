import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '../ThemeProvider';

const TestComponent = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="resolved-theme">{resolvedTheme}</div>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('system')}>System</button>
    </div>
  );
};

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('should provide theme context', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('system');
  });

  it('should update theme when button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await user.click(screen.getByText('Light'));
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
    expect(document.documentElement).toHaveClass('light');

    await user.click(screen.getByText('Dark'));
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
    expect(document.documentElement).toHaveClass('dark');
  });

  it('should persist theme in localStorage', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider storageKey="test-theme">
        <TestComponent />
      </ThemeProvider>
    );

    await user.click(screen.getByText('Dark'));
    expect(localStorage.getItem('test-theme')).toBe('dark');
  });

  it('should load theme from localStorage', () => {
    localStorage.setItem('helios-theme', 'light');
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(document.documentElement).toHaveClass('light');
  });

  it('should throw error when used outside ThemeProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTheme must be used within a ThemeProvider');

    spy.mockRestore();
  });
});