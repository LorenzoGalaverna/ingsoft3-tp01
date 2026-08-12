import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

const XP_PER_LEVEL = 100;
const USER_ID = 1; // walking skeleton: usuario único hardcodeado

const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/user', async (_req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: USER_ID } });
  res.json(user);
});

app.get('/api/habits', async (_req, res) => {
  const habits = await prisma.habit.findMany({
    where: { userId: USER_ID },
    orderBy: { createdAt: 'asc' },
    include: {
      completions: {
        where: { dayKey: dayKey() },
        select: { id: true },
      },
    },
  });
  // Aplano: mando `completedToday` booleano en vez del array
  res.json(habits.map(h => ({ ...h, completedToday: h.completions.length > 0, completions: undefined })));
});

app.post('/api/habits', async (req, res) => {
  const { name, xpReward } = req.body ?? {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name es obligatorio' });
  }
  const reward = Number.isFinite(xpReward) && xpReward > 0 ? Math.floor(xpReward) : 10;
  const habit = await prisma.habit.create({
    data: { name: name.trim(), xpReward: reward, userId: USER_ID },
  });
  res.status(201).json(habit);
});

app.delete('/api/habits/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido' });
  await prisma.habit.delete({ where: { id } }).catch(() => null);
  res.status(204).end();
});

// Completar hábito: crea la Completion y suma xpReward al usuario.
// Regla: no se puede completar dos veces el mismo hábito el mismo día
// (índice único (habitId, dayKey) en la BD).
app.post('/api/habits/:id/complete', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido' });

  const habit = await prisma.habit.findUnique({ where: { id } });
  if (!habit || habit.userId !== USER_ID) return res.status(404).json({ error: 'hábito no encontrado' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.completion.create({
        data: { habitId: id, userId: USER_ID, dayKey: dayKey() },
      });
      const updated = await tx.user.update({
        where: { id: USER_ID },
        data: { xp: { increment: habit.xpReward } },
      });
      // Level up: cada 100 XP subís de nivel. Se recalcula en base al total,
      // así que el nivel siempre es consistente con la XP (no se puede desfasar).
      const newLevel = Math.floor(updated.xp / XP_PER_LEVEL) + 1;
      if (newLevel !== updated.level) {
        return tx.user.update({ where: { id: USER_ID }, data: { level: newLevel } });
      }
      return updated;
    });
    res.json(result);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'ya completaste este hábito hoy' });
    }
    throw err;
  }
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`habit-tracker backend escuchando en :${port}`));
