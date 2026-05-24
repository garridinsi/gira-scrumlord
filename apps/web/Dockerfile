# SPDX-License-Identifier: GPL-3.0-or-later
# Build the SPA, then serve it with a non-root nginx that also proxies /api -> api.
FROM node:20-bookworm-slim AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
# Same-origin: the app calls /api/*, nginx proxies it to the api service.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @gira/web build

# nginx-unprivileged runs as a non-root user on :8080 (CWE-250 safe).
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
