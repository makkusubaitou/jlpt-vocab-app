import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEFAULT_MODEL = 'claude-sonnet-4-6-20260217';

interface GeneratedWordData {
  meaning: string;
  example_sentence: string;
  example_translation: string;
}

export async function generateWordData(
  kanji: string,
  reading: string,
  jlptLevel?: string
): Promise<GeneratedWordData> {
  const model = process.env.CLAUDE_MODEL || DEFAULT_MODEL;

  const levelGuidance = jlptLevel
    ? `The learner is at JLPT ${jlptLevel} level. Adjust the example sentence complexity accordingly:
- N5: Very simple grammar, basic vocabulary only
- N4: Simple grammar, everyday vocabulary
- N3: Intermediate grammar and vocabulary
- N2: More complex sentences, broader vocabulary
- N1: Advanced, natural Japanese`
    : 'Keep the example sentence at an intermediate level.';

  const message = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a Japanese language expert. Given a Japanese word, provide its meaning and an example sentence with furigana.

Word: ${kanji}
Reading: ${reading}
${jlptLevel ? `JLPT Level: ${jlptLevel}` : ''}

${levelGuidance}

Respond with ONLY a JSON object (no markdown, no explanation) in this exact format:
{
  "meaning": "English meaning of the word (be concise but complete)",
  "example_sentence": "A natural Japanese sentence using furigana notation: 漢字[かんじ] for every kanji",
  "example_translation": "English translation of the example sentence"
}

CRITICAL rules for example_sentence:
- Every kanji or kanji compound MUST have furigana in square brackets immediately after it: 食[た]べる, 学校[がっこう], 朝[あさ]ご飯[はん]
- Hiragana and katakana words do NOT get brackets
- The target word (${kanji}) must appear in the sentence
- Make the sentence natural and useful for learning`,
      },
    ],
  });

  // Extract the text content
  const textContent = message.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in response');
  }

  // Parse the JSON response
  try {
    const data = JSON.parse(textContent.text);
    return {
      meaning: data.meaning,
      example_sentence: data.example_sentence,
      example_translation: data.example_translation,
    };
  } catch {
    console.error('Failed to parse Claude response:', textContent.text);
    throw new Error('Failed to parse Claude response as JSON');
  }
}
