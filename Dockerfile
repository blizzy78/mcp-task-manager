FROM node:22.12-alpine AS builder

RUN mkdir -p /app/tools

COPY *.ts /app
COPY tools /app/tools
COPY package.json /app/package.json
COPY tsconfig.json /app/tsconfig.json
COPY tsconfig.parent.json /app/tsconfig.parent.json

WORKDIR /app

RUN --mount=type=cache,target=/app/.npm npm install
RUN --mount=type=cache,target=/app/.npm npm run build


FROM node:22-alpine AS release

RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json

ENV NODE_ENV=production

RUN npm --mount=type=cache,target=/app/.npm ci --ignore-scripts --omit-dev

USER app

CMD ["node", "dist/index.js"]
