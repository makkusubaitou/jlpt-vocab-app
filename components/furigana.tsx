'use client';

/**
 * Parses furigana bracket notation and renders HTML ruby tags.
 * Input format: 漢字[かんじ]を勉強[べんきょう]する
 * Renders kanji with small reading text above it.
 */

interface FuriganaTextProps {
  text: string;
  className?: string;
}

interface TextSegment {
  type: 'ruby' | 'plain';
  base?: string;
  reading?: string;
  text?: string;
}

function parseFurigana(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  // Match: one or more kanji/kanji-like chars followed by [reading]
  const pattern = /([\u4E00-\u9FAF\u3400-\u4DBF]+)\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Add plain text before this match
    if (match.index > lastIndex) {
      segments.push({
        type: 'plain',
        text: text.slice(lastIndex, match.index),
      });
    }

    segments.push({
      type: 'ruby',
      base: match[1],
      reading: match[2],
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining plain text
  if (lastIndex < text.length) {
    segments.push({
      type: 'plain',
      text: text.slice(lastIndex),
    });
  }

  return segments;
}

export function FuriganaText({ text, className }: FuriganaTextProps) {
  const segments = parseFurigana(text);

  return (
    <span className={className} lang="ja">
      {segments.map((segment, i) => {
        if (segment.type === 'ruby') {
          return (
            <ruby key={i}>
              {segment.base}
              <rt className="text-xs">{segment.reading}</rt>
            </ruby>
          );
        }
        return <span key={i}>{segment.text}</span>;
      })}
    </span>
  );
}
