// SearchBar.jsx
import React, { useState, useEffect, useRef } from "react";
import { CiSearch } from "react-icons/ci";

/*
  SearchBar component:
  - Shows history items that start with input (case-insensitive).
  - Queries backend for product recommendations via fetch.
  - Stores clicked search terms and clicked product suggestions in localStorage.
  - Supports keyboard navigation (ArrowUp, ArrowDown, Enter, Esc).
*/

// keys in localStorage
const HISTORY_KEY = "artisan_search_history_v1";
const MAX_HISTORY = 50; // maximum items to keep in history

// helper - read history from localStorage
function readHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("readHistory error", e);
    return [];
  }
}

// helper - write history (dedupe by id or value, newest first)
function writeHistory(items) {
  try {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(items.slice(0, MAX_HISTORY))
    );
  } catch (e) {
    console.error("writeHistory error", e);
  }
}

// helper - record an event in history
function pushHistory(entry) {
  // entry: { type: "search" | "product", value: "text", id?: "productId", url?: "/p/..." }
  const hist = readHistory();
  // remove duplicates (product id or search value)
  const filtered = hist.filter((h) => {
    if (entry.type === "product" && h.type === "product")
      return h.id !== entry.id;
    if (entry.type === "search" && h.type === "search")
      return h.value.toLowerCase() !== entry.value.toLowerCase();
    return true;
  });
  filtered.unshift({ ...entry, ts: Date.now() });
  writeHistory(filtered);
}

// Clears entire search + product click history
function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY); // remove from browser storage
  } catch (e) {
    console.error("clearHistory error", e);
  }
}

export default function SearchBar({
  navigateTo /* function (url) or undefined */,
}) {
  const [q, setQ] = useState("");
  const [historyMatches, setHistoryMatches] = useState([]);
  const [suggestions, setSuggestions] = useState([]); // from backend
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1); // keyboard nav index
  const abortRef = useRef(null);
  const cacheRef = useRef({}); // in-memory cache of query->results for session

  // Debounce timer
  const debounceRef = useRef(null);

  // Filter local history for prefix matches (case-insensitive)
  function computeHistoryMatches(input) {
    if (!input) return readHistory().slice(0, 6); // show recent history if nothing typed
    const lower = input.toLowerCase();
    return readHistory()
      .filter((h) => {
        // for 'search' type look at value, for 'product' check title/value
        const t = (h.type === "search" ? h.value : h.value || "").toLowerCase();
        return t.startsWith(lower);
      })
      .slice(0, 6);
  }

  // Query backend for recommendations (use cache)
  async function fetchSuggestions(qstr) {
    if (!qstr) return [];
    if (cacheRef.current[qstr]) return cacheRef.current[qstr];

    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    try {
      // example endpoint: /api/recommendations?q=...&limit=6
      const resp = await fetch(
        `/api/listings/recommend?query=${encodeURIComponent(
          qstr
        )}&k=6`,
        { signal: abortRef.current.signal }
      );
      if (!resp.ok) throw new Error("network");
      const json = await resp.json(); // expected: [{ id, title, url, thumbnail }, ...]
      console.log("[recs response]", json);
      //console.log(json);
      cacheRef.current[qstr] = json;
      setLoading(false);
      return json;
    } catch (e) {
      if (e.name === "AbortError") {
        // request cancelled — ignore
      } else {
        console.error("fetchSuggestions error", e);
      }
      setLoading(false);
      return [];
    }
  }

  // handle input changes with debounce
  useEffect(() => {
    setSelectedIdx(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const hist = computeHistoryMatches(q);
      setHistoryMatches(hist);
      // Also get product suggestions from backend unless user typed very short string
      if (q.trim().length >= 1) {
        const recs = await fetchSuggestions(q.trim());
        //console.log(recs);
        setSuggestions(recs || []);
      } else {
        setSuggestions([]);
      }
    }, 220); // 220ms debounce
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  // Click handlers - navigate and push to history
  // Click handlers - navigate and push to history
  function handleNavigate(item) {
    // item can be history entry or product suggestion
    if (item.type === "search") {
      // store search and go to search results page
      pushHistory({ type: "search", value: item.value });
      const searchUrl = `/search?query=${encodeURIComponent(item.value)}`;
      if (navigateTo) navigateTo(searchUrl);
      else window.location.href = searchUrl;
    } else if (item.type === "product") {
      // Accept either item._id or item.id (be tolerant)
      const listingId =
        item._id || item.id || (item.raw && item.raw._id) || null;
      // push history using a stable id
      pushHistory({
        type: "product",
        id: listingId || item.id || item._id,
        value: item.title,
      });

      // prefer explicit url if provided by caller (keeps existing behavior)
      const targetUrl =
        item.url || (listingId ? `/products/${listingId}` : item.url || "/");

      if (navigateTo) navigateTo(targetUrl);
      else window.location.href = targetUrl;
    }
    setOpen(false);
  }

  // handle click on a suggestion from backend
  function onSuggestionClick(sug) {
    // ensure we pass both _id and id and url fields so handleNavigate always finds the id
    const safe = {
      type: "product",
      _id: sug._id || sug.id,
      id: sug.id || sug._id,
      title: sug.title,
      url: sug.url || `/products/${sug._id || sug.id}`,
      raw: sug,
    };
    handleNavigate(safe);
  }

  // handle pressing Enter when typing
  function submitSearch(term) {
    pushHistory({ type: "search", value: term });
    const searchUrl = `/search?query=${encodeURIComponent(term)}`;
    if (navigateTo) navigateTo(searchUrl);
    else window.location.href = searchUrl;
    setOpen(false);
  }

  // keyboard nav
  function onKeyDown(e) {
    const flattened = [
      ...historyMatches.map((h) => ({ ...h, __source: "history" })),
      ...suggestions.map((s) => ({ ...s, __source: "product" })),
    ];
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, flattened.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIdx >= 0 && selectedIdx < flattened.length) {
        const sel = flattened[selectedIdx];
        if (sel.__source === "history") handleNavigate(sel);
        else onSuggestionClick(sel);
      } else {
        submitSearch(q.trim());
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // close on outside click
  const wrapperRef = useRef();
  useEffect(() => {
    function onDocClick(e) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [wrapperRef]);

  // render
  const flattened = [
    ...historyMatches.map((h) => ({ ...h, __source: "history" })),
    ...suggestions.map((s) => ({ ...s, __source: "product" })),
  ];

  return (
    <div
      ref={wrapperRef}
      className="w-64 md:w-96 flex items-center rounded-xl h-12 border-2 border-primary/60"
    >
      <input
        aria-label="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKeyDown}
        onClick={() => setOpen(true)}
        placeholder="Search artisans, products..."
        className="w-100% w-64 md:w-96 pl-4 mr-8 text-gray-800 outline-none font-semibold text-sm bg-transparent"
        autoFocus
      />

      {/*
        ADDED SEARCH BUTTON:
        - Sits at the end of the input inside the same flex container (no existing logic changed).
        - Calls existing submitSearch(term) to preserve original behavior (history push + navigation).
        - Disabled when query is empty to avoid empty searches.
      */}
      <button
        // small inline style to keep it visually at the end; uses flex parent's layout so no other container changes
        style={{
          marginLeft: "auto",
          marginRight: "2%",
          border: "none",
          cursor: q.trim().length ? "pointer" : "not-allowed",
          fontWeight: 700,
          color: q.trim().length ? "#0b5cff" : "#9aa4bf",
        }}
        aria-label="Search"
        className="hover:bg-indigo-300 p-2 rounded-full"
        // only perform search when there is text (matches existing code expectations)
        onClick={() => {
          const term = q.trim();
          if (!term) return; // noop when empty (do not change existing submit logic)
          submitSearch(term); // reuse existing function so logic is consistent
        }}
        // prevent the button click from closing the dropdown prematurely via onDocClick (but we want navigation to proceed)
        onMouseDown={(e) => e.preventDefault()}
      >
        <CiSearch className="text-2xl" />
      </button>

      {open && (flattened.length > 0 || loading) && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: "55%",
            right: 0,
            background: "#fff",
            zIndex: 40,
            borderRadius: 6,
            maxHeight: 360,
            maxWidth: 480,
            overflowY: "auto",
          }}
        >
          {flattened.length === 0 && loading && (
            <div style={{ padding: 12 }}>Loading...</div>
          )}
          {/* Show Clear History ONLY if history exists */}
          {historyMatches.length > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 10px",
                borderBottom: "1px solid #eee",
                background: "#fafafa",
                position: "sticky", // keep visible if list scrolls
                top: 0,
                zIndex: 5,
              }}
            >
              <span style={{ fontSize: 12, color: "#666" }}>
                Recent History
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation(); // prevent dropdown from closing
                  clearHistory(); // call clear fn
                  setHistoryMatches([]); // clear UI state
                }}
                style={{
                  fontSize: 12,
                  color: "#ff4444",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                Clear History
              </button>
            </div>
          )}
          {flattened.map((it, idx) => (
            <div
              key={`${it.__source}-${it.id || it.value}-${idx}`}
              onMouseDown={(ev) => ev.preventDefault()} // prevent input blur before click
              onClick={() => {
                if (it.__source === "history") handleNavigate(it);
                else onSuggestionClick(it);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                background: idx === selectedIdx ? "#f5f7fb" : "transparent",
                cursor: "pointer",
              }}
            >
              {it.__source === "product" ? (
                <>
                  <img
                    src={it.thumbnail || "/placeholder-40.png"}
                    alt=""
                    width={40}
                    height={40}
                    style={{ objectFit: "cover", borderRadius: 6 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {it.title}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{ width: 40, textAlign: "center", color: "#999" }}
                  >
                    ⎈
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14 }}>{it.value}</div>
                    <div style={{ fontSize: 12, color: "#999" }}>
                      History • {new Date(it.ts).toLocaleString()}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
          {flattened.length === 0 && !loading && (
            <div style={{ padding: 12 }}>No suggestions</div>
          )}
        </div>
      )}
    </div>
  );
}
