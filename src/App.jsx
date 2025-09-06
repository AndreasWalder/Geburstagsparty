import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Users2, PartyPopper, Lock, Trash2, Shield } from "lucide-react";

// --- Simple storage adapters ---------------------------------------------
const localKey = "rsvp_attendees_40th";
const adminKey = "rsvp_admin_40th";

const LocalStore = {
  async list() {
    try {
      const raw = localStorage.getItem(localKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
  async add(item) {
    const all = await LocalStore.list();
    const withId = { id: crypto.randomUUID(), ...item };
    const next = [...all, withId];
    localStorage.setItem(localKey, JSON.stringify(next));
    return withId;
  },
  async remove(id) {
    const all = await LocalStore.list();
    const next = all.filter((x) => x.id !== id);
    localStorage.setItem(localKey, JSON.stringify(next));
    return true;
  },
};

// OPTIONAL: Supabase adapter (deaktiviert, für später behalten)
const SUPABASE_URL = ""; // z.B. https://your-project.supabase.co
const SUPABASE_ANON_KEY = "";
const SupabaseStore = {
  async list() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rsvps?select=*&order=created_at.asc`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) throw new Error("Failed to fetch RSVPs from Supabase");
    return await res.json();
  },
  async add(item) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rsvps`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ name: item.name }),
    });
    if (!res.ok) throw new Error("Failed to add RSVP to Supabase");
    const [created] = await res.json();
    return created;
  },
  async remove(id) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rsvps?id=eq.${id}`, {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
    });
    if (!res.ok) throw new Error("Failed to delete RSVP from Supabase");
    return true;
  },
};

// Utility helpers -----------------------------------------------------------
const emojis = ["🎉", "🎈", "🎂", "🍾", "🥳", "🎊", "🍰", "🕺", "💃", "🍹"]; 
const pickEmoji = (seed) => emojis[Math.abs(hashString(seed)) % emojis.length];
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return h | 0;
}
const formatTime = (d) => new Date(d).toLocaleString();

const TARGET = 40; // Ziel-Anzahl Gäste für Fortschrittsbalken (anpassbar)
const ADMIN_PIN = (import.meta.env?.VITE_ADMIN_PIN ?? "AndyA1").toString();

// Main component ------------------------------------------------------------
export default function RSVP40() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [people, setPeople] = useState([]);
  const [error, setError] = useState("");
  const [admin, setAdmin] = useState(() => localStorage.getItem(adminKey) === "1");

  const activeStore = useMemo(() => (SUPABASE_URL && SUPABASE_ANON_KEY ? "supabase" : "local"), []);

  // Load existing RSVPs
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const fromSupabase = await SupabaseStore.list();
        const list = fromSupabase ?? (await LocalStore.list());
        if (!cancelled) setPeople(list);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Konnte Anmeldungen nicht laden. Versuche es später erneut.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAttend() {
    setError("");
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Bitte gib deinen Namen ein (mind. 2 Zeichen).");
      return;
    }
    if (trimmed.length > 60) {
      setError("Name ist zu lang (max. 60 Zeichen).");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { name: trimmed, created_at: new Date().toISOString() };
      const created = (await SupabaseStore.add(payload)) ?? (await (async () => {
        return await LocalStore.add(payload);
      })());
      setPeople((prev) => [...prev, created]);
      setName("");
    } catch (e) {
      console.error(e);
      setError("Ups – Anmeldung fehlgeschlagen. Bitte kurz später nochmal versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!admin) return;
    const ok = confirm("Diesen Eintrag wirklich löschen?");
    if (!ok) return;
    try {
      // Versuche Supabase, fallback Local
      const sup = await SupabaseStore.remove(id);
      if (!sup) await LocalStore.remove(id);
      setPeople((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error(e);
      alert("Löschen fehlgeschlagen. Bitte später erneut versuchen.");
    }
  }

  function enterAdmin() {
    const input = prompt("Admin-PIN eingeben:");
    const expected = ADMIN_PIN || "1234";
    if ((input ?? "") === expected) {
      setAdmin(true);
      localStorage.setItem(adminKey, "1");
    } else {
      alert("Falsche PIN");
    }
  }
  function leaveAdmin() {
    setAdmin(false);
    localStorage.removeItem(adminKey);
  }

  const count = people.length;
  const pct = Math.min(100, Math.round((count / TARGET) * 100));

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-900 to-blue-950 text-gray-100">
      {/* Deko-Bubbles */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute -top-20 -left-20 h-60 w-60 rounded-full blur-3xl opacity-20 bg-blue-500" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-20 bg-indigo-600" />
      </div>

      {/* Header */}
      <header className="max-w-4xl mx-auto px-6 pt-14 pb-6 text-center">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="mt-3 text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-fuchsia-400 to-amber-300">
            Mein 40er – Let’s Party!
          </h1>
          <p className="mt-3 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
            40 Jahre jung – jetzt heißt’s: Party, Musik und gute Laune! Sei dabei!
          </p>
          <p className="mt-3 text-lg font-semibold text-blue-200">Freitag, 28. November · ab 18 Uhr · Eisarena Sillian</p>
        </motion.div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 pb-16">
        <section className="rounded-3xl shadow-2xl bg-black/40 backdrop-blur border border-blue-400/20">
          <div className="px-6 pt-6 pb-3 border-b border-blue-400/20">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-2xl font-semibold">
                <PartyPopper className="w-6 h-6 text-blue-400" /> Anmeldung
              </h2>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <Users2 className="w-4 h-4" />
                  <span>{loading ? "Lade…" : `${count} Zusage${count === 1 ? "" : "n"}`}</span>
                </div>
                <span className="opacity-40">|</span>
                {!admin ? (
                  <button onClick={enterAdmin} className="flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200">
                    <Lock className="w-4 h-4" /> Admin
                  </button>
                ) : (
                  <button onClick={leaveAdmin} className="flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200">
                    <Shield className="w-4 h-4" /> Admin-Modus
                  </button>
                )}
              </div>
            </div>

            {/* Fortschritt */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Ziel: {TARGET} Gäste</span>
                <span>{pct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-700 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 via-fuchsia-500 to-amber-400" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
              <input
                type="text"
                placeholder="Dein Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAttend(); }}
                className="px-3 py-2 rounded-xl border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-black/60 text-gray-100 placeholder:text-gray-400"
              />
              <button
                onClick={handleAttend}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-fuchsia-600 text-white font-semibold hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow"
              >
                <Check className="w-4 h-4" /> Ich komme!
              </button>
            </div>
            {error && (<p className="text-sm text-rose-400" role="alert">{error}</p>)}
          </div>
        </section>

        {/* Guest list */}
        {admin && (
          <section className="mt-6">
            <h2 className="text-lg font-semibold mb-3">Bisher zugesagt</h2>
            {loading ? (
              <div className="text-sm text-gray-400">Lade Liste…</div>
            ) : people.length === 0 ? (
              <div className="text-sm text-gray-400">Noch keine Zusagen.</div>
            ) : (
              <ul className="space-y-2">
                {people.map((p, idx) => (
                  <motion.li
                    key={p.id ?? `${p.name}-${p.created_at}-${idx}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.3) }}
                    className="flex items-center gap-3 bg-black/50 rounded-xl p-3 shadow-sm border border-blue-400/20"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 via-fuchsia-400 to-amber-300 flex items-center justify-center text-lg">
                      {pickEmoji(p.name)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium leading-tight text-gray-100">{p.name}</div>
                      <div className="text-xs text-gray-400">zugesagt: {formatTime(p.created_at)}</div>
                    </div>
                    {admin && (
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-xs text-rose-300 hover:text-rose-200 flex items-center gap-1"
                        title="Eintrag löschen"
                      >
                        <Trash2 className="w-4 h-4" /> löschen
                      </button>
                    )}
                  </motion.li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
