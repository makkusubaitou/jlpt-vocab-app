# JLPT Vocab App

A Japanese vocabulary learning app with spaced repetition for JLPT N5-N1 levels.

## Features

- **Spaced Repetition**: Smart review scheduling based on your performance
- **All JLPT Levels**: Pre-loaded vocabulary for N5, N4, N3, N2, and N1
- **AI-Powered**: Claude API generates meanings and example sentences
- **Progress Tracking**: Track your learning progress across all levels
- **Custom Words**: Add your own vocabulary with auto-generated content
- **Dark Mode**: Built-in theme toggle for comfortable studying

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Neon** (Serverless Postgres)
- **Drizzle ORM**
- **Claude API** (Anthropic)

## Getting Started

### Prerequisites

- Node.js 18+
- A Neon database account
- An Anthropic API key

### Setup

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

3. Fill in your environment variables:

```
DATABASE_URL=postgresql://user:password@host.neon.tech/database?sslmode=require
ANTHROPIC_API_KEY=sk-ant-xxx
APP_PASSWORD=your_secure_password
CLAUDE_MODEL=claude-sonnet-4-20250514  # optional
```

4. Push the database schema:

```bash
npm run db:push
```

5. Import JLPT vocabulary:

```bash
npm run import-words
```

6. Start the development server:

```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) and log in with your `APP_PASSWORD`.

## Database Commands

- `npm run db:generate` - Generate migrations
- `npm run db:migrate` - Run migrations
- `npm run db:push` - Push schema directly (development)
- `npm run db:studio` - Open Drizzle Studio

## Deployment

This app is designed to be deployed on Vercel:

1. Connect your repository to Vercel
2. Add the environment variables in Vercel's dashboard
3. Deploy

After deployment, run the import script locally with your production `DATABASE_URL` to populate the vocabulary.

## Spaced Repetition Algorithm

The app uses a simple but effective spaced repetition system:

- **Forgot**: Review in 1 hour, reset comfort level
- **Shaky**: Review in 1 day, maintain comfort level
- **Got it**: Review in (comfort level × 2) days, increase comfort level

Comfort level ranges from 1-5, giving intervals of 2, 4, 6, 8, and 10 days.

## License

MIT
