# Imagen oficial de Playwright: trae Chromium listo. El robot lanza Chromium LOCAL en el contenedor
# y sale a internet por el PROXY residencial colombiano (Legasov bloquea IPs de datacenter/extranjero).
# Fija la versión a la MISMA de playwright-core en package.json.
FROM mcr.microsoft.com/playwright:v1.46.0-jammy

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
# Vacío = usa el Chromium empaquetado de la imagen (no el canal 'chrome').
ENV CHROME_CHANNEL=
EXPOSE 3000

CMD ["node", "server.js"]
