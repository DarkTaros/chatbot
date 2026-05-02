<a href="https://chatbot.ai-sdk.dev/demo">
  <img alt="Chatbot" src="app/(chat)/opengraph-image.png">
  <h1 align="center">Chatbot</h1>
</a>

<p align="center">
    Chatbot (formerly AI Chatbot) is a free, open-source template built with Next.js and the AI SDK that helps you quickly build powerful chatbot applications.
</p>

<p align="center">
  <a href="https://chatbot.ai-sdk.dev/docs"><strong>Read Docs</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://ai-sdk.dev/docs/introduction)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports OpenAI-compatible model providers via the AI SDK
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for saving chat history and user data
  - [RustFS](https://github.com/rustfs/rustfs) for self-hosted object storage
- [Auth.js](https://authjs.dev)
  - Simple and secure authentication

## Model Providers

This template uses the official OpenAI SDK and the Responses API for the primary chat stream. The server returns OpenAI's native streaming response, while the client transport adapts OpenAI stream events into the existing chat UI state.

### OpenAI Configuration

Set `OPENAI_API_KEY` in your `.env.local` file. If you use a proxy or OpenAI-compatible endpoint that supports `/v1/responses`, set `OPENAI_BASE_URL` as well.

If you want to control which models appear in the UI, set `OPENAI_COMPATIBLE_MODEL_IDS` as a comma-separated list and choose the default with `OPENAI_COMPATIBLE_DEFAULT_MODEL`.

If your endpoint has per-model capability differences, set `OPENAI_COMPATIBLE_MODEL_CAPABILITIES` to a JSON object keyed by model ID.

Set `OPENAI_RESPONSES_STREAMING=false` to fall back to the legacy AI SDK server stream path.

## File Storage

This project stores uploaded chat images in RustFS via its S3-compatible API. The upload route keeps the existing `url`, `pathname`, and `contentType` response shape, so attachments continue to render directly in chat messages.

### RustFS Configuration

Set these variables in `.env.local`:

- `RUSTFS_S3_ENDPOINT`
- `RUSTFS_S3_REGION`
- `RUSTFS_S3_ACCESS_KEY`
- `RUSTFS_S3_SECRET_KEY`
- `RUSTFS_S3_BUCKET`
- `RUSTFS_PUBLIC_BASE_URL`
- Optional `RUSTFS_S3_FORCE_PATH_STYLE`
- Optional `RUSTFS_S3_PUBLIC_READ_POLICY`

`RUSTFS_PUBLIC_BASE_URL` should point to a browser-reachable path-style RustFS endpoint. With the included Docker setup, that value is `http://127.0.0.1:9000`.

## Deploy Your Own

You can deploy your own version of Chatbot to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/templates/next.js/chatbot)

For self-hosted Docker deployment with RustFS, Redis, and PostgreSQL, see [docs/deployment.md](docs/deployment.md).

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run Chatbot. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various AI and authentication provider accounts.

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`
4. Start RustFS locally:

```bash
docker compose -f docker-compose.rustfs.yml up -d
pnpm storage:init
```

```bash
pnpm install
pnpm db:migrate # Setup database or apply latest database changes
pnpm dev
```

Your app template should now be running on [localhost:3000](http://localhost:3000).




curl -X POST https://litellm.ah-api.com/v1/completions 
-H "Content-Type: application/json" 
-H "Authorization: Bearer sk-7lWzCCBxiTVdQ-u0O4j8dA" 
-d '{
    "model": "gpt-5.4",
    "prompt": "你好",
    "max_tokens": 50,
    "temperature": 0.7
}'
