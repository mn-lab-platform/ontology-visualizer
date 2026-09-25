FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html
COPY cidoc-periodic-table /usr/share/nginx/html/cidoc-periodic-table
COPY cidoc-periodic-adapter-sw.js /usr/share/nginx/html/cidoc-periodic-adapter-sw.js

EXPOSE 81
CMD ["nginx", "-g", "daemon off;"]
