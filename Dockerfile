# Build static assets, then serve with nginx (API + WebSocket proxied like Vite dev).
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Same-origin browser calls: /api → backend, /ws → backend (see nginx.docker.conf).
ARG VITE_API_URL=/api
ARG VITE_PUBLIC_APP_URL=http://localhost
ARG VITE_WS_URL=

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PUBLIC_APP_URL=$VITE_PUBLIC_APP_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN npm run build

FROM nginx:alpine
COPY nginx.docker.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
