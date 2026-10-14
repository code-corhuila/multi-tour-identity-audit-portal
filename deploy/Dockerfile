# Exact versions: a moving tag would change the image without a commit.
FROM node:22.12-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Produces dist/portal.js and dist/portal.css, the single module the front mounts (Annex H)
RUN npm run build

FROM nginx:1.30.5-alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY deploy/nginx.conf /etc/nginx/conf.d/portal.conf
COPY --from=build /app/dist/portal.js /app/dist/portal.css /usr/share/nginx/html/
