import { afterEach, describe, expect, it, vi } from 'vitest';
import { completeWithRepair, extractJson, runAnalysis, validatePayload } from './run';
import { FEW_SHOT_ANSWER, FEW_SHOT_CV, FEW_SHOT_JOB } from '../prompts/fewshot';
import { geminiClient, geminiRequestBody } from './gemini';
import { postJson } from './http';
import { openAiCompatClient } from './openaiCompat';
import { DEFAULT_SETTINGS, ProviderError, type CompletionRequest, type LlmClient } from './types';
import { buildAnalysisPrompt } from '../prompts/build';
import { SAMPLE_CV, SAMPLE_JOB } from '../data/samples';

const GOOD = JSON.stringify(FEW_SHOT_ANSWER);

function fakeClient(outputs: string[]): LlmClient & { calls: CompletionRequest[] } {
  const calls: CompletionRequest[] = [];
  return {
    id: 'gemini',
    model: 'fake',
    calls,
    async complete(req) {
      calls.push(req);
      const next = outputs.shift();
      if (next === undefined) throw new Error('no more outputs');
      return next;
    },
  };
}

describe('extractJson', () => {
  it('parses plain JSON, fenced JSON and JSON wrapped in prose', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Sure! Here it is: {"a":{"b":2}} Hope it helps.')).toEqual({ a: { b: 2 } });
  });
  it('throws when there is no object', () => {
    expect(() => extractJson('no json here')).toThrow();
  });
});

describe('validatePayload', () => {
  it('returns readable paths for schema errors', () => {
    const r = validatePayload(JSON.stringify({ ...FEW_SHOT_ANSWER, skills: 'React' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/^skills:/);
  });
});

describe('completeWithRepair', () => {
  it('returns valid output on the first try', async () => {
    const c = fakeClient([GOOD]);
    const { payload, info } = await completeWithRepair(c, FEW_SHOT_CV, FEW_SHOT_JOB, 'en');
    expect(payload.company).toBe('Sunny Travel');
    expect(info).toEqual({ attempts: 1, repaired: false });
    expect(c.calls[0]!.jsonSchema.type).toBe('object');
  });

  it('repairs once with the validation errors in the prompt', async () => {
    const broken = JSON.stringify({ ...FEW_SHOT_ANSWER, coverLetter: undefined });
    const c = fakeClient([broken, `\`\`\`json\n${GOOD}\n\`\`\``]);
    const { info } = await completeWithRepair(c, FEW_SHOT_CV, FEW_SHOT_JOB, 'en');
    expect(info).toEqual({ attempts: 2, repaired: true });
    const repairMsg = c.calls[1]!.prompt.messages.at(-1)!.content;
    expect(repairMsg).toContain('coverLetter');
    expect(c.calls[1]!.prompt.messages.at(-2)!.content).toBe(broken);
  });

  it('gives up after one repair attempt', async () => {
    const c = fakeClient(['not json', '{"still":"wrong"}', GOOD]);
    await expect(completeWithRepair(c, 'cv', 'job', 'en')).rejects.toBeInstanceOf(ProviderError);
    expect(c.calls).toHaveLength(2);
  });
});

describe('runAnalysis', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses the offline analyzer without any network call by default', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { result, info } = await runAnalysis(DEFAULT_SETTINGS, SAMPLE_CV, SAMPLE_JOB, 'en');
    expect(result.provider).toBe('offline');
    expect(result.scoreDetails.score).toBeGreaterThan(0);
    expect(info).toBeNull();
    expect(result.promptVersion).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('calls Gemini with the key in a header (not the URL) and validates the answer', async () => {
    const fetchSpy = vi.fn(async () =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: GOOD }] } }] }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchSpy);
    const settings = { ...DEFAULT_SETTINGS, provider: 'gemini' as const, gemini: { apiKey: 'test-key', model: 'gemini-x' } };
    const { result } = await runAnalysis(settings, FEW_SHOT_CV, FEW_SHOT_JOB, 'en');
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-x:generateContent');
    expect(url).not.toContain('test-key');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('test-key');
    expect(result.provider).toBe('gemini');
    expect(result.skills.find((s) => s.name === 'Vue.js')!.verified).toBe(true);
    expect(result.promptVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('adds a note when the CV had to be truncated for the model', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: GOOD }] } }] }), { status: 200 })));
    const settings = { ...DEFAULT_SETTINGS, provider: 'gemini' as const, gemini: { apiKey: 'k', model: 'm' } };
    const { result } = await runAnalysis(settings, FEW_SHOT_CV + '\n' + 'x '.repeat(7000), FEW_SHOT_JOB, 'en');
    expect(result.notes.at(-1)).toMatch(/Your CV is .* only the first 12,000 are sent to the model/);
  });

  it('surfaces HTTP errors with a helpful message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 400 })));
    const c = geminiClient('bad', 'gemini-x');
    await expect(c.complete({ prompt: buildAnalysisPrompt('a', 'b', 'en'), jsonSchema: {} })).rejects.toThrow(/HTTP 400: API key not valid/);
  });
});

describe('geminiRequestBody', () => {
  it('maps roles, sets the system instruction and requests JSON output', () => {
    const body = geminiRequestBody({ prompt: buildAnalysisPrompt('cv', 'job', 'en'), jsonSchema: { type: 'object' } }) as {
      contents: Array<{ role: string }>;
      systemInstruction: { parts: Array<{ text: string }> };
      generationConfig: Record<string, unknown>;
    };
    expect(body.contents.map((c) => c.role)).toEqual(['user', 'model', 'user']);
    expect(body.systemInstruction.parts[0]!.text).toMatch(/Grounding rules/);
    expect(body.generationConfig).toMatchObject({ responseMimeType: 'application/json', responseJsonSchema: { type: 'object' } });
  });
});

describe('postJson timeout and cancel', () => {
  afterEach(() => vi.unstubAllGlobals());

  /** A fetch that never answers, but rejects like the real one when its signal aborts. */
  const hangingFetch = () =>
    vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal!.addEventListener('abort', () => reject(init.signal!.reason));
        }),
    );

  it('turns a slow provider into a readable "timed out" error', async () => {
    vi.stubGlobal('fetch', hangingFetch());
    const err = await postJson('https://api.example.com/v1/chat', {}, { timeoutMs: 30 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect((err as ProviderError).message).toMatch(/api\.example\.com timed out after 0 s/);
    expect((err as ProviderError).hint).toMatch(/offline mode/);
  });

  it('lets a user cancel through as an AbortError (not an error message)', async () => {
    vi.stubGlobal('fetch', hangingFetch());
    const ctrl = new AbortController();
    const p = postJson('https://api.example.com/v1/chat', {}, { signal: ctrl.signal, timeoutMs: 60_000 });
    ctrl.abort();
    const err = await p.catch((e: unknown) => e);
    expect(err).not.toBeInstanceOf(ProviderError);
    expect((err as Error).name).toBe('AbortError');
  });
});

describe('openAiCompatClient', () => {
  afterEach(() => vi.unstubAllGlobals());
  const ok = () => new Response(JSON.stringify({ choices: [{ message: { content: GOOD } }] }), { status: 200 });
  const bodyOf = (call: unknown[]) => JSON.parse((call[1] as RequestInit).body as string) as { response_format: { type: string; json_schema?: { schema: unknown } } };

  it('asks for the exact JSON Schema first', async () => {
    const fetchSpy = vi.fn(async () => ok());
    vi.stubGlobal('fetch', fetchSpy);
    const c = openAiCompatClient('https://api.example.com/v1/', 'k', 'model-a');
    await c.complete({ prompt: buildAnalysisPrompt('cv', 'job', 'en'), jsonSchema: { type: 'object' } });
    const body = bodyOf(fetchSpy.mock.calls[0] as unknown[]);
    expect(body.response_format.type).toBe('json_schema');
    expect(body.response_format.json_schema!.schema).toEqual({ type: 'object' });
    expect((fetchSpy.mock.calls[0] as unknown[])[0]).toBe('https://api.example.com/v1/chat/completions');
  });

  it('falls back to json_object when the endpoint rejects json_schema with a 400, and remembers it', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'response_format json_schema not supported' } }), { status: 400 }))
      .mockImplementation(async () => ok());
    vi.stubGlobal('fetch', fetchSpy);
    const c = openAiCompatClient('https://old.example.com/v1', '', 'model-b');
    const req = { prompt: buildAnalysisPrompt('cv', 'job', 'en'), jsonSchema: { type: 'object' } };
    expect(await c.complete(req)).toBe(GOOD);
    expect(fetchSpy.mock.calls.map((call) => bodyOf(call as unknown[]).response_format.type)).toEqual(['json_schema', 'json_object']);
    await c.complete(req);
    expect(bodyOf(fetchSpy.mock.calls[2] as unknown[]).response_format.type).toBe('json_object');
  });

  it('does not hide other errors behind the fallback', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"bad key"}', { status: 401 })));
    const c = openAiCompatClient('https://api.example.com/v1', 'bad', 'model-c');
    await expect(c.complete({ prompt: buildAnalysisPrompt('cv', 'job', 'en'), jsonSchema: {} })).rejects.toThrow(/HTTP 401: bad key Check your API key/);
  });
});
