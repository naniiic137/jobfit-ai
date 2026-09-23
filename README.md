# JobFit AI

**Paste your CV and a job ad. Get a match score, the skills you're missing, sharper CV bullets, a cover-letter draft (English or French) and likely interview questions. It never invents experience you don't have.**

[![CI](https://github.com/naniiic137/jobfit-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/naniiic137/jobfit-ai/actions/workflows/ci.yml)

**Live demo:** https://naniiic137.github.io/jobfit-ai/

It runs entirely in the browser. There is no backend and nothing to pay for:

- **Offline demo mode** (default): works with no API key and no network. Keyword analysis against a curated skills taxonomy, plus templates.
- **Google Gemini**: bring a free-tier API key from Google AI Studio.
- **Ollama**: a model running on your own machine.
- **Any OpenAI-compatible API**: for example Groq's free tier, OpenRouter or LM Studio.

![Input screen with the sample CV and job ad](docs/screenshots/01-input.png)

## Screenshots

| Results: score, coverage, matched and missing skills | Cover-letter draft (copy, or download as .txt / .md) |
| --- | --- |
| ![Results](docs/screenshots/02-results.png) | ![Cover letter](docs/screenshots/03-cover-letter.png) |
| **Tailored CV bullets (before / after, placeholders for real numbers)** | **Provider settings and privacy note** |
| ![Bullet suggestions](docs/screenshots/04-bullets.png) | ![Settings](docs/screenshots/05-settings.png) |

<p align="center">
  <img src="docs/screenshots/06-mobile.png" alt="Mobile view at 390px" width="260" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/07-light-theme.png" alt="Light theme" width="520" />
</p>

All screenshots use the bundled sample CV and job ad in offline mode. The candidate "Sami Ben Salah" and the company "Nimbus Labs" are made up.

## Features

- **CV input:** paste it, or upload a PDF. Text is extracted in the browser with pdf.js, which is lazy-loaded so it is only downloaded when you need it.
- **Match score from 0 to 100** with a breakdown by category (languages, frontend, backend, data, DevOps, AI, tools, practices, soft skills).
- **Matched and missing skill chips.** Missing skills are marked *required* or *nice to have*, based on the section of the ad (and the clause of the line) they appear in. Hover a matched chip to see the CV line that proves it. When an LLM claims a skill but its quote is not in your CV, it is shown apart as *claimed, not found in CV* and earns no points.
- **Coverage note.** The results say how many skills were recognised in the ad, and warn when there are too few for the score to mean much (for example a non-software ad in offline mode).
- **Tailored CV bullets** shown as before/after. Weak verbs get replaced, the ad's spelling of a product is reused when it is only a spelling difference ("ReactJS" becomes "React"), and a highlighted placeholder asks for a *real* metric. Other products and versions are never rewritten: "GitLab CI" stays "GitLab CI", "Zustand" never becomes "Redux", "Java 17" keeps its version.
- **Cover-letter draft** in English or French: copy it, or download it as `.txt` or `.md`.
- **Likely interview questions**, each with why it may be asked and a tip that points back to your own CV.
- **History** of past analyses, kept in localStorage (last 20) and validated when loaded, so an old or corrupted entry is dropped instead of breaking the page.
- **LLM requests you control:** a Cancel button while a model is answering, a 90-second timeout with a readable error, and a warning when your CV or the ad is longer than the 12,000 characters sent to the model.
- **Sample CV and job ad** so you can try it in one click.
- Dark and light themes, responsive down to 390px, keyboard-accessible tabs and dialogs, and a skip link.

## How it works

```
                      ┌──────────────────────────────┐
  CV (paste / PDF) ──►│                              │
                      │   runAnalysis(settings, …)   │
  Job ad ────────────►│                              │
                      └──────────────┬───────────────┘
                                     │
          ┌──────────────────────────┴───────────────────────────┐
          │ provider = offline                                   │ provider = gemini | ollama | openai
          ▼                                                      ▼
┌──────────────────────────┐              ┌──────────────────────────────────────────────┐
│ Offline analyzer         │              │ prompts/  system rules + few-shot (EN or FR) │
│ • taxonomy (177 skills,  │   pre-scan   │           + <cv>/<job_ad> fenced input       │
│   EN + FR synonyms)      │─────hint────►│ providers/ gemini · ollama · openaiCompat    │
│ • section detection      │              │           (raw text out, JSON requested)     │
│   (required / nice /     │              │ run.ts    extractJson → zod.safeParse        │
│   responsibilities /     │              │           invalid? → 1 repair call with the  │
│   perks)                 │              │           validation errors → zod again      │
│ • templates (EN / FR)    │              └──────────────────────┬───────────────────────┘
└────────────┬─────────────┘                                     │
             │           AnalysisPayload (the same zod schema)   │
             └──────────────────────────┬────────────────────────┘
                                        ▼
                 ┌──────────────────────────────────────────────┐
                 │ finalize()                                   │
                 │ • dedupe skills                              │
                 │ • verify every "in CV" claim against the CV  │
                 │   (evidence quote or taxonomy)               │
                 │ • compute score + breakdown (app-side)       │
                 └──────────────────────┬───────────────────────┘
                                        ▼
                         React UI  ·  localStorage history
```

**Every provider returns the same `AnalysisPayload`** (`src/schemas/analysis.ts`). The offline analyzer builds it deterministically, and LLM providers are asked to return it as JSON. Either way it goes through the same `finalize()` step.

**The score is computed by the app, not by the model.** Each skill the job ad asks for is labelled `required` or `nice`. Required skills weigh 3, nice-to-haves 1, and soft skills count half because a CV can't really prove them. The score is the weighted share you cover. The same formula is used for every provider, so an LLM can't hand out a "92" that contradicts its own skill list.

### Offline analyzer (no key needed)

1. **Extraction.** `src/analyzer/taxonomy.ts` holds 177 hand-picked skills, one per product, with their spelling variants (`ReactJS`, `Postgres`, `K8s`…) and French synonyms (`travail en équipe`, `tests unitaires`, `intégration continue`…). Matching ignores accents and case, handles tokens like `C++`, `C#`, `.NET`, `Node.js` and `CI/CD`, doesn't confuse `Java` with `JavaScript`, and lets the longer mention win ("GitHub Actions" is the CI tool, not also "GitHub"). All terms are compiled into one longest-first regex.
2. **Different products stay different.** "Zustand" is not "Redux", "GitLab" is not "Git", "TensorFlow" is not "PyTorch", "real-time" is not "WebSockets". When one product really proves another, that is an explicit, one-way implication (`IMPLIES`): Helm ⇒ Kubernetes, GitHub ⇒ Git, MySQL ⇒ SQL and relational databases, NestJS ⇒ Node.js and TypeScript. The evidence shown is the line of the more specific product.
3. **Ambiguous words need context.** `Go`, `Rust`, `Express` and `Swift` only count with their capital letter in a list-like context. `Claude`, `Gemini`, `Llama` and `GPT` are case-sensitive and need an AI word on the same line (API, model, LLM, prompt…) or a version (`GPT-4o`, `Llama 3`), so "Claude Martin" is a person, not an LLM. The CV's name line, e-mail addresses and URLs are masked before extraction. Bare `REST` counts (case-sensitive), "rest" does not.
4. **Section detection.** `src/analyzer/sections.ts` splits the ad into *intro / requirements / nice-to-have / responsibilities / company / perks* using English and French headings ("Profil recherché", "Atouts", "Vos missions"…). Inline markers such as "is a plus" or "serait un plus" are read per clause: in "React is required, TypeScript is a plus" only TypeScript becomes a nice-to-have, while "Docker, Kubernetes and Terraform are a plus" covers the whole list. Skills that only appear under perks ("AWS training budget") are ignored.
5. **Templates.** Bullet rewrites, gap advice, cover letter and interview questions come from EN/FR templates (`src/analyzer/templates.ts`). They only use **direct quotes from the CV** or **clearly marked placeholders**. A skill the keyword scan did not find is never turned into "I have not used X": the letter says it is an area to keep developing. French letters open with "Madame, Monsieur," and avoid gendered adjectives.

### Golden-set evaluation

`src/analyzer/golden.fixtures.ts` holds 8 hand-labelled CV/ad pairs (five from an external code review, the bundled sample, an AI-engineer pair and a French Angular pair) with the skills a careful recruiter would extract, their importance and whether the CV proves them. Skills the taxonomy doesn't know (Oracle, Istio, a nursing licence…) are labelled too, so recall is honest. `npm test` prints:

```
case                                     ext P   ext R  import match P match R
1 Java backend (EN)                     100.0%   92.9%  100.0%  100.0%  100.0%
2 French full-stack (FR)                100.0%  100.0%  100.0%  100.0%  100.0%
3 Marketing CV vs DevOps ad             100.0%   84.2%  100.0%  100.0%  100.0%
4 "required, … is a plus" + Zustand     100.0%  100.0%  100.0%  100.0%  100.0%
5 Non-tech (nurse) ad                   100.0%   20.0%  100.0%  100.0%  100.0%
6 Bundled sample                        100.0%  100.0%  100.0%  100.0%  100.0%
7 AI engineer (RAG, Claude API)         100.0%  100.0%  100.0%  100.0%  100.0%
8 Angular (FR, inline "est un plus")    100.0%   90.0%  100.0%  100.0%  100.0%
------------------------------------------------------------------------------
ALL (micro-average)                     100.0%   91.4%  100.0%  100.0%  100.0%
(105 labelled skills; recall counts 9 skills outside the taxonomy as misses)
```

*ext* is skill extraction from the ad, *import* is required vs nice-to-have, and *match* is "the CV proves it". Match precision is the honesty metric and the test requires it to stay at 100%. The set is small and was labelled for this project (not by independent annotators), so treat it as a regression guard rather than a benchmark.

## Prompt-engineering approach

The prompts live in `src/prompts/`:

| File | What it does |
| --- | --- |
| `system.ts` | System instructions. **Grounding rules come first**, then the output spec, then language and format rules. |
| `fewshot.ts` | One compact worked example per output language (CV, ad and the full JSON answer, in English and in French). The one matching the requested language is used. Unit tests validate both against the zod schema, so they can't drift from what the app accepts. |
| `build.ts` | Builds the messages (`system` + few-shot pair + real request), fences the untrusted input, and builds the repair prompt. |
| `limits.ts` | The 12,000-character input limit, shared with the UI so it can warn before anything is cut. |

**The grounding rule (the most important one):**

> Never invent experience, employers, dates, numbers, degrees, certificates or skills that the CV does not contain.

In practice this means:

- A skill can only be `inCv: true` with an **`evidence` quote copied verbatim from the CV**. After the response comes back, `finalize()` checks each quote against the CV text, ignoring case, quotes and whitespace and allowing `…` cuts. A claim that can't be verified is shown as *unverified* and **earns no points**.
- Rewritten bullets may rephrase and reorder, but must keep the facts. Missing metrics become placeholders like `[add real number of users]`, never invented numbers.
- The cover letter may only claim what the CV supports. For missing skills it expresses willingness to learn.

**Structured output, validated and repaired:**

1. The request asks for JSON: Gemini gets `responseMimeType: application/json` plus a `responseJsonSchema` generated from the zod schema (`z.toJSONSchema`), Ollama gets the schema through `format`, and OpenAI-compatible APIs get `response_format: { type: "json_schema" }` with the same schema. If an endpoint or model rejects that with a 400/422, the app falls back to `json_object` for it.
2. The reply goes through `extractJson`, which tolerates markdown fences and surrounding prose, and then `AnalysisPayloadSchema.safeParse`.
3. If validation fails, **one repair call** is made. It replays the bad answer with the exact zod errors (`skills.0.importance: Invalid option…`) and asks for a corrected object. If that fails too, the user sees a clear error instead of half-broken data.

**Other prompt details:**

- **Prompt-injection guard.** The CV and the ad are wrapped in `<cv>` / `<job_ad>` tags, closing tags inside them are neutralised, and the system prompt says their content is data, not instructions.
- **Pre-scan hint.** The deterministic keyword scan is passed along as a hint labelled "may be incomplete or wrong — verify against the texts". This helps small local models not to miss obvious skills.
- **Context limits.** Inputs are clipped to 12,000 characters each so requests stay within free-tier limits. The UI warns before you analyse, and the result keeps a note, when something was cut.
- **Timeouts and cancel.** Every request is combined with `AbortSignal.timeout(90 s)`; a slow model ends with a readable "timed out" error instead of spinning forever, and the Cancel button aborts the same request.
- **Versioned prompts.** `PROMPT_VERSION` is stored on every LLM result (shown in the provider badge tooltip), so an old analysis in the history can be traced to the prompt that produced it.

## Privacy

- **There is no JobFit server.** The app is static files on GitHub Pages.
- **Offline mode sends nothing anywhere.** Your CV and the ad stay in your browser.
- With an AI provider, the CV and the ad are sent **only to the provider you pick** (Google, your local Ollama, or the base URL you enter).
- **API keys are kept in `sessionStorage` by default**, so they are gone when you close the browser. Tick *Remember API keys on this device* to keep them in `localStorage` instead. Keys are sent only to the provider you pick; Gemini keys go in the `x-goog-api-key` header, never in the URL. Settings has a **Forget keys** button, which is worth using on a shared computer.
- **Content Security Policy.** The built page carries a CSP that only allows network requests to itself, the known LLM providers (Google, Groq, OpenRouter, OpenAI, Mistral, Together, DeepSeek) and `localhost` for Ollama or LM Studio. Scripts must come from the site itself (the one inline script is allowed by its hash). An OpenAI-compatible endpoint on another host is blocked by the browser; add it to `CONNECT_SRC` in `src/lib/csp.ts` if you self-host.
- **No third-party requests.** Fonts (Inter and Space Grotesk) are bundled with the app instead of loaded from Google Fonts, so opening the page doesn't contact anyone else.
- History and drafts are also kept in `localStorage` and can be cleared from the History dialog.
- Calling an LLM API directly from the browser means the key sits in the browser. That is fine for a personal key on your own machine, but don't paste a key you share with others.

## Run locally

Requirements: Node.js 20+ (CI uses Node 22).

```bash
git clone https://github.com/naniiic137/jobfit-ai.git
cd jobfit-ai
npm install
npm run dev        # http://localhost:5182/jobfit-ai/
```

Click **Try the sample CV + job ad**, then **Analyse match**.

### Using a free LLM (optional)

- **Gemini:** create a key at <https://aistudio.google.com/apikey>, then open the provider pill in the top bar and choose *Google Gemini*. The default model is `gemini-3.5-flash-lite`. Model names change often, so the field is editable (suggestions: `gemini-3.8-flash`, `gemini-flash-latest`, `gemini-2.5-flash`).
- **Ollama:** `ollama pull llama3.2`. Browsers can only call Ollama if it allows your origin, so start it with `OLLAMA_ORIGINS`:
  ```bash
  # macOS / Linux
  OLLAMA_ORIGINS="https://naniiic137.github.io,http://localhost:5182" ollama serve
  # Windows (PowerShell)
  $env:OLLAMA_ORIGINS="https://naniiic137.github.io,http://localhost:5182"; ollama serve
  ```
- **OpenAI-compatible (for example Groq):** base URL `https://api.groq.com/openai/v1`, your key, and a model such as `llama-3.3-70b-versatile`.

## Tests

```bash
npm test           # Vitest: 176 tests in 14 files (prints the golden-set table)
npm run build      # tsc --noEmit (strict) + vite build
```

What the tests cover:

- **Extraction** (`extract.test.ts`): special-character tokens, Java vs JavaScript, spelling variants, French synonyms, ambiguous words, different products kept apart (Zustand/Redux, GitLab/Git, TensorFlow/PyTorch…), one-way implications, LLM names needing context, the CV header being ignored, bare "REST", evidence snippets.
- **Section detection** (`sections.test.ts`): English and French headings, key/value lines, inline "is a plus" markers read per clause ("React is required, TypeScript is a plus"), ignored perks, strongest importance wins.
- **Scoring** (`score.test.ts`): weights, bands, category breakdown.
- **Facts** (`facts.test.ts`): years of experience from explicit text or date ranges (education excluded), job title and company, CV name, bullets and projects.
- **Offline analyzer** (`offline.test.ts`): end-to-end on the sample. The output passes the LLM schema, every evidence quote exists in the CV, the cover letter never claims missing skills nor says "I have not used X", metrics are placeholders, and French output and French ads work. Regression tests check that "GitLab CI", "Zustand", "TensorFlow" and "Java 17" bullets are never rewritten into another product or version, and that the summary never contradicts itself.
- **Golden set** (`golden.test.ts`): precision/recall on 8 labelled pairs, with 100% "CV proves it" precision required.
- **Grounding checks** (`finalize.test.ts`): invented evidence is flagged and earns no points.
- **zod schemas** (`analysis.test.ts`): the few-shot example is valid, bad shapes are rejected, and the JSON Schema export is checked.
- **Prompt builders** (`prompts.test.ts`): grounding rule, language, fencing and injection guard, clipping, repair prompt.
- **Provider pipeline** (`run.test.ts`): JSON extraction, validate → repair → give up, offline mode makes no network call, the Gemini request shape (key in a header, roles mapped, JSON mode on), the 90 s timeout and user cancel, and the OpenAI-compatible `json_schema` → `json_object` fallback, with `fetch` mocked.
- **Storage** (`storage.test.ts`, jsdom): history round-trip, invalid and corrupted entries dropped, v1 migration, API keys in sessionStorage unless "remember" is on.
- **CSP** (`csp.test.ts`): provider hosts and localhost allowed, other hosts not, the inline script hashed, no Google Fonts.
- **Components** (`App.test.tsx`, `Results.test.tsx`, jsdom + Testing Library): the analyse flow, the minimum-length hint, provider errors in the alert, a missing key caught before any request, Cancel and abort on unmount, the truncation warning, tabs keyboard navigation, the "claimed, not found in CV" chips and the coverage note.

## Project structure

```
src/
├── analyzer/          # deterministic engine (offline mode + scoring for all modes)
│   ├── taxonomy.ts    # 177 skills, variants, French synonyms, one-way implications
│   ├── extract.ts     # accent-insensitive token matching, CV header masking, evidence snippets
│   ├── sections.ts    # required / nice-to-have / responsibilities / perks, per-clause markers
│   ├── facts.ts       # name, bullets, projects, years; job title, company, min years
│   ├── score.ts       # weighted score, category breakdown, bands
│   ├── templates.ts   # EN/FR strings, weak-verb table, interview question bank
│   ├── offline.ts     # analyzeOffline(): builds the AnalysisPayload
│   ├── runOffline.ts  # offline path in one call (no zod, no providers)
│   ├── finalize.ts    # dedupe, evidence verification, score → AnalysisResult
│   └── golden.*.ts    # labelled evaluation set + precision/recall test
├── prompts/           # system.ts · fewshot.ts (EN + FR) · build.ts · limits.ts
├── providers/         # gemini.ts · ollama.ts · openaiCompat.ts · http.ts (timeout) · run.ts (validate + repair, lazy-loaded)
├── schemas/           # analysis.ts: zod schema + JSON Schema export · categories.ts (zod-free)
├── components/        # Results, ScoreGauge, SettingsDialog, HistoryDialog, Dialog, Icons
├── lib/               # pdf.ts (pdf.js), storage.ts + historySchema.ts, csp.ts, download.ts
├── data/samples.ts    # fictional sample CV + job ad
├── App.tsx · main.tsx · styles.css
.github/workflows/     # ci.yml (test + build) · deploy.yml (GitHub Pages)
docs/screenshots/
```

## Tech stack

React 18 · TypeScript (strict) · Vite · zod (lazy-loaded) · pdf.js (`pdfjs-dist`) · Vitest · jsdom + Testing Library · self-hosted fonts (Fontsource) · plain CSS with design tokens (dark and light themes) · GitHub Actions and GitHub Pages.
LLM providers: Google Gemini (Generative Language REST API), Ollama, and any OpenAI-compatible Chat Completions API.

## Limitations

- Offline mode is keyword-based. It only knows the skills in the taxonomy (the results say how many it recognised in each ad), and its cover letter is a template built from your own CV lines. A connected LLM writes more natural text.
- "X or Y" requirements are counted as two skills, so a CV with only one of them shows the other as missing.
- The Gemini, Ollama and OpenAI-compatible paths are covered by mocked tests, but real responses depend on the model you choose. Small local models may need the repair step more often.
- PDF import reads text-based PDFs. Scanned (image-only) CVs need to be pasted as text.

## Author

Built by **Hamza Ben Ismail** ([@naniiic137](https://github.com/naniiic137)), a junior full-stack developer based in Tunisia.

## License

© 2026 Hamza Ben Ismail. All rights reserved.
