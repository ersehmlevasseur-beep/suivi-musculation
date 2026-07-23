import { useState, useEffect, useMemo } from "react";
import { Dumbbell, Flame, CheckCircle2, Circle, TrendingUp, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const EXERCISES = [
  { id: "pompes", seance: "A", name: "Pompes sur genoux", target: "3 × 8-12", type: "reps" },
  { id: "developpe", seance: "A", name: "Développé couché haltères", target: "3 × 10-12", type: "reps" },
  { id: "ecarte", seance: "A", name: "Écarté couché haltères", target: "2-3 × 12", type: "reps" },
  { id: "triceps_ext", seance: "A", name: "Extension triceps derrière la tête", target: "3 × 10-12", type: "reps" },
  { id: "rowing", seance: "B", name: "Rowing unilatéral haltère", target: "3 × 10-12/bras", type: "reps" },
  { id: "curl", seance: "B", name: "Curl biceps debout", target: "3 × 10-12", type: "reps" },
  { id: "curl_marteau", seance: "B", name: "Curl marteau", target: "3 × 10-12", type: "reps" },
  { id: "crunch", seance: "C", name: "Crunch abdominaux", target: "3 × 15-20", type: "reps" },
  { id: "planche", seance: "C", name: "Planche (gainage)", target: "3 × 30-45s", type: "time" },
  { id: "russian_twist", seance: "C", name: "Russian twist léger", target: "3 × 15-20/côté", type: "reps" },
];

const SEANCES = [
  { id: "A", label: "Pectoraux & Triceps", sub: "poussée", color: "bg-emerald-800" },
  { id: "B", label: "Dos & Biceps", sub: "tirage", color: "bg-amber-800" },
  { id: "C", label: "Abdos & Gainage", sub: "", color: "bg-stone-700" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Détermine la séance du jour selon la rotation A→B→C, en comptant les jours
// réellement entraînés dans l'historique (pas le calendrier civil).
function nextSeance(log) {
  const days = [...new Set(log.map((e) => e.date))].sort();
  const order = ["A", "B", "C"];
  if (days.length === 0) return "A";
  const lastDay = days[days.length - 1];
  const lastSeance = log.filter((e) => e.date === lastDay)[0]?.seance || "A";
  const idx = order.indexOf(lastSeance);
  return order[(idx + 1) % 3];
}

export default function App() {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({});
  const [selectedExercise, setSelectedExercise] = useState(EXERCISES[0].id);
  const [savedFlash, setSavedFlash] = useState(null);
  const [activeSeance, setActiveSeance] = useState("A");

  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get("training-log", false);
        if (result && result.value) {
          const parsed = JSON.parse(result.value);
          setLog(parsed);
          setActiveSeance(nextSeance(parsed));
        }
      } catch (e) {
        setLog([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const today = todayStr();

  const todaysEntries = useMemo(
    () => log.filter((e) => e.date === today),
    [log, today]
  );

  const streak = useMemo(() => {
    const days = new Set(log.map((e) => e.date));
    let count = 0;
    let d = new Date();
    while (true) {
      const key = d.toISOString().slice(0, 10);
      if (days.has(key)) {
        count++;
        d.setDate(d.getDate() - 1);
      } else {
        if (key === today) { d.setDate(d.getDate() - 1); continue; }
        break;
      }
    }
    return count;
  }, [log, today]);

  const totalSessions = useMemo(() => new Set(log.map((e) => e.date)).size, [log]);

  function updateDraft(id, field, value) {
    setDraft((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function saveExercise(ex) {
    const d = draft[ex.id] || {};
    const entry = {
      date: today,
      exerciseId: ex.id,
      seance: ex.seance,
      weightKg: Number(d.weightKg) || 0,
      performance: Number(d.performance) || 0,
      sets: Number(d.sets) || 0,
      ts: Date.now(),
    };
    const filtered = log.filter((e) => !(e.date === today && e.exerciseId === ex.id));
    const newLog = [...filtered, entry];
    setLog(newLog);
    try {
      await window.storage.set("training-log", JSON.stringify(newLog), false);
      setSavedFlash(ex.id);
      setTimeout(() => setSavedFlash(null), 1500);
    } catch (e) {
      console.error("Erreur de sauvegarde", e);
    }
  }

  const history = useMemo(() => {
    return log
      .filter((e) => e.exerciseId === selectedExercise)
      .sort((a, b) => a.ts - b.ts)
      .map((e) => ({ date: e.date.slice(5), poids: e.weightKg, perf: e.performance }));
  }, [log, selectedExercise]);

  const selectedEx = EXERCISES.find((e) => e.id === selectedExercise);
  const activeSeanceInfo = SEANCES.find((s) => s.id === activeSeance);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <Loader2 className="animate-spin text-stone-500" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 pb-16">
      <header className="border-b-2 border-stone-900 px-5 py-6 flex items-center justify-between flex-wrap gap-4 bg-stone-50">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mon suivi musculation</h1>
          <p className="text-sm text-stone-500 font-mono mt-1">{today}</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-amber-100 border border-amber-800 rounded-full px-4 py-2">
            <Flame size={18} className="text-amber-800" />
            <span className="font-mono font-bold text-amber-900">{streak}j</span>
          </div>
          <div className="flex items-center gap-2 bg-emerald-100 border border-emerald-800 rounded-full px-4 py-2">
            <Dumbbell size={18} className="text-emerald-800" />
            <span className="font-mono font-bold text-emerald-900">{totalSessions} séances</span>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 mt-6">
        <div className="bg-stone-900 text-stone-100 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs font-mono text-stone-400 uppercase tracking-wide">Séance du jour suggérée</div>
            <div className="text-lg font-bold">Séance {activeSeance} — {activeSeanceInfo?.label}</div>
          </div>
          <div className="flex gap-2">
            {SEANCES.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSeance(s.id)}
                className={`font-mono text-sm font-bold px-3 py-1.5 rounded-lg transition-colors ${
                  activeSeance === s.id ? "bg-white text-stone-900" : "bg-stone-700 text-stone-300 hover:bg-stone-600"
                }`}
              >
                {s.id}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-5 mt-6 space-y-10">
        {SEANCES.filter((s) => s.id === activeSeance).map((seance) => (
          <section key={seance.id}>
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-white text-xs font-mono font-bold px-2.5 py-1 rounded ${seance.color}`}>
                Séance {seance.id} — {seance.label}
              </span>
            </div>
            <div className="space-y-3">
              {EXERCISES.filter((e) => e.seance === seance.id).map((ex) => {
                const doneToday = todaysEntries.find((e) => e.exerciseId === ex.id);
                return (
                  <div
                    key={ex.id}
                    className="bg-white border border-stone-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="flex-1 min-w-[160px]">
                      <div className="flex items-center gap-2">
                        {doneToday ? (
                          <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
                        ) : (
                          <Circle size={18} className="text-stone-300 shrink-0" />
                        )}
                        <span className="font-semibold">{ex.name}</span>
                      </div>
                      <div className="text-xs font-mono text-stone-500 ml-6">{ex.target}</div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {ex.type === "reps" ? (
                        <>
                          <input type="number" min="0" placeholder="kg"
                            defaultValue={doneToday?.weightKg || ""}
                            onChange={(e) => updateDraft(ex.id, "weightKg", e.target.value)}
                            className="w-16 border border-stone-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
                          <input type="number" min="0" placeholder="reps"
                            defaultValue={doneToday?.performance || ""}
                            onChange={(e) => updateDraft(ex.id, "performance", e.target.value)}
                            className="w-16 border border-stone-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
                        </>
                      ) : (
                        <input type="number" min="0" placeholder="sec"
                          defaultValue={doneToday?.performance || ""}
                          onChange={(e) => updateDraft(ex.id, "performance", e.target.value)}
                          className="w-16 border border-stone-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
                      )}
                      <input type="number" min="0" max="5" placeholder="séries"
                        defaultValue={doneToday?.sets || ""}
                        onChange={(e) => updateDraft(ex.id, "sets", e.target.value)}
                        className="w-16 border border-stone-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
                      <button
                        onClick={() => saveExercise(ex)}
                        className="bg-stone-900 text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-stone-700 transition-colors"
                      >
                        {savedFlash === ex.id ? "Enregistré ✓" : "Valider"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} className="text-stone-700" />
            <h2 className="font-bold text-lg">Progression</h2>
          </div>
          <select
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm font-mono mb-4 bg-white"
          >
            {EXERCISES.map((ex) => (
              <option key={ex.id} value={ex.id}>Séance {ex.seance} — {ex.name}</option>
            ))}
          </select>

          <div className="bg-white border border-stone-300 rounded-xl p-4 h-64">
            {history.length === 0 ? (
              <div className="h-full flex items-center justify-center text-stone-400 text-sm">
                Pas encore de données pour cet exercice
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  {selectedEx?.type === "reps" && (
                    <Line type="monotone" dataKey="poids" name="Poids (kg)" stroke="#78350f" strokeWidth={2} dot={{ r: 3 }} />
                  )}
                  <Line type="monotone" dataKey="perf" name={selectedEx?.type === "time" ? "Durée (s)" : "Reps"} stroke="#065f46" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
