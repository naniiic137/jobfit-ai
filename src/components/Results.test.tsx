// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Results } from './Results';
import { finalize } from '../analyzer/finalize';
import { runOffline } from '../analyzer/runOffline';
import { SAMPLE_CV, SAMPLE_JOB } from '../data/samples';
import { FEW_SHOT_ANSWER, FEW_SHOT_CV } from '../prompts/fewshot';

const NOW = new Date('2026-09-23T10:00:00Z');

afterEach(cleanup);

describe('Results tabs', () => {
  it('moves between tabs with the arrow keys (roving tabindex, wraps around)', async () => {
    const user = userEvent.setup();
    render(<Results result={runOffline(SAMPLE_CV, SAMPLE_JOB, 'en', NOW)} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Tailored bullets', 'Cover letter', 'Interview prep']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('tabindex', '-1');

    await user.click(tabs[0]!);
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Cover letter' })).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Cover letter' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Dear Nimbus Labs Hiring Team');

    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Tailored bullets' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Interview prep' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', screen.getByRole('tab', { name: 'Interview prep' }).id);
  });
});

describe('Results skill chips', () => {
  it('shows LLM claims that the CV cannot back up as "claimed, not found in CV", apart from matches', () => {
    const payload = {
      ...FEW_SHOT_ANSWER,
      skills: [
        ...FEW_SHOT_ANSWER.skills,
        { name: 'Docker', category: 'devops' as const, importance: 'required' as const, inCv: true, evidence: 'Deployed the widget with Docker' },
      ],
    };
    const r = finalize(payload, { cv: FEW_SHOT_CV, language: 'en', provider: 'gemini', model: 'm', now: NOW });
    render(<Results result={r} />);
    const matched = screen.getByRole('list', { name: 'Matched skills' });
    const claimed = screen.getByRole('list', { name: 'Claimed by the model but not found in your CV' });
    expect(within(matched).queryByText('Docker')).toBeNull();
    expect(within(claimed).getByText('Docker')).toBeInTheDocument();
    expect(within(claimed).getByText('claimed, not found in CV')).toBeInTheDocument();
    expect(within(matched).getByText('Vue.js')).toBeInTheDocument();
  });

  it('does not show the claimed section when every claim is verified', () => {
    render(<Results result={runOffline(SAMPLE_CV, SAMPLE_JOB, 'en', NOW)} />);
    expect(screen.queryByText(/Claimed by the model/)).toBeNull();
  });
});

describe('Results coverage note', () => {
  it('says how many skills the offline scan recognised', () => {
    const r = runOffline(SAMPLE_CV, SAMPLE_JOB, 'en', NOW);
    render(<Results result={r} />);
    expect(screen.getByText(`Recognised ${r.skills.length} skills in this ad; others aren't scored.`)).toBeInTheDocument();
  });

  it('warns when too few skills were recognised', () => {
    const r = runOffline(SAMPLE_CV, 'Registered Nurse\nRequirements\n- Valid nursing licence\n- Compassion and communication', 'en', NOW);
    render(<Results result={r} />);
    const note = screen.getByRole('note');
    expect(note).toHaveTextContent(/Recognised 1 skill in this ad/);
    expect(note).toHaveTextContent(/too few for a reliable score/);
    expect(note.className).toContain('coverage--low');
  });
});
