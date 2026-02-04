import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

interface GeneratedWordData {
  meaning: string;
  example_sentence: string;
  example_translation: string;
}

export async function generateWordData(
  kanji: string,
  reading: string
): Promise<GeneratedWordData> {
  const model = process.env.CLAUDE_MODEL || DEFAULT_MODEL;

  const message = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a Japanese language expert. Given a Japanese word, provide its meaning and an example sentence.

Word: ${kanji}
Reading: ${reading}

Respond with ONLY a JSON object (no markdown, no explanation) in this exact format:
{
  "meaning": "English meaning of the word (be concise but complete)",
  "example_sentence": "A natural Japanese sentence using this word",
  "example_translation": "English translation of the example sentence"
}

Important:
- The meaning should be clear and concise
- The example sentence should be natural and helpful for learning
- Use the word naturally in the example sentence
- Keep the example sentence at an intermediate level (not too simple, not too complex)`,
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
