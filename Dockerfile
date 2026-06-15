FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM nginx:1.27-alpine

# ENV ARCHES_LOCAL_BASE_URL=http://host.docker.internal:8000
# ENV ARCHES_LOCAL_HOST_HEADER=localhost:8000
ENV ARCHES_DEV_BASE_URL=https://dev.mn.cenagis.edu.pl
ENV ARCHES_DEV_HOST_HEADER=dev.mn.cenagis.edu.pl

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html
COPY cidoc-periodic-table /usr/share/nginx/html/cidoc-periodic-table
COPY cidoc-periodic-adapter-sw.js /usr/share/nginx/html/cidoc-periodic-adapter-sw.js

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
