// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { KEYS } from './lib/storage';
import { DEFAULT_SETTINGS, type ProviderSettings } from './providers/types';

function useProvider(p: Partial<ProviderSettings>, apiKey = '') {
  localStorage.setItem(KEYS.settings, JSON.stringify({ ...DEFAULT_SETTINGS, ...p }));
  if (apiKey) sessionStorage.setItem(KEYS.apiKeys, JSON.stringify({ gemini: apiKey, openai: '' }));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('App — analyse flow', () => {
  it('analyses the sample offline, shows the results and saves them to history', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    render(<App />);

    const analyse = screen.getByRole('button', { name: 'Analyse match' });
    expect(analyse).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Try the sample CV/ }));
    expect(analyse).toBeEnabled();
    await user.click(analyse);

    expect(await screen.findByRole('heading', { level: 2, name: /Junior Full-Stack Developer/ })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/Analysis ready: score \d+ out of 100/);
    expect(screen.getByRole('list', { name: 'Matched skills' })).toHaveTextContent('React');
    expect(screen.getByRole('list', { name: 'Missing skills' })).toHaveTextContent('PostgreSQL');
    expect(screen.getByRole('button', { name: 'History (1)' })).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    // No Cancel button for the instant offline analysis.
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
  });

  it('asks for at least 80 characters in both texts', async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Your CV/), { target: { value: 'too short' } });
    expect(screen.getByText('Both texts need at least 80 characters.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyse match' })).toBeDisabled();
  });
});

describe('App — errors', () => {
  it('shows a readable error with its hint when the provider fails', async () => {
    const user = userEvent.setup();
    useProvider({ provider: 'gemini' }, 'bad-key');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 403 })));
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Try the sample CV/ }));
    await user.click(screen.getByRole('button', { name: 'Analyse match' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('HTTP 403: API key not valid Check your API key.');
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
  });

  it('explains a missing API key before calling anything', async () => {
    const user = userEvent.setup();
    useProvider({ provider: 'gemini' });
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Try the sample CV/ }));
    await user.click(screen.getByRole('button', { name: 'Analyse match' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Add a Gemini API key in Settings/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('App — LLM request lifecycle', () => {
  it('lets the user cancel a running request without showing an error', async () => {
    const user = userEvent.setup();
    useProvider({ provider: 'gemini' }, 'k');
    const fetchSpy = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(init.signal!.reason))),
    );
    vi.stubGlobal('fetch', fetchSpy);
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Try the sample CV/ }));
    await user.click(screen.getByRole('button', { name: 'Analyse match' }));

    const cancel = await screen.findByRole('button', { name: 'Cancel' });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    await user.click(cancel);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull());
    expect(screen.getByRole('status')).toHaveTextContent('Analysis cancelled.');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Analyse match' })).toBeEnabled();
  });

  it('aborts a running request when the app unmounts', async () => {
    const user = userEvent.setup();
    useProvider({ provider: 'gemini' }, 'k');
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        signal = init.signal!;
        return new Promise<Response>(() => {});
      }),
    );
    const { unmount } = render(<App />);
    await user.click(screen.getByRole('button', { name: /Try the sample CV/ }));
    await user.click(screen.getByRole('button', { name: 'Analyse match' }));
    await waitFor(() => expect(signal).toBeDefined());
    unmount();
    expect(signal!.aborted).toBe(true);
  });

  it('warns when the CV is longer than what is sent to the model', () => {
    useProvider({ provider: 'gemini' }, 'k');
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Your CV/), { target: { value: 'word '.repeat(3000) } });
    expect(screen.getByText(/Your CV is 14,999 characters; only the first 12,000 are sent to the model/)).toBeInTheDocument();
  });
});
