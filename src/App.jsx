import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Users2, PartyPopper, Lock, Trash2, Shield } from "lucide-react";

const TARGET = 40;

/** 🎈 Ein einzelner Ballon */
function Balloon({ size = 90, delay = 0 }) {
  const w = size;
  const h = Math.round(size * 1.25);

  const colors = [
    "linear-gradient(135deg, rgb(59 130 246), rgb(96 165 250))",
    "linear-gradient(135deg, rgb(232 121 249), rgb(244 114 182))",
    "linear-gradient(135deg, rgb(251 191 36), rgb(253 224 71))",
    "linear-gradient(135deg, rgb(59 130 246), rgb(232 121 249), rgb(251 191 36))",
  ];
  const color = colors[Math.floor(Math.random() * colors.length)];

  const startXvw = Math.random() * 92 + 4; // zufällige Startposition unten
  const drift = (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 40);

  return (
    <motion.div
      initial={{ y: "100vh", x: 0, opacity: 0 }}
      animate={{
        y: ["100vh", "-20vh"],
        x: [0, drift, drift * 0.5],
        opacity: [0, 1, 0.9, 0],
        scale: [1, 1.05, 1],
      }}
      transition={{
        duration: 14 + Math.random() * 6,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="absolute"
      style={{ left: `${startXvw}vw`, width: w, height: h }}
    >
      <div
        className="absolute inset-0 rounded-full shadow-xl"
        style={{ background: color, boxShadow: "0 8px 30px rgba(0,0,0,0.35)" }}
      />
      <div
        className="absolute rounded-full opacity-50"
        style={{
          top: h * 0.18,
          left: w * 0.18,
          width: w * 0.25,
          height: h * 0.18,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0))",
          transform: "rotate(-25deg)",
        }}
      />
      <div
        className="absolute"
        style={{
          left: "50%",
          bottom: -6,
          width: 10,
          height: 10,
          transform: "translateX(-50%) rotate(45deg)",
          background: color,
          borderRadius: 2,
        }}
      />
      <div
        className="absolute"
        style={{
          left: "calc(50% - 1px)",
          bottom: -6,
          width: 2,
          height: h * 1.1,
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.4), rgba(255,255,255,0.1))",
          borderRadius: 1,
        }}
      />
    </motion.div>
  );
}

/** 🎈🎈 BalloonsLayer: rendert weniger Ballons auf Mobile */
function BalloonsLayer({ desktopCount = 6, mobileCount = 3, minSize = 70, maxSize = 100, startDelayStep = 2 }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener ? mq.addEventListener("change", onChange) : mq.addListener(onChange);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", onChange) : mq.removeListener(onChange);
    };
  }, []);

  const count = isMobile ? mobileCount : desktopCount;

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Balloon
          key={i}
          delay={i * startDelayStep}
          size={Math.round(minSize + Math.random() * (maxSize - minSize))}
        />
      ))}
    </>
  );
}

/** 🎊 Konfetti */
function ConfettiPiece({ delay = 0 }) {
  const colors = ["#3b82f6", "#e879f9", "#fbbf24", "#22d3ee", "#f472b6"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const left = Math.random() * 100;
  const rotate = Math.random() * 360;

  return (
    <motion.div
      initial={{ y: "-10vh", opacity: 0, rotate }}
      animate={{ y: ["-10vh", "60vh"], opacity: [0, 1, 1, 0], rotate: rotate + 270 }}
      transition={{
        duration: 9 + Math.random() * 4,
        delay,
        repeat: Infinity,
        ease: "linear",
      }}
      className="absolute w-2.5 h-3.5 rounded-sm"
      style={{ left: `${left}%`, backgroundColor: color }}
    />
  );
}

export default function RSVP40() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [people, setPeople] = useState([]);
  const [error, setError] = useState("");
  const [admin, setAdmin] = useState(false);
  const [count, setCount] = useState(0);
  const [withPartner, setWithPartner] = useState(false);

  async function loadCount() {
    try {
      const r = await fetch(`/api/rsvps-count?t=${Date.now()}`, { cache: "no-store" });
      const j = await r.json();
      if (typeof j.count === "number") setCount(j.count);
    } catch {}
  }

  async function loadListIfAdmin() {
    try {
      const r = await fetch("/api/rsvps", { cache: "no-store" });
      if (r.status === 200) {
        const j = await r.json();
        setPeople(j);
        setAdmin(true);
        setCount(j.length);
      } else {
        setAdmin(false);
      }
    } catch {
      setAdmin(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCount();
    const id = setInterval(loadCount, 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!admin) return;
    loadListIfAdmin();
    const id = setInterval(loadListIfAdmin, 15000);
    return () => clearInterval(id);
  }, [admin]);

  async function handleAttend() {
    setError("");
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 60) {
      setError("Bitte gib deinen Namen (2–60 Zeichen) ein.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/rsvps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, partner: withPartner }),
      });
      const responseText = await r.text();
      let payload = null;
      try {
        payload = responseText ? JSON.parse(responseText) : null;
      } catch {
        payload = null;
      }

      if (!r.ok) {
        if (payload && typeof payload === "object" && payload.error === "too_many_per_ip") {
          setError("Zu viele Registrierungen von dieser IP.");
          return;
        }
        throw new Error("post_failed");
      }
      setName("");
      setWithPartner(false);

      if (admin) {
        if (Array.isArray(payload) && payload[0]) {
          setPeople((prev) => [...prev, payload[0]]);
          setCount((c) => c + 1);
        } else {
          await loadListIfAdmin();
        }
      } else {
        await loadCount();
      }
    } catch {
      setError("Ups – Anmeldung fehlgeschlagen. Bitte später erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!admin) return;
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;
    try {
      const r = await fetch("/api/rsvps", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) throw new Error("delete_failed");
      setPeople((prev) => prev.filter((p) => p.id !== id));
      setCount((c) => Math.max(0, c - 1));
    } catch {
      alert("Löschen fehlgeschlagen.");
    }
  }

  async function enterAdmin() {
    const pin = prompt("Admin-PIN eingeben:");
    if (!pin) return;
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (r.ok) {
      setAdmin(true);
      setLoading(true);
    } else {
      alert("Falsche PIN.");
    }
  }

  async function leaveAdmin() {
    try { await fetch("/api/logout", { method: "POST" }); } catch {}
    setAdmin(false);
    setPeople([]);
  }

  const visibleCount = admin ? people.length : count;
  const pct = Math.min(100, Math.ceil((visibleCount / TARGET) * 100));

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-900 to-blue-950 text-gray-100">
      {/* Hintergrund-Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -left-20 h-60 w-60 rounded-full blur-3xl opacity-20 bg-blue-500" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-20 bg-indigo-600" />

        {/* 🎈 Ballons (automatisch weniger auf Mobile) */}
        <BalloonsLayer desktopCount={6} mobileCount={3} />

        {/* 🎊 Konfetti */}
        {Array.from({ length: 15 }).map((_, i) => (
          <ConfettiPiece key={i} delay={i * 0.5} />
        ))}
      </div>

      {/* Inhalt */}
      <div className="relative z-10">
        <header className="max-w-4xl mx-auto px-6 pt-14 pb-6 text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="mt-3 text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-fuchsia-400 to-amber-300">
              Mein 40er – Let’s Party!
            </h1>
            <p className="mt-3 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              40 Jahre jung – jetzt heißt’s: Spaß, Musik und gute Laune! Sei dabei!
            </p>
            <p className="mt-3 text-lg font-semibold text-blue-200">
              Freitag, 28. November · ab 18 Uhr · Eisarena Sillian
            </p>
          </motion.div>
        </header>

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
                    <span>{loading ? "Lade…" : `${visibleCount} Zusage${visibleCount === 1 ? "" : "n"}`}</span>
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
                  <span>Ziel: {TARGET} Gäste · {visibleCount}/{TARGET}</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-700 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 via-fuchsia-500 to-amber-400" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-[1fr_auto] md:gap-3 md:items-start">
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Dein Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAttend(); }}
                    className="px-3 py-2 rounded-xl border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-black/60 text-gray-100 placeholder:text-gray-400"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-300 select-none">
                    <input
                      type="checkbox"
                      checked={withPartner}
                      onChange={(e) => setWithPartner(e.target.checked)}
                      className="h-4 w-4 rounded border border-gray-500 bg-black/60 text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <span>Ich bringe meinen Partner mit</span>
                  </label>
                </div>
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
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 via-fuchsia-400 to-amber-300 flex items-center justify-center text-lg">{"🎉"}</div>
                      <div className="flex-1">
                        <div className="font-medium leading-tight text-gray-100">{p.name}</div>
                        <div className="text-xs text-gray-400">zugesagt: {new Date(p.created_at).toLocaleString()}</div>
                        {p.ip && (
                          <div className="text-[11px] text-gray-500">IP: {p.ip}</div>
                        )}
                        {p.partner && (
                          <div className="text-xs text-blue-200 mt-1">kommt mit Partner</div>
                        )}
                      </div>
                      <button onClick={() => handleDelete(p.id)} className="text-xs text-rose-300 hover:text-rose-200 flex items-center gap-1" title="Eintrag löschen">
                        <Trash2 className="w-4 h-4" /> löschen
                      </button>
                    </motion.li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
