import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

function route(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1024,
  });
  vi.unstubAllGlobals();
});

describe('DropLink visual prototype', () => {
  it('shows the sender and its prototype state rail', () => {
    route('/send');
    expect(
      screen.getByRole('heading', { name: /Your files\. Either way\./ }),
    ).toBeTruthy();
    const headline = screen.getByRole('heading', {
      name: /Your files\. Either way\./,
    });
    expect(headline.textContent).toContain('Phone ↔ Computer.');
    expect(headline.textContent).toContain('Access expires in 30 minutes.');
    expect(
      screen.getByText(/Nothing is uploaded in this prototype/),
    ).toBeTruthy();
    expect(
      screen.getByRole('navigation', { name: 'Prototype state controls' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('navigation', { name: 'Transfer mode' }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: /SEND PC → PHONE/ })
        .getAttribute('aria-current'),
    ).toBe('page');
    expect(
      screen
        .getByRole('link', { name: /RECEIVE PHONE → PC/ })
        .getAttribute('href'),
    ).toBe('/receive');
  });

  it('selects files and rejects empty files with a polite result', () => {
    route('/send');
    const picker = document.querySelector('input[type="file"]')!;
    const nonempty = new File(['hello'], 'notes.txt', { lastModified: 1 });
    const empty = new File([], 'empty.txt', { lastModified: 2 });
    fireEvent.change(picker, { target: { files: [nonempty, empty] } });
    expect(screen.getByText('notes.txt')).toBeTruthy();
    expect(screen.getByText('Empty file. Not added.')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain(
      '1 file added. 1 not added',
    );
  });

  it('enforces the 10-file and 50 MB aggregate sender limits', () => {
    route('/send');
    const picker = document.querySelector('input[type="file"]')!;
    const ten = Array.from(
      { length: 10 },
      (_, index) =>
        new File(['x'], `file-${index}.txt`, { lastModified: index }),
    );
    fireEvent.change(picker, {
      target: { files: [...ten, new File(['x'], 'eleventh.txt')] },
    });
    expect(screen.getByText('Link is full. 10 of 10 files.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Empty' }));
    const almostFull = new File(['x'], 'almost-full.bin');
    Object.defineProperty(almostFull, 'size', { value: 50 * 1024 * 1024 - 1 });
    const exactLimitByte = new File(['x'], 'last-byte.txt');
    const overLimitByte = new File(['x'], 'over-limit.txt');
    fireEvent.change(picker, {
      target: { files: [almostFull, exactLimitByte, overLimitByte] },
    });
    expect(
      screen.getAllByText(/Would exceed 50 MB total/).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/50 MB · 0 B LEFT/)).toBeTruthy();
  });

  it('shows sample receiver for SAMPLE and a distinct simulated Not Found state', () => {
    route('/t/SAMPLE');
    expect(screen.getByText('sample-01.pdf')).toBeTruthy();
    expect(screen.getAllByText('SAMPLE · NOT LIVE').length).toBeGreaterThan(0);
    window.history.pushState({}, '', '/t/ABCDEF');
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'No transfer found.' }),
    ).toBeTruthy();
    expect(screen.getByText(/SIMULATED NOT FOUND/)).toBeTruthy();
  });

  it('shows active receive navigation and simulates valid codes without network calls', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    route('/receive');
    expect(
      screen
        .getByRole('link', { name: /RECEIVE PHONE → PC/ })
        .getAttribute('aria-current'),
    ).toBe('page');
    const input = screen.getByRole('textbox', {
      name: 'Six-character transfer code',
    });
    fireEvent.change(input, { target: { value: 'ABCDEF' } });
    expect((input as HTMLInputElement).value).toBe('ABCDEF');
    expect(
      screen.getByRole('heading', { name: 'No transfer found.' }),
    ).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the actual code input focus in sync with the visible focus slot', () => {
    route('/receive');
    const input = screen.getByRole('textbox', {
      name: 'Six-character transfer code',
    });
    expect(document.activeElement).toBe(input);
    expect(input.parentElement?.querySelector('.focused')).toBeTruthy();
    fireEvent.blur(input);
    expect(input.parentElement?.querySelector('.focused')).toBeNull();
  });

  it('lets the motion control toggle the nonessential motion class', () => {
    route('/send');
    const shell = document.querySelector('.sender-shell')!;
    const toggle = screen.getByRole('button', { name: /MOTION:/ });
    const initialPressed = toggle.getAttribute('aria-pressed') === 'true';
    expect(shell.classList.contains('motion-disabled')).toBe(!initialPressed);
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe(String(!initialPressed));
    expect(shell.classList.contains('motion-disabled')).toBe(initialPressed);
  });

  it('disables motion by default when the system requests reduced motion', () => {
    const originalMatchMedia = window.matchMedia;
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({
        matches: true,
        addEventListener,
        removeEventListener,
      }),
    });

    try {
      const app = route('/send');
      expect(
        document
          .querySelector('.sender-shell')
          ?.classList.contains('motion-disabled'),
      ).toBe(true);
      expect(
        screen
          .getByRole('button', { name: /MOTION: OFF/ })
          .getAttribute('aria-pressed'),
      ).toBe('false');
      app.unmount();
      expect(removeEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      );
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: originalMatchMedia,
      });
    }
  });

  it('keeps Send and Receive as explicit choices at narrow and wide widths', () => {
    for (const width of [390, 1440]) {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: width,
      });
      const sender = route('/send');
      expect(
        screen.getByRole('link', { name: /SEND PC → PHONE/ }),
      ).toBeTruthy();
      expect(
        screen.getByRole('link', { name: /RECEIVE PHONE → PC/ }),
      ).toBeTruthy();
      sender.unmount();

      const receiver = route('/receive');
      expect(
        screen.getByRole('link', { name: /SEND PC → PHONE/ }),
      ).toBeTruthy();
      expect(
        screen.getByRole('link', { name: /RECEIVE PHONE → PC/ }),
      ).toBeTruthy();
      receiver.unmount();
    }
  });

  it('opens the sample file list when SAMPLE is entered', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    route('/receive');
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Six-character transfer code' }),
      { target: { value: 'SAMPLE' } },
    );
    expect(screen.getByText('sample-01.pdf')).toBeTruthy();
    expect(screen.getAllByText('SAMPLE · NOT LIVE').length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps malformed code entry local and explains the required format', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    route('/receive');
    const input = screen.getByRole('textbox', {
      name: 'Six-character transfer code',
    });
    fireEvent.change(input, { target: { value: 'ABCDE' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByRole('status').textContent).toBe(
      'Enter a valid six-character code.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lists sample files and labels preview download actions as nonfunctional', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    route('/t/SAMPLE');
    expect(screen.getByRole('list').querySelectorAll('li')).toHaveLength(4);
    fireEvent.click(
      screen.getByRole('button', { name: 'Download sample-01.pdf' }),
    );
    expect(screen.getByRole('status').textContent).toBe(
      'Not connected in this prototype.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('removes lookalike characters from code entry and explains the rule', () => {
    route('/receive');
    const input = screen.getByRole('textbox', {
      name: 'Six-character transfer code',
    });
    fireEvent.change(input, { target: { value: 'AB0DEF' } });
    expect((input as HTMLInputElement).value).toBe('ABDEF');
    expect(screen.getByRole('status').textContent).toBe(
      "0 isn't used in codes.",
    );
  });
});
