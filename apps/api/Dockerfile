# Build context = repo root. node_modules/dist/.env are excluded via .dockerignore.
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci || npm install
RUN npm run build:packages && npm run build -w @psx/api

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
USER node
EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
