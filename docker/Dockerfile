FROM node:24-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/core/package.json packages/core/
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/
COPY packages/skill-sdk/package.json packages/skill-sdk/
COPY packages/skills/package.json packages/skills/
COPY packages/cli/package.json packages/cli/
COPY packages/channels/telegram/package.json packages/channels/telegram/
COPY packages/channels/whatsapp/package.json packages/channels/whatsapp/
COPY packages/channels/discord/package.json packages/channels/discord/
COPY packages/channels/slack/package.json packages/channels/slack/
COPY packages/channels/signal/package.json packages/channels/signal/
COPY packages/channels/imessage/package.json packages/channels/imessage/
COPY packages/channels/google-chat/package.json packages/channels/google-chat/
COPY packages/channels/teams/package.json packages/channels/teams/
COPY packages/channels/webchat/package.json packages/channels/webchat/
COPY packages/channels/matrix/package.json packages/channels/matrix/
COPY packages/channels/mattermost/package.json packages/channels/mattermost/
COPY packages/channels/feishu/package.json packages/channels/feishu/
COPY packages/channels/line/package.json packages/channels/line/
COPY packages/channels/irc/package.json packages/channels/irc/
COPY packages/registry-server/package.json packages/registry-server/
COPY packages/create-skill/package.json packages/create-skill/
COPY packages/landing/package.json packages/landing/
COPY packages/desktop/package.json packages/desktop/

RUN pnpm install --frozen-lockfile

COPY packages/core/ packages/core/
COPY packages/api/ packages/api/
COPY packages/web/ packages/web/
COPY packages/skill-sdk/ packages/skill-sdk/
COPY packages/skills/ packages/skills/
COPY packages/cli/ packages/cli/
COPY packages/channels/ packages/channels/
COPY packages/registry-server/ packages/registry-server/
COPY packages/create-skill/ packages/create-skill/

RUN pnpm -r build


FROM node:24-alpine AS production

RUN addgroup -g 1001 openmotoko && \
    adduser -u 1001 -G openmotoko -s /bin/sh -D openmotoko

RUN apk add --no-cache curl tini tailscale

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
COPY --from=build /app/packages/channels/ packages/channels/
COPY --from=build /app/packages/cli/dist/ packages/cli/dist/
COPY --from=build /app/packages/cli/package.json packages/cli/
COPY --from=build /app/packages/web/dist/ packages/web/dist/
COPY --from=build /app/packages/registry-server/dist/ packages/registry-server/dist/
COPY --from=build /app/packages/registry-server/package.json packages/registry-server/

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
