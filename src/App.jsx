import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Users2, PartyPopper, Copy, Share2 } from "lucide-react";

// --- Simple storage adapters ---------------------------------------------
const localKey = "rsvp_attendees_40th";
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
    const next = [...all, item];
    localStorage.setItem(localKey, JSON.stringify(next));
    return item;
  },
};

// OPTIONAL: Supabase adapter
const SUPABASE_URL = "";
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

// Main component ------------------------------------------------------------
export default function RSVP40() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [people, setPeople] = useState([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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
        await LocalStore.add(payload);
        return payload;
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

  const count = people.length;

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-fuchsia-100 via-white to-rose-50 text-gray-900">
      <header className="max-w-3xl mx-auto px-6 pt-12 pb-4 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3"
        >
          Mein 40er – Let’s Party!
        </motion.h1>
        <p className="text-lg md:text-xl text-gray-700">
          Es ist so weit: 40 Jahre voll mit Geschichten, Lachen und guten Menschen. 
          Ich feiere – und du bist eingeladen! Sag kurz Bescheid, ob du dabei bist, damit ich genug 
          <span className="mx-1">🍰</span> und <span className="mx-1">🍾</span> einplane.
        </p>
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-16">
        <div className="rounded-2xl shadow-xl bg-white">
          <div className="px-6 pt-6 pb-2 border-b">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-2xl font-semibold">
                <PartyPopper className="w-6 h-6" /> Anmeldung
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users2 className="w-4 h-4" />
                <span>
                  {loading ? "Lade…" : `${count} Zusage${count === 1 ? "" : "n"}`}
                </span>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
              <input
                type="text"
                placeholder="Dein Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAttend();
                }}
                className="px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
              />
              <button
                onClick={handleAttend}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-fuchsia-500 text-white font-semibold hover:bg-fuchsia-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Ich komme!
              </button>
            </div>
            {error && (
              <p className="text-sm text-red-600" role="alert">{error}</p>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                className="px-3 py-1.5 rounded-xl border text-sm flex items-center gap-2"
                onClick={copyUrl}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Link kopieren
              </button>
              <button
                className="px-3 py-1.5 rounded-xl border text-sm flex items-center gap-2"
                onClick={() => navigator.share?.({ title: "Mein 40er", text: "Kommst du?", url: window.location.href })}
              >
                <Share2 className="w-4 h-4" /> Teilen
              </button>
              <div className="text-xs text-gray-500 ml-auto">
                Speicher: <span className="font-medium">{activeStore === "supabase" ? "Online (Supabase)" : "Dieses Gerät"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Guest list */}
        <section className="mt-6">
          <h2 className="text-lg font-semibold mb-3">Bisher zugesagt</h2>
          {loading ? (
            <div className="text-sm text-gray-600">Lade Liste…</div>
          ) : people.length === 0 ? (
            <div className="text-sm text-gray-600">Noch keine Zusagen – sei die/der Erste! 🎈</div>
          ) : (
            <ul className="space-y-2">
              {people.map((p, idx) => (
                <motion.li
                  key={p.id ?? `${p.name}-${p.created_at}-${idx}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.3) }}
                  className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm"
                >
                  <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-lg">
                    {pickEmoji(p.name)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium leading-tight">{p.name}</div>
                    <div className="text-xs text-gray-500">zugesagt: {formatTime(p.created_at)}</div>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-10 text-center text-xs text-gray-500">
          <p>
            Tipp: Für echte Online-Speicherung untenstehende Supabase-Konstanten füllen. Dann sieht jeder die Zusagen live.
          </p>
        </footer>
      </main>
    </div>
  );
}