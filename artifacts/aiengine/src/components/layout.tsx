import { Link, useLocation } from "wouter";
import { Activity, ShieldCheck, Search } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col font-sans dark selection:bg-primary/30">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 mr-6 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center border border-primary/20">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold tracking-tight text-lg font-mono">AIEngine</span>
          </Link>
          
          <nav className="flex items-center gap-1 font-mono text-sm">
            <Link href="/" className={`px-4 py-2 rounded-sm transition-colors ${location === '/' ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}>
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search
              </span>
            </Link>
            <Link href="/fact-check" className={`px-4 py-2 rounded-sm transition-colors ${location === '/fact-check' ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}>
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Fact Check
              </span>
            </Link>
            <Link href="/trending" className={`px-4 py-2 rounded-sm transition-colors ${location === '/trending' ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}>
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Trending
              </span>
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t border-border py-6 md:py-0">
        <div className="container mx-auto px-4 flex flex-col md:flex-row md:h-16 items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground font-mono">
            AIEngine © {new Date().getFullYear()} — Verified Intelligence
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              SYSTEM OPERATIONAL
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
