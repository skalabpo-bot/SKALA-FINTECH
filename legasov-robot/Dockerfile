# Imagen LIVIANA: el navegador NO va aquí — corre en Browserless (servicio aparte en EasyPanel).
# El robot solo usa playwright-core para conectarse por WebSocket a ese Chrome remoto.
FROM node:20-slim

WORKDIR /app

# Dependencias primero (mejor cache). Sin navegador → sin descarga pesada.
COPY package.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
