# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
RUN corepack enable
WORKDIR /repo

FROM base AS manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

FROM manifests AS build
RUN pnpm install --frozen-lockfile --filter @launchly/api...
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm --filter @launchly/api db:generate \
 && pnpm --filter @launchly/api build

FROM build AS migrator
WORKDIR /repo/apps/api
ENV PATH=/repo/apps/api/node_modules/.bin:$PATH
CMD ["prisma", "migrate", "deploy"]

FROM manifests AS prod-deps
RUN pnpm install --frozen-lockfile --prod --filter @launchly/api...

FROM base AS api
ENV NODE_ENV=production
COPY --from=prod-deps /repo/node_modules /repo/node_modules
COPY --from=prod-deps /repo/apps/api/node_modules /repo/apps/api/node_modules
COPY --from=build /repo/apps/api/dist /repo/apps/api/dist
COPY apps/api/package.json /repo/apps/api/package.json
WORKDIR /repo/apps/api
USER node
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD node -e "fetch('http://localhost:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
