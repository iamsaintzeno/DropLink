import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the DropLink starting page', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'DropLink' }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'A simple starting point for sharing files between your devices.',
      ),
    ).toBeTruthy();
  });
});
