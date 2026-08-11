"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import type { SearchResult } from "@/app/api/search/route";

export function CommandPalette({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (trimmed.length < 2) return;
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?orgId=${orgId}&q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data: { results: SearchResult[] } = await res.json();
          setResults(data.results);
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, orgId]);

  const showResults = query.trim().length >= 2;
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setResults([]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="hidden gap-1.5 text-muted-foreground sm:flex">
          <Search className="size-3.5" />
          Search
          <kbd className="ml-1 rounded border bg-muted px-1 font-mono text-[10px]">Ctrl K</kbd>
        </Button>
      </DialogTrigger>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="sm:hidden">
          <Search className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-0 p-0 sm:max-w-lg" showCloseButton={false}>
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members, teams, venues, prospects…"
            className="border-0 shadow-none focus-visible:ring-0"
          />
          {loading ? <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" /> : null}
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {showResults && results.length === 0 && !loading ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">No results.</p>
          ) : null}
          {showResults
            ? Object.entries(grouped).map(([type, items]) => (
                <div key={type} className="mb-2">
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">{type}s</p>
                  {items.map((r) => (
                    <button
                      key={`${r.type}-${r.id}`}
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                        router.push(r.href);
                      }}
                      className="flex w-full flex-col rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                    >
                      <span className="font-medium">{r.label}</span>
                      {r.sublabel ? <span className="text-xs text-muted-foreground">{r.sublabel}</span> : null}
                    </button>
                  ))}
                </div>
              ))
            : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
