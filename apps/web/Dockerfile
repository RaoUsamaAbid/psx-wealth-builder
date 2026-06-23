# Build context = repo root. node_modules/dist/.env excluded via .dockerignore.
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci || npm install
RUN npm run build:packages && npm run build -w @psx/web

FROM nginx:1.27-alpine AS runtime
# nginx:alpine substitutes ${API_UPSTREAM}/${PORT} from these templates at startup.
ENV API_UPSTREAM=http://localhost:4000 \
    PORT=80 \
    NGINX_ENVSUBST_FILTER='API_UPSTREAM|PORT'
COPY apps/web/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
