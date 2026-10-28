# Gylio API for Cloud Run. Built from server/ as the context.
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY . .
USER node
# Cloud Run sets PORT; server.js listens on it.
CMD ["node", "server.js"]
