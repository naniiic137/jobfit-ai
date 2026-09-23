// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SettingsDialog } from './SettingsDialog';
import { DEFAULT_SETTINGS, validateSettings, type ProviderSettings } from '../providers/types';

beforeAll(() => {
  // jsdom may not implement the modal dialog API.
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & { showModal?: () => void };
  if (!proto.showModal) proto.showModal = function (this: HTMLDialogElement) { this.open = true; };
  if (!proto.close) proto.close = function (this: HTMLDialogElement) { this.open = false; };
});

afterEach(cleanup);

const withProvider = (p: Partial<ProviderSettings>): ProviderSettings => ({ ...DEFAULT_SETTINGS, ...p });

describe('validateSettings', () => {
  it('accepts the offline demo and a Gemini key', () => {
    expect(validateSettings(DEFAULT_SETTINGS)).toEqual({});
    expect(validateSettings(withProvider({ provider: 'gemini', gemini: { apiKey: 'AIza-x', model: 'm' } }))).toEqual({});
  });

  it('asks for a key when a key-requiring provider has none', () => {
    expect(validateSettings(withProvider({ provider: 'gemini' }))).toHaveProperty('apiKey');
    expect(validateSettings(withProvider({ provider: 'gemini', gemini: { apiKey: '   ', model: 'm' } }))).toHaveProperty('apiKey');
    expect(validateSettings(withProvider({ provider: 'openai' }))).toHaveProperty('apiKey');
  });

  it('lets a local OpenAI-compatible server run without a key', () => {
    const local = withProvider({ provider: 'openai', openai: { baseUrl: 'http://localhost:1234/v1', apiKey: '', model: 'qwen' } });
    expect(validateSettings(local)).toEqual({});
  });

  it('checks URLs and model names', () => {
    const e = validateSettings(withProvider({ provider: 'ollama', ollama: { baseUrl: 'localhost 11434', model: '' } }));
    expect(Object.keys(e).sort()).toEqual(['baseUrl', 'model']);
  });
});

describe('SettingsDialog', () => {
  it('does not save Gemini without an API key and says why', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SettingsDialog open onClose={() => {}} settings={DEFAULT_SETTINGS} onSave={onSave} onForgetKeys={() => {}} />);
    await user.click(screen.getByRole('radio', { name: /Google Gemini/ }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).not.toHaveBeenCalled();
    const key = screen.getByLabelText(/^API key/);
    expect(key).toHaveAttribute('aria-invalid', 'true');
    expect(key).toHaveAccessibleDescription(/Gemini needs an API key/);

    // The message follows the input and goes away once the key is there.
    await user.type(key, 'AIza-test');
    expect(screen.queryByText(/Gemini needs an API key/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ provider: 'gemini', gemini: expect.objectContaining({ apiKey: 'AIza-test' }) }));
  });

  it('saves the offline demo straight away', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SettingsDialog open onClose={() => {}} settings={withProvider({ provider: 'gemini' })} onSave={onSave} onForgetKeys={() => {}} />);
    await user.click(screen.getByRole('radio', { name: /Offline demo/ }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ provider: 'offline' }));
  });
});
