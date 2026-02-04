import { pgTable, serial, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core';

// words table (pre-populated with JLPT data)
export const words = pgTable('words', {
  id: serial('id').primaryKey(),
  kanji: text('kanji').notNull(),
  reading: text('reading').notNull(),
  meaning: text('meaning'),
  exampleSentence: text('example_sentence'),
  exampleTranslation: text('example_translation'),
  jlptLevel: text('jlpt_level').notNull(), // 'N5', 'N4', 'N3', 'N2', 'N1'
  isCustom: boolean('is_custom').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// user progress table
export const userProgress = pgTable('user_progress', {
  id: serial('id').primaryKey(),
  wordId: integer('word_id')
    .references(() => words.id, { onDelete: 'cascade' })
    .unique()
    .notNull(),
  status: text('status').notNull().default('active'), // 'active', 'known', 'skipped'
  comfortLevel: integer('comfort_level').default(0), // 0-5
  reviewCount: integer('review_count').default(0),
  lastReviewed: timestamp('last_reviewed'),
  nextReview: timestamp('next_review'),
  createdAt: timestamp('created_at').defaultNow(),
});

// user settings table (singleton - only one row)
export const userSettings = pgTable('user_settings', {
  id: serial('id').primaryKey(),
  activePoolSize: integer('active_pool_size').default(50).notNull(), // 20-100 words
  selectedLevels: text('selected_levels').default('N5,N4,N3,N2,N1').notNull(), // comma-separated
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Type exports for use in the application
export type Word = typeof words.$inferSelect;
export type NewWord = typeof words.$inferInsert;
export type UserProgress = typeof userProgress.$inferSelect;
export type NewUserProgress = typeof userProgress.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
