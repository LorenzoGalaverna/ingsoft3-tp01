import { useEffect, useState } from 'react';

const XP_PER_LEVEL = 100;

export default function App() {
  const [user, setUser] = useState(null);
  const [habits, setHabits] = useState([]);
  const [name, setName] = useState('');
  const [xpReward, setXpReward] = useState(10);
  const [error, setError] = useState(null);

  async function reload() {
    setError(null);
    try {
      const [u, h] = await Promise.all([
        fetch('/api/user').then(r => r.json()),
        fetch('/api/habits').then(r => r.json()),
      ]);
      setUser(u);
      setHabits(h);
    } catch (e) {
      setError('No pude cargar los datos. ¿Está el backend arriba?');
    }
  }

  useEffect(() => { reload(); }, []);

  async function addHabit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), xpReward: Number(xpReward) || 10 }),
    });
    if (!res.ok) return setError('No pude crear el hábito.');
    setName('');
    setXpReward(10);
    reload();
  }

  async function completeHabit(id) {
    setError(null);
    const res = await fetch(`/api/habits/${id}/complete`, { method: 'POST' });
    if (res.status === 409) {
      const { error } = await res.json();
      setError(error);
      return;
    }
    if (!res.ok) return setError('No pude completar el hábito.');
    reload();
  }

  async function deleteHabit(id) {
    await fetch(`/api/habits/${id}`, { method: 'DELETE' });
    reload();
  }

  if (!user) return <main><p>Cargando…</p></main>;

  const xpIntoLevel = user.xp % XP_PER_LEVEL;
  const pct = Math.round((xpIntoLevel / XP_PER_LEVEL) * 100);

  return (
    <main>
      <header className="user-card">
        <h1>{user.name}</h1>
        <div className="meta">
          <span className="level">Nivel {user.level}</span>
          <span className="xp">{user.xp} XP total</span>
        </div>
        <div className="bar" aria-label={`Progreso al siguiente nivel: ${pct}%`}>
          <div className="bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="bar-caption">
          {xpIntoLevel} / {XP_PER_LEVEL} XP hasta nivel {user.level + 1}
        </p>
      </header>

      {error && <p className="error">{error}</p>}

      <section>
        <h2>Hábitos de hoy</h2>
        {habits.length === 0 && <p className="empty">Todavía no cargaste ningún hábito.</p>}
        <ul className="habits">
          {habits.map(h => (
            <li key={h.id} className={h.completedToday ? 'done' : ''}>
              <div className="habit-info">
                <span className="habit-name">{h.name}</span>
                <span className="habit-reward">+{h.xpReward} XP</span>
              </div>
              <div className="habit-actions">
                <button
                  onClick={() => completeHabit(h.id)}
                  disabled={h.completedToday}
                  aria-label={h.completedToday ? 'ya completado hoy' : 'completar'}
                >
                  {h.completedToday ? '✓ Hecho' : 'Completar'}
                </button>
                <button className="link" onClick={() => deleteHabit(h.id)} aria-label="borrar hábito">
                  borrar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Nuevo hábito</h2>
        <form onSubmit={addHabit}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: correr 30 min"
          />
          <input
            type="number"
            min="1"
            value={xpReward}
            onChange={e => setXpReward(e.target.value)}
            aria-label="XP que otorga"
          />
          <button type="submit" disabled={!name.trim()}>Agregar</button>
        </form>
      </section>
    </main>
  );
}
