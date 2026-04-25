FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 9091
CMD ["node", "monitoring/exporter.js"]
