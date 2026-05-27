FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3025
ENV DATA_FILE=/app/data/router.json

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY scripts ./scripts
COPY README.md ./

RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 3025

CMD ["npm", "start"]
