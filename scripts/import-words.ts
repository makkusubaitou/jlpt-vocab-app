import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { words } from '../lib/db/schema';
import 'dotenv/config';

const JLPT_LEVELS = ['n5', 'n4', 'n3', 'n2', 'n1'] as const;
const BASE_URL = 'https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src';

interface CsvRow {
  expression: string;
  reading: string;
  meaning: string;
  tags: string;
  guid: string;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

function parseCsv(csvText: string): CsvRow[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  const headers = parseCsvLine(lines[0]);
  
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] || '';
    });
    return row as unknown as CsvRow;
  });
}

async function fetchJlptWords(level: string): Promise<CsvRow[]> {
  const url = `${BASE_URL}/${level}.csv`;
  console.log(`Fetching ${level.toUpperCase()} words from ${url}...`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${level}: ${response.statusText}`);
  }
  
  const csvText = await response.text();
  return parseCsv(csvText);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    console.error('Please create a .env file based on .env.example');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  console.log('Starting JLPT word import...\n');
  
  let totalImported = 0;

  for (const level of JLPT_LEVELS) {
    try {
      const rows = await fetchJlptWords(level);
      console.log(`Found ${rows.length} words for ${level.toUpperCase()}`);
      
      // Filter out empty rows and prepare for insertion
      const validRows = rows.filter(row => row.expression && row.reading);
      
      // Insert in batches of 100 to avoid overwhelming the database
      const batchSize = 100;
      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);
        
        await db.insert(words).values(
          batch.map(row => ({
            kanji: row.expression,
            reading: row.reading,
            meaning: row.meaning || null,
            jlptLevel: level.toUpperCase(), // N5, N4, etc.
            isCustom: false,
          }))
        ).onConflictDoNothing();
        
        process.stdout.write(`\rImported ${Math.min(i + batchSize, validRows.length)}/${validRows.length} ${level.toUpperCase()} words`);
      }
      
      console.log(` ✓`);
      totalImported += validRows.length;
    } catch (error) {
      console.error(`\nError importing ${level}:`, error);
    }
  }

  console.log(`\n✅ Import complete! Total words imported: ${totalImported}`);
}

main().catch(console.error);
