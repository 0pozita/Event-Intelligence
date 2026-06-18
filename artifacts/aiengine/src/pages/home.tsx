import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, ChevronRight, Activity, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchEvents, useListTrendingEvents, getSearchEventsQueryKey } from "@workspace/api-client-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const { data: trendingEvents, isLoading: isLoadingTrending } = useListTrendingEvents({ limit: 4 });
  const { data: searchResults, isLoading: isSearchLoading } = useSearchEvents(
    { q: searchQuery, limit: 5 },
    { query: { enabled: searchQuery.length > 2, queryKey: getSearchEventsQueryKey({ q: searchQuery, limit: 5 }) } }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length > 2) {
      setIsSearching(true);
      // Wait for search results or navigate immediately if we want to build a dedicated search page
      // Here we show results inline
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 flex flex-col items-center justify-center overflow-hidden border-b border-border bg-grid-pattern">
        <div className="absolute inset-0 bg-background/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        
        <div className="relative z-10 container max-w-4xl mx-auto px-4 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-8 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Global Intelligence Feed Active
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            What <span className="text-primary italic font-serif">really</span> happened?
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl font-light">
            Search raw intelligence, verified claims, and corroborated timelines.
            Cut through the noise with AI-driven evidence analysis.
          </p>

          <form onSubmit={handleSearch} className="w-full max-w-2xl relative">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                type="search"
                placeholder="Search entities, events, or claims..." 
                className="w-full h-16 pl-14 pr-32 text-lg bg-secondary/50 border-secondary ring-offset-background focus-visible:ring-primary font-mono placeholder:font-sans"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button 
                type="submit" 
                size="sm" 
                className="absolute right-2 top-1/2 -translate-y-1/2 h-12 px-6 font-mono"
                disabled={searchQuery.length <= 2}
              >
                Analyze
              </Button>
            </div>
            
            {/* Search Results Dropdown */}
            {searchQuery.length > 2 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-md shadow-xl overflow-hidden z-50 text-left animate-in fade-in slide-in-from-top-2">
                {isSearchLoading ? (
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-6 w-5/6" />
                  </div>
                ) : searchResults?.events?.length ? (
                  <div className="divide-y divide-border">
                    <div className="px-4 py-2 bg-muted/50 border-b border-border">
                      <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Signals found</span>
                    </div>
                    {searchResults.events.map(event => (
                      <Link 
                        key={event.id} 
                        href={`/event/${event.id}`}
                        className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors group cursor-pointer block"
                      >
                        <div>
                          <div className="font-semibold group-hover:text-primary transition-colors">{event.title}</div>
                          <div className="text-sm text-muted-foreground line-clamp-1 mt-1">{event.summary || event.description}</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-4" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-muted-foreground font-mono text-sm">
                    No intelligence found matching your query.
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      </section>

      {/* Trending Section */}
      <section className="py-16 md:py-24 container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold font-mono uppercase tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Active Briefings
            </h2>
            <p className="text-muted-foreground mt-1">High-priority events currently under analysis</p>
          </div>
          <Button variant="outline" asChild className="font-mono text-xs">
            <Link href="/trending">View all trending</Link>
          </Button>
        </div>

        {isLoadingTrending ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="p-6 bg-secondary/20 border-border">
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-6 w-3/4 mb-4" />
                <Skeleton className="h-20 w-full" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trendingEvents?.events.map((event) => (
              <Link key={event.id} href={`/event/${event.id}`}>
                <Card className="p-6 h-full hover:bg-secondary/40 transition-colors border-border/50 hover:border-primary/50 cursor-pointer group bg-card">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-mono uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-sm border border-primary/20">
                      {event.category}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(event.createdAt).toLocaleDateString()}
                    </span>
                    {event.status === 'active' && (
                      <span className="w-2 h-2 rounded-full bg-warning animate-pulse ml-auto" />
                    )}
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                    {event.title}
                  </h3>
                  <p className="text-muted-foreground text-sm line-clamp-3">
                    {event.summary || event.description}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
