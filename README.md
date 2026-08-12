# Habit Tracker — INGSW3 UCC 2026

App del semestre de **Ingeniería del Software 3** (UCC, cátedra Ing. Ariel Schwindt). Tracker de hábitos con mecánica de RPG: cada hábito da XP al completarlo, se sube de nivel cada 100 XP, y un mismo hábito solo puede completarse una vez por día.

**Stack**: backend **Node 22 + Express + Prisma** · frontend **React + Vite** · base **PostgreSQL 16**.

> Este repositorio empezó como el TP1 (`ingsoft3-tp01`, hoy renombrado) y a partir del TP2 aloja la app del semestre. El TP1 queda archivado en el tag `tp1` (release `v1.0.0`).

## Estructura

```
├── backend/                    # Node/Express + Prisma
│   ├── src/index.js            # rutas
│   ├── prisma/schema.prisma    # User, Habit, Completion
│   └── Dockerfile              # multi-stage build → runtime
├── frontend/                   # React + Vite
│   ├── src/App.jsx
│   ├── nginx.conf              # sirve estáticos + proxy /api → backend
│   └── Dockerfile              # multi-stage build → nginx
├── docker-compose.yml          # levanta el sistema completo desde el código
├── docker-compose.registry.yml # ídem, pero baja las imágenes de ghcr.io
├── .env.example                # plantilla — copiar a .env antes del primer up
├── decisiones.md               # historial acumulativo TP a TP
└── evidencias.md               # ídem — capturas de cada TP
```

## Arranque desde cero (dos comandos)

**Prerequisito único**: Docker Desktop corriendo (`docker ps` responde). Nada más — no hace falta Node, ni .NET, ni Postgres instalados: viajan adentro de las imágenes.

```bash
git clone https://github.com/LorenzoGalaverna/ingsoft3-ucc-2026.git
cd ingsoft3-ucc-2026

cp .env.example .env          # 1. secretos locales (NO se commitea)
docker compose up -d          # 2. levanta db + backend + frontend + red + volumen
```

Abrí **http://localhost:3000** y jugá. El backend queda expuesto también en `http://localhost:8080` (útil para `curl`/Postman).

### Levantar directo desde el registry (sin código)

Si preferís no clonar y usar las imágenes ya publicadas en [ghcr.io](https://github.com/LorenzoGalaverna?tab=packages):

```bash
curl -O https://raw.githubusercontent.com/LorenzoGalaverna/ingsoft3-ucc-2026/main/docker-compose.registry.yml
curl -O https://raw.githubusercontent.com/LorenzoGalaverna/ingsoft3-ucc-2026/main/.env.example
cp .env.example .env
docker compose -f docker-compose.registry.yml up -d
```

Baja `habit-tracker-backend:v0.1.1` y `habit-tracker-frontend:v0.1.1`, orquesta lo mismo. No se compila nada.

### Bajar todo

```bash
docker compose down      # apaga contenedores; conserva el volumen (los datos siguen)
docker compose down -v   # además borra el volumen (chau datos)
```

## API en 30 segundos

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/health` | Chequeo de salud |
| `GET` | `/api/user` | Usuario actual (xp, level, name) |
| `GET` | `/api/habits` | Lista de hábitos con `completedToday` |
| `POST` | `/api/habits` | Crea un hábito (`{ "name": "...", "xpReward": 20 }`) |
| `POST` | `/api/habits/:id/complete` | Completa el hábito — suma XP + eventual level-up |
| `DELETE` | `/api/habits/:id` | Borra el hábito |

Reglas verificables (base para el TP5):

- `xp += habit.xpReward` en cada completion.
- `level = floor(xp / 100) + 1` — se recalcula siempre desde XP, no se puede desfasar.
- Índice único `(habitId, dayKey)` impide completar el mismo hábito dos veces en el día → HTTP 409.
- `name` obligatorio, `xpReward` default 10 si no viene o es inválido.
- Sólo se ven/modifican los hábitos del `USER_ID = 1` (sin auth en el walking skeleton — llega en TPs siguientes).

## Desarrollo local (sin dockerizar la app)

Útil si estás iterando sobre el código y no querés rebuildear la imagen en cada cambio:

```bash
# 1. la base como contenedor (todo lo demás corre nativo)
docker run -d --name habits-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=habits -p 5432:5432 postgres:16-alpine

# 2. backend en modo dev (--watch reinicia al guardar)
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npm run prisma:seed
npm run dev                # http://localhost:8080

# 3. frontend (en otra terminal)
cd frontend
npm install
npm run dev                # http://localhost:5173 (proxea /api al backend)
```

## Tags relevantes

- `tp1`, `v1.0.0` — cierre del TP1 (Git colaborativo).
- `tp2` — cierre del TP2 (contenerización).

## Uso de IA

Ver `decisiones.md` — se declaran, por TP, qué partes fueron asistidas por IA y cómo se verificaron.
