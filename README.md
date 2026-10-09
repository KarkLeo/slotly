# Slotly

Booking pages for independent professionals: a mini landing page, online booking, and a cabinet that the professional's AI agent can manage through MCP.

**Live:** [slotly.karkleo.com](https://slotly.karkleo.com)

> Work in progress. The foundation and the end-to-end MCP prototype are in place; the booking core, the cabinet and the landing editor are being built now.

## What it does

- **Landing page with booking.** Each professional gets a page at `slotly.karkleo.com/<slug>` with services, prices and a booking widget that shows only free slots.
- **Cabinet.** A mobile-first dashboard for the schedule, appointments, client cards and services.
- **Agent access over MCP.** The professional connects Claude, ChatGPT or another MCP client, sets the agent permissions on the consent screen, and then manages the landing page, services and schedule in plain language.
- **Three interface languages:** Ukrainian, Russian and English.

## Architecture

The target design; agent permissions and the agent log are the next step.

```
MCP client (Claude, ChatGPT, …)
   │  OAuth 2.1 (DCR + PKCE)                     ┌──────────────────────────┐
   ├────────────────────────────────────────────▶│ Supabase Auth            │
   │                                             │ OAuth 2.1 server         │
   │  Bearer token (aud = slotly-mcp,            │ access token hook:       │
   │                role = agent)                │ aud + agent role         │
   ▼                                             └──────────────────────────┘
Next.js on a self-hosted VPS                                  │
   ├─ /oauth/consent   consent screen (approve / deny)        │ JWKS
   ├─ /api/mcp         MCP server, Streamable HTTP ◀──────────┘
   └─ app, landing pages, booking
   │
   ▼
Postgres (Supabase): the agent role has no table access,
only functions that check agent permissions and write the agent log
```

- **Supabase Auth as the OAuth 2.1 server.** MCP clients register themselves through Dynamic Client Registration; the consent screen is part of the app.
- **Agent tokens are a separate role.** A custom access token hook gives OAuth tokens the `agent` role and the MCP audience, so a leaked agent token cannot reach the database beyond what the MCP tools allow.
- **The MCP server lives inside Next.js** as a stateless route on `mcp-handler`, verifying tokens against the Supabase JWKS.
- **Schema changes go through migrations only,** covered by pgTAP tests.

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 · next-intl · Supabase (Postgres, Auth, Storage) · mcp-handler · jose · Zod · Vitest · pgTAP · Docker · Dokploy · Resend

## Running locally

Requires Node 24, pnpm and Docker.

```sh
pnpm install
cp .env.example .env.local
pnpm db:start        # local Supabase in Docker
pnpm dev             # http://localhost:3000
```

Checks: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm db:test`.

## License

All rights reserved. The code is public for review only; no permission is granted to use, copy or distribute it.
