FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer-cached)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source and compile
COPY . .
RUN npx prisma generate
RUN npm run build

# Cloud Run always injects PORT=8080
EXPOSE 8080
ENV PORT=8080

CMD ["node", "dist/server.js"]
