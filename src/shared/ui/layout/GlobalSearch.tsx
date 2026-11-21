import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { API_ROUTES, withQuery } from "@/shared/config/routes";
import { apiRequest, isAbortError } from "@/shared/client/api";
import { useClickOutside } from "@/shared/client/hooks";

const SEARCH_DEBOUNCE_MS = 300;
export function GlobalSearch() {
  const tShell = useTranslations("shell");
  const searchRef = useRef<HTMLDivElement>(null);
  // Global search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  useClickOutside(searchRef, () => setShowResults(false), showResults);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    // Cancel the previous search so a stale response cannot reopen the dropdown or overwrite newer results.
    const controller = new AbortController();
    const delayDebounce = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const data = await apiRequest<typeof searchResults>(withQuery(API_ROUTES.search, { q: searchQuery }), { signal: controller.signal });
        setSearchResults(data);
        setShowResults(true);
      } catch (err) {
        if (!isAbortError(err)) console.error(err);
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(delayDebounce);
      controller.abort();
    };
  }, [searchQuery]);
  return (
    <div ref={searchRef} className="relative flex-1 xl:w-64">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-400" />
      <input
        type="text"
        placeholder={tShell("search.placeholder")}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        aria-label={tShell("search.aria")}
        className="w-full rounded-full bg-white pl-9 pr-4 py-2 text-sm text-purple-950 placeholder:text-gray-400 font-bold shadow-sm outline-none focus:ring-2 focus:ring-primary/20 border border-purple-100"
      />

      {/* Search results dropdown */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 xl:left-auto xl:right-0 mt-2 w-full xl:w-80 max-h-80 overflow-y-auto bg-white/95 rounded-2xl border border-purple-100 shadow-2xl p-2 z-[200] backdrop-blur-md"
          >
            {searchLoading ? (
              <p className="text-xs text-gray-400 p-3 text-center">{tShell("search.searching")}</p>
            ) : searchResults.length === 0 ? (
              <p className="text-xs text-gray-400 p-3 text-center">{tShell("search.noResults")}</p>
            ) : (
              <div className="space-y-1">
                {searchResults.map((res) => (
                  <Link
                    key={res.id}
                    href={res.href}
                    onClick={() => { setShowResults(false); setSearchQuery(""); }}
                    className="block rounded-xl p-2.5 hover:bg-primary-soft transition-colors border border-transparent hover:border-purple-100 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xs font-black text-primary bg-purple-50 px-2 py-0.5 rounded-full">{res.type}</span>
                      <span className="text-3xs text-gray-400">{res.desc}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-800 mt-1 truncate">{res.title}</p>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
