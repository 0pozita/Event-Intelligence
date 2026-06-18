import { useParams, Link } from "wouter";
import {
  ArrowLeft,
  Clock,
  MapPin,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  HelpCircle,
  Shield,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { TrustScore } from "@/components/trust-score";
import {
  useGetEvent,
  useGetEventTimeline,
  useListEvidence,
  getGetEventQueryKey,
  getGetEventTimelineQueryKey,
  getListEvidenceQueryKey,
} from "@workspace/api-client-react";

type ClaimStatus = "verified" | "partially_verified" | "unverified" | "false";

const STATUS_CONFIG: Record<
  ClaimStatus,
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string }
> = {
  verified: { icon: CheckCircle, label: "Verified", color: "text-success" },
  partially_verified: { icon: AlertCircle, label: "Partial", color: "text-warning" },
  unverified: { icon: HelpCircle, label: "Unverified", color: "text-muted-foreground" },
  false: { icon: XCircle, label: "False", color: "text-destructive" },
};

const SOURCE_TYPE_LABEL: Record<string, string> = {
  news: "NEWS",
  government: "GOV",
  official: "OFFICIAL",
  social: "SOCIAL",
  research: "RESEARCH",
};

function SourceCredibilityBar({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-success" : score >= 40 ? "bg-warning" : "bg-destructive";
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-6 text-right">
        {score}
      </span>
    </div>
  );
}

function EvidencePanel({ claimId }: { claimId: number }) {
  const { data: evidence } = useListEvidence(
    { claimId },
    { query: { queryKey: getListEvidenceQueryKey({ claimId }) } }
  );

  if (!evidence?.length) {
    return (
      <p className="text-xs text-muted-foreground italic">No evidence attached.</p>
    );
  }

  return (
    <ul className="space-y-2 mt-2">
      {evidence.map((ev) => (
        <li key={ev.id} className="flex items-start gap-2 text-sm">
          <span
            className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${
              ev.strength === "strong"
                ? "bg-success"
                : ev.strength === "medium"
                  ? "bg-warning"
                  : "bg-muted-foreground"
            }`}
          />
          <div>
            <p className="text-muted-foreground">{ev.text}</p>
            {ev.url && (
              <a
                href={ev.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                Source <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function EventDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const { data: event, isLoading, error } = useGetEvent(
    id,
    { query: { enabled: !!id, queryKey: getGetEventQueryKey(id) } }
  );

  const { data: timeline } = useGetEventTimeline(
    id,
    { query: { enabled: !!id, queryKey: getGetEventTimelineQueryKey(id) } }
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <Skeleton className="h-6 w-32 mb-8" />
        <Skeleton className="h-10 w-2/3 mb-4" />
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-5 w-4/5 mb-10" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-5xl text-center">
        <Shield className="w-16 h-16 text-destructive mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold font-mono mb-2">INTELLIGENCE NOT FOUND</h2>
        <p className="text-muted-foreground mb-6">
          This event record does not exist or has been removed.
        </p>
        <Button asChild variant="outline">
          <Link href="/">Return to Search</Link>
        </Button>
      </div>
    );
  }

  const sources = (event as unknown as { sources?: Array<{ id: number; name: string; url: string; type: string; credibilityScore: number; publishedAt?: string }> }).sources ?? [];
  const claims = (event as unknown as { claims?: Array<{ id: number; text: string; status: ClaimStatus; confidence: number }> }).claims ?? [];
  const trustScore = (event as unknown as { trustScore?: number }).trustScore ?? 50;
  const trustRating = (event as unknown as { trustRating?: string }).trustRating ?? "Medium";

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      {/* Back */}
      <Button variant="ghost" asChild className="mb-6 -ml-2 font-mono text-xs text-muted-foreground">
        <Link href="/">
          <ArrowLeft className="w-4 h-4 mr-1" />
          BACK TO SEARCH
        </Link>
      </Button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider text-primary border-primary/30">
            {event.category}
          </Badge>
          {event.status === "active" && (
            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-warning">
              <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
              ACTIVE
            </span>
          )}
          {event.location && (
            <span className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {event.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground ml-auto">
            <Clock className="w-3 h-3" />
            {new Date(event.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 leading-tight">
          {event.title}
        </h1>
        {event.summary && (
          <p className="text-lg text-muted-foreground leading-relaxed">
            {event.summary}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Description */}
          {event.description && (
            <Card className="p-6 bg-card border-border">
              <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-primary rounded-full" />
                FULL BRIEF
              </h2>
              <p className="text-foreground leading-relaxed">{event.description}</p>
            </Card>
          )}

          {/* Claims */}
          {claims.length > 0 && (
            <div>
              <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-primary rounded-full" />
                EXTRACTED CLAIMS
              </h2>
              <div className="space-y-4">
                {claims.map((claim, idx) => {
                  const statusKey = (claim.status ?? "unverified") as ClaimStatus;
                  const cfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.unverified;
                  const Icon = cfg.icon;
                  return (
                    <Card
                      key={claim.id}
                      className="p-4 border-border bg-card hover:border-primary/30 transition-colors"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${cfg.color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-relaxed mb-3">{claim.text}</p>
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="outline"
                              className={`text-xs font-mono ${cfg.color} border-current/20`}
                            >
                              {cfg.label}
                            </Badge>
                            <span className="text-xs font-mono text-muted-foreground">
                              confidence: {Math.round((claim.confidence ?? 0) * 100)}%
                            </span>
                            <Link
                              href="/fact-check"
                              className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                            >
                              Verify <ChevronRight className="w-3 h-3" />
                            </Link>
                          </div>
                          <EvidencePanel claimId={claim.id} />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timeline */}
          {timeline && timeline.length > 0 && (
            <div>
              <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-primary rounded-full" />
                CHRONOLOGICAL TIMELINE
              </h2>
              <div className="relative">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                <ul className="space-y-6">
                  {timeline.map((entry, idx) => (
                    <li
                      key={entry.id}
                      className="flex gap-4"
                      style={{ animationDelay: `${idx * 80}ms` }}
                    >
                      <div className="flex-shrink-0 w-4 h-4 mt-0.5 rounded-full border-2 border-primary bg-background" />
                      <div className="pb-2">
                        <span className="text-xs font-mono text-primary block mb-1">
                          {new Date(entry.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <h3 className="text-sm font-semibold mb-1">{entry.title}</h3>
                        {entry.description && (
                          <p className="text-sm text-muted-foreground">{entry.description}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Trust Score */}
          <Card className="p-6 border-border bg-card text-center">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">
              INTELLIGENCE INTEGRITY
            </h3>
            <div className="flex justify-center mb-4">
              <TrustScore score={trustScore} size="xl" showLabel={false} />
            </div>
            <div className="text-sm font-mono mb-1">
              <span
                className={
                  trustRating === "High"
                    ? "text-success"
                    : trustRating === "Medium"
                      ? "text-warning"
                      : "text-destructive"
                }
              >
                {trustRating.toUpperCase()} TRUST
              </span>
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-2xl font-mono font-bold">{sources.length}</div>
                <div className="text-xs text-muted-foreground">Sources</div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold">{claims.length}</div>
                <div className="text-xs text-muted-foreground">Claims</div>
              </div>
            </div>
          </Card>

          {/* Sources */}
          {sources.length > 0 && (
            <Card className="p-5 border-border bg-card">
              <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">
                SOURCE MATRIX
              </h3>
              <ul className="space-y-4">
                {sources.map((source) => (
                  <li key={source.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className="text-xs font-mono text-primary border-primary/20 px-1.5 py-0.5 flex-shrink-0"
                          >
                            {SOURCE_TYPE_LABEL[source.type] ?? source.type.toUpperCase()}
                          </Badge>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:text-primary transition-colors truncate flex items-center gap-1"
                          >
                            {source.name}
                            <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-50" />
                          </a>
                        </div>
                        <SourceCredibilityBar score={source.credibilityScore} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Fact check CTA */}
          <Card className="p-5 border-primary/20 bg-primary/5">
            <h3 className="text-xs font-mono uppercase tracking-wider text-primary mb-2">
              VERIFY A CLAIM
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Have a specific claim to verify? Run an AI fact check.
            </p>
            <Button asChild size="sm" className="w-full font-mono">
              <Link href="/fact-check">Open Fact Checker</Link>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
