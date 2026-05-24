# SPDX-License-Identifier: GPL-3.0-or-later
# Builds the pnpm workspace once; runs api / scrumlord / sauron / migrate from the
# same image (the compose service picks the command). The web is built separately
# (apps/web/Dockerfile) and served by nginx.

FROM node:20-bookworm-slim AS app
# openssl + ca-certificates are needed by Prisma's query engine.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# Run as the non-root `node` user (CWE-250). sauron can't bind privileged :666 as
# non-root, so inside the container it falls back to :6660 (its built-in behaviour);
# compose maps host 666 -> container 6660 so the canonical port still works.
COPY --chown=node:node . .
USER node
RUN pnpm install --frozen-lockfile \
  && pnpm --filter @gira/db generate

ENV NODE_ENV=production
EXPOSE 3000 6660

# Default command: the API. Overridden per service in docker-compose.full.yml.
CMD ["pnpm", "--filter", "@gira/api", "start"]
