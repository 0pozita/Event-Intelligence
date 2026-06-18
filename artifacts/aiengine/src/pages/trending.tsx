import { useState } from "react";
import { Link } from "wouter";
import { TrendingUp, Clock, MapPin, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useListTrendingEvents } from "@workspace/api-client-react";

const CATEGORIES = [
  "All",
  "politics",
  "conflict",
  "science",
  "health",
  "environment",
  "economy",
  "technology",
  "general",
];

const STATUS_COLOR: Record<string, string> = {
  active: "bg-warning text-warning-foreground",
  resolved: "bg-success/20 text-success",
  ongoing: "bg-primary/20 text-primary",
  archived: "bg-muted text-muted-foreground",
};

export default function Trending() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [limit, setLimit] = useState(20);

  const { data, isLoading } = useListTrendingEvents({ limit });

  const events = data?.events ?? [];
  const filtered =
    activeCategory === "All"
      ? events
      : events.filter((e) => e.category === activeCategory);

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight font-mono uppercase">
            Trending Intelligence
          </h1>
        </div>
        <p className="text-muted-foreground">
          Events ranked by activity and verification activity. Updated continuously.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap mb-8">
        <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-sm text-xs font-mono uppercase tracking-wider transition-all border ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Event grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card key={i} className="p-5 border-border bg-card">
              <Skeleton className="h-4 w-20 mb-3" />
              <Skeleton className="h-5 w-full mb-2" />
              <Skeleton className="h-5 w-3/4 mb-4" />
              <Skeleton className="h-16 w-full mb-4" />
              <Skeleton className="h-4 w-24" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-mono text-sm">NO EVENTS IN THIS CATEGORY</p>
          <p className="text-sm mt-2">
            {activeCategory !== "All" ? (
              <button
                onClick={() => setActiveCategory("All")}
                className="text-primary hover:underline"
              >
                Clear filter
              </button>
            ) : (
              "No trending events at this time."
            )}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((event, idx) => (
              <Link key={event.id} href={`/event/${event.id}`}>
                <Card
                  className="p-5 h-full bg-card border-border hover:border-primary/40 transition-all hover:bg-secondary/20 cursor-pointer group flex flex-col"
                  style={{
                    animationDelay: `${idx * 50}ms`,
                  }}
                >
                  {/* Top row */}
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <Badge
                      variant="outline"
                      className="text-xs font-mono uppercase tracking-wider text-primary border-primary/20 px-1.5 py-0.5"
                    >
                      {event.category}
                    </Badge>
                    {event.status && (
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-mono px-1.5 py-0.5 rounded-sm ${
                          STATUS_COLOR[event.status] ?? STATUS_COLOR.archived
                        }`}
                      >
                        {event.status === "active" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        )}
                        {event.status.toUpperCase()}
                      </span>
                    )}
                    <span className="ml-auto text-xs font-mono text-muted-foreground">
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-base font-bold mb-2 leading-snug group-hover:text-primary transition-colors line-clamp-2 flex-1">
                    {event.title}
                  </h2>

                  {/* Summary */}
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                    {event.summary ?? event.description}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground mt-auto pt-3 border-t border-border/50">
                    {event.location && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {event.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1 ml-auto flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {new Date(event.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <ChevronRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {/* Load more */}
          {events.length >= limit && (
            <div className="flex justify-center mt-8">
              <Button
                variant="outline"
                onClick={() => setLimit((l) => l + 20)}
                className="font-mono text-xs"
              >
                Load More Events
              </Button>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground font-mono mt-6">
            Showing {filtered.length} of {events.length} events
          </p>
        </>
      )}
    </div>
  );
}
