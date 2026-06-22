import { useState, useRef } from "react";
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  HelpCircle,
  Loader2,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  MessageSquare,
  TrendingUp,
  HelpCircle as QuestionIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrustScore } from "@/components/trust-score";
import { useCreateClaim, useRunFactCheck } from "@workspace/api-client-react";
import type {
  FactCheckEvidenceItem,
  FactCheckSource,
  FactCheckTimelineItem,
} from "@workspace/api-client-react";

type Verdict = "TRUE" | "MOSTLY TRUE" | "MIXED" | "UNVERIFIED" | "MISLEADING" | "FALSE";
type ClaimType = "Fact Claim" | "Opinion" | "Question" | "Prediction";

const VERDICT_CONFIG: Record<
  Verdict,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string; label: string }
> = {
  TRUE: { icon: CheckCircle, color: "text-success", bg: "bg-success/10", border: "border-success/30", label: "TRUE" },
  "MOSTLY TRUE": { icon: CheckCircle, color: "text-success/80", bg: "bg-success/5", border: "border-success/20", label: "MOSTLY TRUE" },
  MIXED: { icon: AlertCircle, color: "text-warning", bg: "bg-warning/10", border: "border-warning/30", label: "MIXED" },
  UNVERIFIED: { icon: HelpCircle, color: "text-muted-foreground", bg: "bg-secondary/20", border: "border-border", label: "UNVERIFIED" },
  MISLEADING: { icon: AlertCircle, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", label: "MISLEADING" },
  FALSE: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", label: "FALSE" },
};

const CLAIM_TYPE_CONFIG: Record<ClaimType, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  "Fact Claim": { icon: Shield, color: "text-primary", label: "FACT CLAIM" },
  Opinion: { icon: MessageSquare, color: "text-warning", label: "OPINION" },
  Question: { icon: QuestionIcon, color: "text-muted-foreground", label: "QUESTION" },
  Prediction: { icon: TrendingUp, color: "text-accent-foreground", label: "PREDICTION" },
};

const EXAMPLE_CLAIMS = [
  "Russia invaded Ukraine in February 2022.",
  "The moon landing in 1969 was staged by NASA.",
  "Climate change is primarily driven by human activities.",
  "I think social media is destroying society.",
];

interface FactCheckData {
  id: number;
  verdict: string;
  trustScore: number;
  trustRating: string;
  reasoning: string;
  evidenceSummary?: string | null;
  claimType?: string | null;
  summary?: string | null;
  supportingEvidence?: FactCheckEvidenceItem[] | null;
  contradictingEvidence?: FactCheckEvidenceItem[] | null;
  sources?: FactCheckSource[] | null;
  timeline?: FactCheckTimelineItem[] | null;
  provider: string;
  createdAt: string;
}

function CredibilityBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-success" : score >= 40 ? "bg-warning" : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-6 text-right">{score}</span>
    </div>
  );
}

function EvidenceCard({ item, polarity }: { item: FactCheckEvidenceItem; polarity: "for" | "against" }) {
  const borderColor = polarity === "for" ? "border-success/20 bg-success/5" : "border-destructive/20 bg-destructive/5";
  const dotColor = polarity === "for" ? "bg-success" : "bg-destructive";
  return (
    <div className={`rounded-sm border p-3 ${borderColor}`}>
      <div className="flex gap-2">
        <span className={`mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-relaxed mb-2">{item.text}</p>
          {item.source && (
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <a
                  href={item.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono truncate max-w-xs"
                >
                  {item.source.publisher}
                  <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                </a>
                {item.source.snippet && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 italic">
                    "{item.source.snippet}"
                  </p>
                )}
              </div>
              <Badge variant="outline" className="text-xs font-mono flex-shrink-0">
                {item.source.credibilityScore}% credible
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SourceCard({ source }: { source: FactCheckSource }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors"
        >
          <span className="truncate">{source.title}</span>
          <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60" />
        </a>
        <p className="text-xs text-muted-foreground font-mono mt-0.5">{source.publisher}</p>
        <CredibilityBar score={source.credibilityScore} />
      </div>
      <Badge
        variant="outline"
        className={`text-xs font-mono flex-shrink-0 ${source.supportsClaim ? "text-success border-success/20" : "text-destructive border-destructive/20"}`}
      >
        {source.supportsClaim ? "Supports" : "Contradicts"}
      </Badge>
    </div>
  );
}

export default function FactCheckPage() {
  const [claimText, setClaimText] = useState("");
  const [result, setResult] = useState<FactCheckData | null>(null);
  const [status, setStatus] = useState<"idle" | "creating" | "analyzing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showTimeline, setShowTimeline] = useState(true);
  const resultRef = useRef<HTMLDivElement>(null);

  const createClaim = useCreateClaim();
  const runFactCheck = useRunFactCheck();
  const isLoading = status === "creating" || status === "analyzing";

  const handleSubmit = async (text: string) => {
    const claim = text.trim();
    if (!claim || claim.length < 10) return;

    setResult(null);
    setErrorMsg("");
    setStatus("creating");

    try {
      const claimResult = await createClaim.mutateAsync({
        data: { eventId: 1, text: claim, status: "unverified", confidence: 0 },
      });

      setStatus("analyzing");

      const factCheckResult = await runFactCheck.mutateAsync({
        data: { claimId: claimResult.id },
      });

      setResult(factCheckResult as FactCheckData);
      setStatus("done");

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Analysis failed. Please try again.");
      setStatus("error");
    }
  };

  const verdict = result?.verdict as Verdict | undefined;
  const verdictCfg = verdict ? (VERDICT_CONFIG[verdict] ?? VERDICT_CONFIG.UNVERIFIED) : null;
  const claimType = result?.claimType as ClaimType | undefined;
  const claimTypeCfg = claimType ? (CLAIM_TYPE_CONFIG[claimType] ?? CLAIM_TYPE_CONFIG["Fact Claim"]) : null;

  const supporting = result?.supportingEvidence ?? [];
  const contradicting = result?.contradictingEvidence ?? [];
  const sources = result?.sources ?? [];
  const timeline = result?.timeline ?? [];
  const isFactClaim = claimType === "Fact Claim";

  return (
    <div className="min-h-full bg-grid-pattern">
      <div className="bg-gradient-to-b from-background/0 via-background/60 to-background">
        <div className="container mx-auto px-4 py-16 max-w-3xl">

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-sm bg-primary/10 border border-primary/20 mb-6">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-4">AI Fact Checker</h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Evidence-backed verification. Claims are classified, sources gathered,
              and trust scores calculated from real evidence — not model opinion.
            </p>
          </div>

          {/* Input Panel */}
          <Card className="p-6 border-border bg-card mb-6">
            <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
              CLAIM TO VERIFY
            </label>
            <Textarea
              placeholder="Enter any claim, statement, or assertion..."
              value={claimText}
              onChange={(e) => setClaimText(e.target.value)}
              className="min-h-[120px] resize-none text-base bg-secondary/30 border-secondary focus-visible:ring-primary mb-4"
              disabled={isLoading}
            />
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Button
                onClick={() => handleSubmit(claimText)}
                disabled={isLoading || claimText.trim().length < 10}
                className="font-mono w-full sm:w-auto"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {status === "creating" ? "Registering..." : "Analyzing evidence..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Run Fact Check
                  </>
                )}
              </Button>
              <span className="text-xs text-muted-foreground font-mono">
                {claimText.length} chars{claimText.length < 10 && claimText.length > 0 ? " (min 10)" : ""}
              </span>
            </div>

            {!result && status === "idle" && (
              <div className="mt-5 pt-5 border-t border-border">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Try an example:</p>
                <div className="flex flex-col gap-2">
                  {EXAMPLE_CLAIMS.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setClaimText(ex)}
                      className="text-left text-sm text-muted-foreground hover:text-primary transition-colors py-1.5 px-3 rounded-sm hover:bg-primary/5 border border-transparent hover:border-primary/10"
                    >
                      "{ex}"
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Error */}
          {status === "error" && (
            <Card className="p-5 border-destructive/30 bg-destructive/10 mb-6">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Analysis Failed</p>
                  <p className="text-sm text-muted-foreground">{errorMsg}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Loading */}
          {isLoading && (
            <Card className="p-8 border-primary/20 bg-primary/5 text-center mb-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-primary/20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                </div>
                <div>
                  <p className="font-mono text-sm text-primary uppercase tracking-wider">
                    {status === "creating" ? "Registering Claim" : "Gathering Evidence"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {status === "creating"
                      ? "Preparing claim for pipeline analysis..."
                      : "Classifying claim · Collecting sources · Calculating trust score..."}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Result */}
          {result && verdictCfg && (
            <div ref={resultRef} className="space-y-4">

              {/* Verdict card */}
              <Card className={`p-6 border ${verdictCfg.border} ${verdictCfg.bg}`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6">
                  <TrustScore score={result.trustScore} size="lg" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {(() => { const Icon = verdictCfg.icon; return <Icon className={`w-6 h-6 ${verdictCfg.color}`} />; })()}
                      <span className={`text-2xl font-bold font-mono ${verdictCfg.color}`}>{verdictCfg.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {claimTypeCfg && (
                        <Badge variant="outline" className={`font-mono text-xs ${claimTypeCfg.color} border-current/20`}>
                          {(() => { const Icon = claimTypeCfg.icon; return <Icon className="w-3 h-3 mr-1" />; })()}
                          {claimTypeCfg.label}
                        </Badge>
                      )}
                      <Badge variant="outline" className="font-mono text-xs">
                        {result.trustRating} Confidence
                      </Badge>
                      <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
                        via {result.provider}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Non-fact-claim notice */}
                {!isFactClaim && (
                  <div className="bg-secondary/40 rounded-sm p-4 mb-4 border border-border">
                    <p className="text-sm font-mono text-warning mb-1">NOT FACT-CHECKABLE</p>
                    <p className="text-sm text-muted-foreground">
                      {claimType === "Opinion" && "This is a subjective opinion. Opinions cannot be verified as true or false."}
                      {claimType === "Question" && "This is a question, not a claim. Rephrase it as a statement to fact-check it."}
                      {claimType === "Prediction" && "This is a prediction about the future. It cannot be verified against current evidence."}
                    </p>
                  </div>
                )}

                <Separator className="mb-5 opacity-30" />

                <div className="space-y-4">
                  {result.summary && (
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">SUMMARY</h3>
                      <p className="text-sm leading-relaxed">{result.summary}</p>
                    </div>
                  )}
                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">ANALYSIS REASONING</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{result.reasoning}</p>
                  </div>
                  {result.evidenceSummary && (
                    <p className="text-xs font-mono text-muted-foreground border-t border-border/40 pt-3">
                      {result.evidenceSummary}
                    </p>
                  )}
                </div>
              </Card>

              {/* Supporting Evidence */}
              {supporting.length > 0 && (
                <Card className="p-5 border-border bg-card">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-success mb-3 flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5" />
                    EVIDENCE SUPPORTING CLAIM ({supporting.length})
                  </h3>
                  <div className="space-y-2">
                    {supporting.map((item, i) => (
                      <EvidenceCard key={i} item={item} polarity="for" />
                    ))}
                  </div>
                </Card>
              )}

              {/* Contradicting Evidence */}
              {contradicting.length > 0 && (
                <Card className="p-5 border-border bg-card">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-destructive mb-3 flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5" />
                    EVIDENCE AGAINST CLAIM ({contradicting.length})
                  </h3>
                  <div className="space-y-2">
                    {contradicting.map((item, i) => (
                      <EvidenceCard key={i} item={item} polarity="against" />
                    ))}
                  </div>
                </Card>
              )}

              {/* Sources */}
              {sources.length > 0 && (
                <Card className="p-5 border-border bg-card">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <ExternalLink className="w-3.5 h-3.5" />
                    CITED SOURCES ({sources.length})
                  </h3>
                  <div>
                    {sources.map((source, i) => (
                      <SourceCard key={i} source={source} />
                    ))}
                  </div>
                </Card>
              )}

              {/* Timeline */}
              {timeline.length > 0 && (
                <Card className="p-5 border-border bg-card">
                  <button
                    onClick={() => setShowTimeline(!showTimeline)}
                    className="w-full flex items-center justify-between mb-0"
                  >
                    <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      EVENT TIMELINE ({timeline.length})
                    </h3>
                    {showTimeline ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {showTimeline && (
                    <div className="relative mt-4">
                      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                      <ul className="space-y-4">
                        {timeline.map((entry, i) => (
                          <li key={i} className="flex gap-3">
                            <div className="flex-shrink-0 w-3.5 h-3.5 mt-0.5 rounded-full border-2 border-primary bg-background" />
                            <div>
                              <span className="text-xs font-mono text-primary block mb-0.5">{entry.date}</span>
                              <p className="text-sm">{entry.event}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              )}

              {/* No evidence note */}
              {isFactClaim && sources.length === 0 && status === "done" && (
                <Card className="p-4 border-border bg-secondary/20 text-center">
                  <p className="text-sm text-muted-foreground font-mono">
                    No verified sources were available for this claim.
                    Configure GROQ_API_KEY for real source-backed verification.
                  </p>
                </Card>
              )}

              {/* Run again */}
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => { setResult(null); setStatus("idle"); setClaimText(""); }}
                  className="font-mono text-xs"
                >
                  Analyze Another Claim
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
