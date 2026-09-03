# --- Build stage: install all deps and build the Vite frontend ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY vite.config.js ./
COPY frontend ./frontend
RUN npm run build

# --- Runtime stage: only production deps + built assets + server ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev
COPY server ./server
COPY --from=build /app/dist ./dist

EXPOSE 8787
CMD ["node", "server/index.js"]
