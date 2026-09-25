FROM node:22-alpine

WORKDIR /app
COPY layout-api/server.js ./server.js

ENV PORT=9002
ENV LAYOUTS_DIR=/data/layouts

EXPOSE 9002
CMD ["node", "server.js"]
