<a href="https://chatbot.ai-sdk.dev/demo">
  <img alt="AhChat" src="app/(chat)/opengraph-image.png">
  <h1 align="center">诶嘿Chat / AhChat</h1>
</a>

<p align="center">
    诶嘿Chat (AhChat) is a chat application built with Next.js and the AI SDK.
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

This template uses LiteLLM Proxy and the Responses API for the primary chat stream. The server returns the proxy's OpenAI-compatible streaming response, while the client transport adapts Responses API stream events into the existing chat UI state.

### LiteLLM Configuration

Set `LITELLM_BASE_URL` and `LITELLM_API_KEY` in your `.env.local` file. `LITELLM_BASE_URL` should include the OpenAI API prefix, for example `http://localhost:4000/v1`.

The app reads available models from the project-root `models.yaml` file instead of LiteLLM Proxy's `/models` endpoint. The file uses LiteLLM-style `model_list` entries, and each `model_info` block should define:

- `name`: display name in the UI
- `icon_url`: model icon URL
- `visible_in_web`: whether the model is visible in the web app
- `mode`: model category such as `Chat`, `Completion`, `Embedding`, `Audio Speech`, `Audio Transcription`, `Image Generation`, or `Video Generation`
- Optional `endpoint_name`: reference to an item in `endpoint_list`

You can also define `endpoint_list` at the top of `models.yaml` to route different models to different OpenAI-compatible gateways. Each endpoint currently supports:

- `endpoint_name`: unique endpoint identifier
- `api_type`: currently `openai-compatible`
- `base_url` or `base_url_env`: explicit base URL or an env var name containing it
- `api_key` or `api_key_env`: explicit API key or an env var name containing it

Only models marked `visible_in_web: true` and with mode `Chat` or `Completion` are shown in the chat model selector. `LITELLM_DEFAULT_MODEL` must point to one of those visible chat models. `LITELLM_TITLE_MODEL` can point to any model defined in `models.yaml`.

If a model does not specify `endpoint_name`, the app falls back to the default OpenAI-compatible endpoint using `LITELLM_BASE_URL` and `LITELLM_API_KEY`.

If your LiteLLM models have per-model capability differences, define them under `model_info.capabilities` in `models.yaml`. You can still use `LITELLM_MODEL_CAPABILITIES` as an optional JSON override keyed by model ID. Tool execution is disabled in the LiteLLM Responses API integration, so `tools` defaults to `false`.

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

You can deploy your own version of AhChat to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/templates/next.js/chatbot)

For self-hosted Docker deployment with RustFS, Redis, and PostgreSQL, see [docs/deployment.md](docs/deployment.md).

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run AhChat. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

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
