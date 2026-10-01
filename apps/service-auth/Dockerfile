# Built from the monorepo root: docker build -f apps/service-auth/Dockerfile .
# Uses Turborepo's own "prune" pattern for Docker: prunes the workspace down
# to just this service and the internal packages it actually depends on,
# so the build context and node_modules stay minimal instead of dragging
# in all five backend services and the frontend.

FROM node:24-bookworm-slim AS base
RUN corepack enable

FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune @rv-lms/service-auth --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json
RUN pnpm --filter @rv-lms/service-auth exec prisma generate
RUN pnpm turbo build --filter=@rv-lms/service-auth
RUN cp -r apps/service-auth/src/generated apps/service-auth/dist/generated

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nodeuser
COPY --from=builder --chown=nodeuser:nodejs /app .
USER nodeuser
EXPOSE 3001
CMD ["node", "apps/service-auth/dist/server.js"]
