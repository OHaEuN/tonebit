# 톤픽 컨테이너 이미지. Vercel 말고 아무 데서나(로컬·클라우드 런·VM) 같은 모습으로 돌린다
#   docker compose up --build        # 앱 + Postgres(pgvector)
#   docker compose run --rm tools pnpm db:migrate && docker compose run --rm tools pnpm db:seed

FROM node:24-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY scripts/copy-wasm.mjs scripts/copy-wasm.mjs
RUN pnpm install --frozen-lockfile

# 빌드와 운영 스크립트(마이그레이션·지식 적재·재보정)를 돌리는 단계. compose의 tools 서비스가 이걸 쓴다
FROM deps AS builder
COPY . .
# 화면에 DB·AI 기능을 켤지는 빌드할 때 정해진다(비밀 값이 아니라 켜기 표시만 받는다)
ARG FEATURE_DB=""
ARG FEATURE_AI=""
ENV FEATURE_DB=$FEATURE_DB FEATURE_AI=$FEATURE_AI STANDALONE=1 NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# 실행 이미지: standalone 서버와 정적 파일만 담는다
FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN useradd --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs /app/public ./public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://localhost:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
