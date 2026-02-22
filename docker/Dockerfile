FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/core/package.json packages/core/
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/
COPY packages/skill-sdk/package.json packages/skill-sdk/
COPY packages/skills/package.json packages/skills/
COPY packages/channels/telegram/package.json packages/channels/telegram/

RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY packages/core/ packages/core/
COPY packages/api/ packages/api/
COPY packages/web/ packages/web/
COPY packages/skill-sdk/ packages/skill-sdk/
COPY packages/skills/ packages/skills/
COPY packages/channels/telegram/ packages/channels/telegram/

RUN pnpm -r build
RUN pnpm --filter @openmotoko/web build


FROM node:22-alpine AS production

RUN addgroup -g 1001 openmotoko && \
    adduser -u 1001 -G openmotoko -s /bin/sh -D openmotoko

RUN apk add --no-cache curl tini

WORKDIR /app

COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules/ node_modules/
COPY --from=build /app/packages/core/dist/ packages/core/dist/
COPY --from=build /app/packages/core/package.json packages/core/
COPY --from=build /app/packages/core/node_modules/ packages/core/node_modules/
COPY --from=build /app/packages/api/dist/ packages/api/dist/
COPY --from=build /app/packages/api/package.json packages/api/
COPY --from=build /app/packages/api/node_modules/ packages/api/node_modules/
COPY --from=build /app/packages/skill-sdk/dist/ packages/skill-sdk/dist/
COPY --from=build /app/packages/skill-sdk/package.json packages/skill-sdk/
COPY --from=build /app/packages/skills/dist/ packages/skills/dist/
COPY --from=build /app/packages/skills/package.json packages/skills/
COPY --from=build /app/packages/skills/node_modules/ packages/skills/node_modules/
COPY --from=build /app/packages/channels/telegram/dist/ packages/channels/telegram/dist/
COPY --from=build /app/packages/channels/telegram/package.json packages/channels/telegram/
COPY --from=build /app/packages/channels/telegram/node_modules/ packages/channels/telegram/node_modules/
COPY --from=build /app/packages/web/dist/ packages/web/dist/

RUN mkdir -p /app/data && chown -R openmotoko:openmotoko /app/data

USER openmotoko

EXPOSE 3457

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3457/api/health || exit 1

LABEL org.opencontainers.image.title="OpenMotoko"
LABEL org.opencontainers.image.description="Personal AI Agent for Humans"
LABEL org.opencontainers.image.version="0.1.0"
LABEL org.opencontainers.image.source="https://github.com/openmotoko/openmotoko"
LABEL org.opencontainers.image.licenses="MIT"
LABEL maintainer="OpenMotoko <hello@openmotoko.ai>"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "packages/api/dist/index.js"]
