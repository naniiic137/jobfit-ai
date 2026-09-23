// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { KEYS } from './lib/storage';
import { SAMPLE_CV } from './data/samples';
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

describe('App — stale results, French sample, history', () => {
  it('dims the old result and marks it out of date once the texts change', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Try the sample CV/ }));
    await user.click(screen.getByRole('button', { name: 'Analyse match' }));
    const title = await screen.findByRole('heading', { level: 2, name: /Junior Full-Stack Developer/ });
    const anchor = title.closest('.results-anchor')!;
    expect(anchor).not.toHaveClass('results-anchor--stale');
    expect(screen.queryByText(/Out of date/)).toBeNull();

    fireEvent.change(screen.getByLabelText(/Your CV/), { target: { value: 'too short' } });
    expect(screen.getByText('Both texts need at least 80 characters.')).toBeInTheDocument();
    expect(anchor).toHaveClass('results-anchor--stale');
    expect(screen.getByText(/Out of date/).parentElement).toHaveTextContent('Fix the texts above, then analyse again.');

    // Valid new texts: analysing again makes it current.
    fireEvent.change(screen.getByLabelText(/Your CV/), { target: { value: `${SAMPLE_CV}
Docker` } });
    expect(screen.getByText(/Out of date/).parentElement).toHaveTextContent('Analyse again to update them.');
    await user.click(screen.getByRole('button', { name: 'Analyse match' }));
    await waitFor(() => expect(screen.queryByText(/Out of date/)).toBeNull());
    expect(document.querySelector('.results-anchor')).not.toHaveClass('results-anchor--stale');
  });

  it('loads the French sample in French and shows French labels', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Français' }));
    await user.click(screen.getByRole('button', { name: /Try the sample CV/ }));
    const value = (label: RegExp) => (screen.getByLabelText(label) as HTMLTextAreaElement).value;
    expect(value(/Job ad/)).toContain('Profil recherché');
    expect(value(/Your CV/)).toContain('EXPÉRIENCE');
    await user.click(screen.getByRole('button', { name: 'Analyse match' }));
    expect(await screen.findByRole('heading', { level: 2, name: /Développeur Full-Stack Junior/ })).toBeInTheDocument();
    expect(screen.getByText('Requises')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Compétences présentes' })).toHaveTextContent('React');

    // Switching language while the untouched sample is loaded swaps it too.
    await user.click(screen.getByRole('radio', { name: 'English' }));
    expect(value(/Job ad/)).toContain('Requirements');
  });

  it('does not add a history entry twice for the same analysis', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Try the sample CV/ }));
    await user.click(screen.getByRole('button', { name: 'Analyse match' }));
    expect(await screen.findByRole('button', { name: 'History (1)' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Analyse match' }));
    await user.click(screen.getByRole('button', { name: 'Analyse match' }));
    expect(screen.getByRole('button', { name: 'History (1)' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(KEYS.history)!)).toHaveLength(1);
    // A different output language is a different analysis.
    await user.click(screen.getByRole('radio', { name: 'Français' }));
    await user.click(screen.getByRole('button', { name: 'Analyse match' }));
    expect(await screen.findByRole('button', { name: 'History (2)' })).toBeInTheDocument();
  });

  it('warns in the header when the saved provider has no API key', () => {
    useProvider({ provider: 'gemini' });
    render(<App />);
    expect(screen.getByRole('button', { name: 'AI provider: Gemini, API key missing. Change' })).toHaveTextContent('Gemini · no key');
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
