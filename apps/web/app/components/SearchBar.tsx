"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  type: "run" | "payment" | "attestation";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  meta?: string;
}

const TYPE_ICONS: Record<string, string> = {
  run: "◎", payment: "⚡", attestation: "⛓",
};
const TYPE_COLORS: Record<string, string> = {
  run: "#00E5C9", payment: "#FFB300", attestation: "#7B5EFF",
};

export default function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Keyboard shortcut: ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 250);
    return () => clearTimeout(t);
  }, [query, search]);

  const navigate = (href: string) => {
    router.push(href);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    if (e.key === "Enter" && active >= 0 && results[active]) navigate(results[active].href);
  };

  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono',monospace" };

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, ...mono, color:"#4A7090", background:"rgba(15,23,42,0.8)", border:"1px solid #1E3A5F", borderRadius:6, padding:"5px 12px", cursor:"pointer", whiteSpace:"nowrap" }}>
        <span style={{ fontSize:11 }}>⌘K</span>
        <span style={{ fontSize:11 }}>Search</span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex", alignItems:"flex-start", justifyContent:"center", paddingTop:"80px", background:"rgba(10,23,42,0.8)", backdropFilter:"blur(4px)" }}
          onClick={() => setOpen(false)}>
          <div style={{ width:"100%", maxWidth:560, background:"#0A2540", border:"1px solid #1E3A5F", borderRadius:12, overflow:"hidden", boxShadow:"0 24px 80px rgba(0,0,0,0.6)" }}
            onClick={e => e.stopPropagation()}>

            {/* Input */}
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 18px", borderBottom:"1px solid #1E3A5F" }}>
              <span style={{ fontSize:16, color:"#4A7090" }}>◎</span>
              <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setActive(-1); }}
                onKeyDown={handleKey}
                placeholder="Search runs, payments, attestations…"
                style={{ flex:1, background:"transparent", border:"none", outline:"none", fontSize:14, color:"#F8FAFC", fontFamily:"'Plus Jakarta Sans',system-ui" }} />
              {loading && <span style={{ fontSize:11, ...mono, color:"#4A7090" }}>…</span>}
              <button onClick={() => setOpen(false)} style={{ fontSize:11, ...mono, color:"#4A7090", background:"transparent", border:"1px solid #1E3A5F", borderRadius:4, padding:"2px 8px", cursor:"pointer" }}>ESC</button>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div style={{ maxHeight:360, overflowY:"auto" }}>
                {results.map((r, i) => (
                  <div key={r.id} onClick={() => navigate(r.href)}
                    style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 18px", cursor:"pointer", borderBottom:"1px solid #1E3A5F", background: i === active ? "rgba(0,229,201,0.05)" : "transparent", transition:"background .1s" }}
                    onMouseEnter={() => setActive(i)}
                    onMouseLeave={() => setActive(-1)}>
                    <span style={{ fontSize:16, color:TYPE_COLORS[r.type], flexShrink:0 }}>{TYPE_ICONS[r.type]}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, color:"#F8FAFC", fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.title}</div>
                      <div style={{ fontSize:11, ...mono, color:"#4A7090", marginTop:2 }}>{r.subtitle}</div>
                    </div>
                    {r.meta && <span style={{ fontSize:10, ...mono, color:"#2A4060", flexShrink:0 }}>{r.meta}</span>}
                  </div>
                ))}
              </div>
            )}

            {query.length >= 2 && results.length === 0 && !loading && (
              <div style={{ padding:"24px", textAlign:"center", fontSize:13, color:"#4A7090" }}>
                No results for &ldquo;{query}&rdquo;
              </div>
            )}

            {/* Footer */}
            <div style={{ padding:"8px 18px", borderTop:"1px solid #1E3A5F", display:"flex", gap:16, alignItems:"center" }}>
              {[["↑↓","Navigate"],["↵","Open"],["ESC","Close"]].map(([key,label]) => (
                <span key={key} style={{ fontSize:11, ...mono, color:"#4A7090" }}>
                  <span style={{ color:"#B8D4E8", marginRight:4 }}>{key}</span>{label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
