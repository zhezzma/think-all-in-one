# think-all-in-one

Minimal monorepo scaffold for a Cloudflare Think reference app with:

- `apps/web` — React/Vite frontend operator console
- `worker` — Cloudflare Worker backend for agents and health/static surfaces

Production URL target: `https://think.godgodgame.com`

## Requirements

- Node.js 20+
- npm 10+

## Local setup

```bash
cd workspace/think-all-in-one
npm install
```

If you need the frontend to talk to a non-default worker host during local development, set:

```bash
export VITE_AGENT_HOST=http://localhost:8787
```

## Local development

Run each workspace from the monorepo root:

```bash
npm run web
npm run worker
```

What these do:

- `npm run web` starts the Vite dev server in `apps/web`
- `npm run worker` starts `wrangler dev` in `worker`

## Test and verification commands

From `workspace/think-all-in-one`:

```bash
npm run test
npm run typecheck
```

Workspace-specific equivalents:

```bash
npm --prefix worker run test
npm --prefix worker run typecheck
npm --prefix apps/web run test
npm --prefix apps/web run typecheck
```

Smoke coverage included in this scaffold verifies:

- backend health/static routing paths in `worker/test/e2e-smoke.test.ts`
- frontend operator-console critical surfaces in `apps/web/src/components/__tests__/smoke.test.tsx`

## Build commands

Build the frontend bundle:

```bash
npm --prefix apps/web run build
```

There is no separate worker build script in this scaffold; Wrangler performs the worker packaging step during local dev and deploy commands.

## Deploy commands

Root deploy entrypoint:

```bash
npm run deploy
```

Direct worker deploy:

```bash
npm --prefix worker run deploy
```

Both routes delegate to Wrangler deployment for the Worker backend. Before deploying to production, confirm the environment is configured for the intended hostname (`https://think.godgodgame.com`).

## Workspace layout

```text
workspace/think-all-in-one/
├── apps/
│   └── web/
├── worker/
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Typical local workflow

1. Install dependencies with `npm install`
2. Start the worker with `npm run worker`
3. Start the frontend with `npm run web`
4. Run `npm run test`
5. Run `npm run typecheck`
6. Build the frontend with `npm --prefix apps/web run build` before release validation
