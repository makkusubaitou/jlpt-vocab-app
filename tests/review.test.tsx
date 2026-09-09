import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ReviewPage from '@/app/review/page';
import DashboardPage from '@/app/page';

const navigation = vi.hoisted(() => ({
  params: new URLSearchParams(),
  router: { push: vi.fn(), refresh: vi.fn() },
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => navigation.params,
  useRouter: () => navigation.router,
}));

const word = {
  id: 1, kanji: '猫', reading: 'ねこ', meaning: 'cat', jlptLevel: 'N5',
  exampleSentence: '猫です。', exampleTranslation: 'It is a cat.',
  progressId: 1, status: 'active', comfortLevel: 4, reviewCount: 7,
};
let savedProgress: typeof word;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  navigation.params = new URLSearchParams();
  savedProgress = { ...word };
  fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    if (input.startsWith('/api/words?')) return Response.json([word]);
    if (input === '/api/progress/1' && init?.method === 'PATCH') {
      savedProgress = { ...savedProgress, comfortLevel: 5, reviewCount: 8, status: 'known' };
      return Response.json({ ...savedProgress, graduated: true });
    }
    if (input === '/api/learn') {
      return Response.json({ poolStatus: { current: 1, target: 50, spotsAvailable: 49 } });
    }
    if (input === '/api/progress') {
      return Response.json({ progress: [], stats: { dueForReview: 1, totalLearned: 10 } });
    }
    throw new Error(`Unexpected request: ${input}`);
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function revealWord() {
  fireEvent.click(await screen.findByText('Tap to reveal'));
}

describe.each(['practice=true', 'practice=true&scope=learned'])('%s', (params) => {
  it.each(['Got it', 'Shaky', 'Forgot'])('%s leaves saved learning progress untouched', async (answer) => {
    navigation.params = new URLSearchParams(params);
    render(<ReviewPage />);
    await revealWord();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(answer) }));
    await screen.findByText('Session Complete!');
    expect(savedProgress).toEqual(word);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH')).toHaveLength(0);
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/learn')).toBe(false);
    const correct = screen.getByText('Correct').parentElement;
    expect(correct?.textContent).toBe(`${answer === 'Got it' ? 1 : 0}Correct`);
    expect(screen.getByText('Reviewed').parentElement?.textContent).toBe('1Reviewed');
  });

  it('does not offer progress-changing controls or scheduling promises', async () => {
    navigation.params = new URLSearchParams(params);
    render(<ReviewPage />);
    await revealWord();
    expect(screen.queryByRole('button', { name: 'I already know this word' })).toBeNull();
    for (const interval of ['1 hour', '1 day', '+2 days']) {
      expect(screen.queryByText(interval)).toBeNull();
    }
  });
});

it('still saves answers and graduates words during scheduled reviews', async () => {
  render(<ReviewPage />);
  await revealWord();
  expect(screen.getByRole('button', { name: 'I already know this word' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Got it/ }));
  await screen.findByText('Session Complete!');
  expect(fetchMock).toHaveBeenCalledWith('/api/progress/1', expect.objectContaining({
    method: 'PATCH', body: JSON.stringify({ response: 'got_it' }),
  }));
  expect(savedProgress.status).toBe('known');
  expect(savedProgress.reviewCount).toBe(8);
});

it('requests the full learned vocabulary for the new practice option', async () => {
  navigation.params = new URLSearchParams('practice=true&scope=learned');
  render(<ReviewPage />);
  await screen.findByText('Tap to reveal');
  const requested = new URL(fetchMock.mock.calls[0][0], 'http://localhost');
  expect(requested.searchParams.get('practice')).toBe('true');
  expect(requested.searchParams.get('scope')).toBe('learned');
});

it('offers separate dashboard buttons for learning words and all learned words', async () => {
  render(<DashboardPage />);
  const learned = await screen.findByRole('link', { name: 'Practice All Learned Words' });
  expect(learned.getAttribute('href')).toBe('/review?practice=true&scope=learned');
  expect(screen.getByRole('link', { name: 'Practice Learning Words' }).getAttribute('href'))
    .toBe('/review?practice=true');
});

it('can practice every card in a learned vocabulary larger than 50, including mastered words', async () => {
  navigation.params = new URLSearchParams('practice=true&scope=learned');
  const vocabulary = Array.from({ length: 60 }, (_, i) => ({
    ...word, id: i + 1, kanji: `単語${i + 1}`, status: i < 10 ? 'active' : 'known',
  }));
  fetchMock.mockResolvedValueOnce(Response.json(vocabulary));
  render(<ReviewPage />);
  await screen.findByText('単語1');
  for (const card of vocabulary) {
    expect(screen.getByText(card.kanji)).toBeTruthy();
    await revealWord();
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
  }
  await screen.findByText('Session Complete!');
  expect(screen.getByText('Reviewed').parentElement?.textContent).toBe('60Reviewed');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('offers learned-word practice when the learning pool is empty', async () => {
  navigation.params = new URLSearchParams('practice=true');
  fetchMock.mockResolvedValueOnce(Response.json([]));
  render(<ReviewPage />);
  expect(await screen.findByRole('link', { name: 'Practice All Learned Words' })).toBeTruthy();
});
