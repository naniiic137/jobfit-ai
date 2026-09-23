// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Results } from './Results';
import { finalize } from '../analyzer/finalize';
import { runOffline } from '../analyzer/runOffline';
import { SAMPLE_CV, SAMPLE_CV_FR, SAMPLE_JOB, SAMPLE_JOB_FR } from '../data/samples';
import { RESULT_STRINGS } from '../i18n';
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

describe('Results labels follow the output language', () => {
  it('shows a French analysis with French labels', async () => {
    const user = userEvent.setup();
    render(<Results result={runOffline(SAMPLE_CV_FR, SAMPLE_JOB_FR, 'fr', NOW)} />);
    expect(screen.getByText('Analyse')).toBeInTheDocument();
    expect(screen.getByText('Bonne correspondance')).toBeInTheDocument();
    expect(screen.getByRole('figure')).toHaveAccessibleName('Score de correspondance 71 sur 100 : Bonne correspondance');
    for (const label of ['Requises', 'Atouts', 'Couverture par catégorie', 'Langages', 'Savoir-être']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(/compétences reconnues dans cette annonce/)).toBeInTheDocument();
    // Generic skill names are translated, brand names are not.
    const matched = screen.getByRole('list', { name: 'Compétences présentes' });
    expect(within(matched).getByText('Travail en équipe')).toBeInTheDocument();
    expect(within(matched).getByText('React')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Compétences manquantes' })).getAllByText('requise').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Puces adaptées', 'Lettre de motivation', 'Préparer l’entretien']);
    await user.click(screen.getByRole('tab', { name: 'Lettre de motivation' }));
    expect(screen.getByRole('button', { name: /Copier/ })).toBeInTheDocument();
    expect(screen.getByText(/mots · Français/)).toBeInTheDocument();
    // No English label is left over.
    expect(screen.queryByText(/^(Required|Nice to have|Matched|Coverage by category|Good match)$/)).toBeNull();
  });

  it('keeps English labels for an English analysis', () => {
    render(<Results result={runOffline(SAMPLE_CV, SAMPLE_JOB, 'en', NOW)} />);
    expect(screen.getByText('Good match')).toBeInTheDocument();
    expect(screen.getByText('Coverage by category')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Matched skills' })).getByText('Teamwork')).toBeInTheDocument();
  });

  it('fills every label in every language', () => {
    const keys = (o: object) => Object.keys(o).sort();
    expect(keys(RESULT_STRINGS.fr)).toEqual(keys(RESULT_STRINGS.en));
    expect(keys(RESULT_STRINGS.fr.category)).toEqual(keys(RESULT_STRINGS.en.category));
    for (const [k, v] of Object.entries(RESULT_STRINGS.fr)) {
      if (typeof v === 'string') expect(v, k).not.toBe('');
    }
  });
});

describe('Results proof on tap', () => {
  it('toggles the CV line behind a matched chip (touch screens have no hover)', async () => {
    const user = userEvent.setup();
    render(<Results result={runOffline(SAMPLE_CV, SAMPLE_JOB, 'en', NOW)} />);
    const chip = within(screen.getByRole('list', { name: 'Matched skills' })).getByRole('button', { name: /^React/ });
    expect(chip).toHaveAttribute('aria-expanded', 'false');
    await user.click(chip);
    expect(chip).toHaveAttribute('aria-expanded', 'true');
    const proof = document.getElementById(chip.getAttribute('aria-controls')!)!;
    expect(proof).toBeVisible();
    expect(proof).toHaveTextContent(/React · From your CV: “.*React.*”/);
    await user.click(chip);
    expect(chip).toHaveAttribute('aria-expanded', 'false');
    expect(proof).not.toBeVisible();
  });

  it('has a tap hint for touch screens and a hover hint for mice', () => {
    render(<Results result={runOffline(SAMPLE_CV, SAMPLE_JOB, 'en', NOW)} />);
    expect(screen.getByText('Tap a green chip to see the CV line that proves it.')).toHaveClass('only-touch');
    expect(screen.getByText('Hover or click a green chip to see the CV line that proves it.')).toHaveClass('only-pointer');
  });
});
