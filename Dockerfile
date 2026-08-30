FROM node:22-alpine AS base

# Install dependencies only
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_PUBLIC_GCP_PROJECT_ID=careerpilot-ai-506813
ENV NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDrF-SgR12k1IZkCPSJA4D0eEluuKkjAc4
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=careerpilot-ai-506813.firebaseapp.com
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=careerpilot-ai-506813
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=careerpilot-ai-506813.firebasestorage.app
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=481544608486
ENV NEXT_PUBLIC_FIREBASE_APP_ID=1:481544608486:web:55061e4b50010a0050b927
ENV NEXT_PUBLIC_RESUME_BUCKET=careerpilot-ai-506813-resumes
ENV GEMINI_MODEL=gemini-3.5-flash
ENV GEMINI_LOCATION=asia-south1
ENV PUBSUB_TOPIC=careerpilot-events
ENV PUBSUB_SUBSCRIPTION=careerpilot-events-sub
RUN npx next build --webpack

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/next.config.ts ./

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
