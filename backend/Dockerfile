# ---- Etapa 1: build (con todas las deps + genera el Prisma Client) ----
FROM node:22-alpine AS build
WORKDIR /app

# Prisma detecta la versión de OpenSSL para elegir el binario del engine.
# Alpine no la trae por defecto — sin esto, `prisma generate` falla al arrancar
# con "Prisma failed to detect the libssl/openssl version".
RUN apk add --no-cache openssl

# El lockfile primero: capa cacheada — solo se rehace si cambian package*.json
COPY package*.json ./
RUN npm ci

# Schema antes que el resto del código: prisma generate solo depende de él
COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

# ---- Etapa 2: runtime (mismo Node, sin cache de npm, sin código de dev) ----
FROM node:22-alpine AS final
WORKDIR /app
ENV NODE_ENV=production

# OpenSSL en runtime también: Prisma lo usa al aplicar migraciones y al conectar.
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# El cliente generado (motores nativos + JS) viaja tal cual: regenerarlo en
# runtime obligaría a bajar el binario de la CPU del contenedor otra vez.
COPY --from=build /app/node_modules/@prisma /app/node_modules/@prisma
COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src

EXPOSE 8080

# Aplica migraciones + seed idempotente + arranca la API. `migrate deploy` es
# la variante de producción: aplica las migraciones ya versionadas, no crea
# ninguna nueva (a diferencia de `migrate dev`).
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && node src/index.js"]
