import { useState, useRef } from "react";
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  HelpCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrustScore } from "@/components/trust-score";
import {
  useCreateClaim,
  useRunFactCheck,
} from "@workspace/api-client-react";

type Verdict = "True" | "False" | "Partially True" | "Unverified";

const VERDICT_CONFIG: Record<
  Verdict,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string; label: string }
> = {
  True: {
    icon: CheckCircle,
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/30",
    label: "VERIFIED TRUE",
  },
  False: {
    icon: XCircle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    label: "FALSE",
  },
  "Partially True": {
    icon: AlertCircle,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
    label: "PARTIALLY TRUE",
  },
  Unverified: {
    icon: HelpCircle,
    color: "text-muted-foreground",
    bg: "bg-secondary/20",
    border: "border-border",
    label: "UNVERIFIED",
  },
};

const EXAMPLE_CLAIMS = [
  "The moon landing in 1969 was staged by NASA.",
  "Climate change is primarily driven by human activities.",
  "The Great Wall of China is visible from space with the naked eye.",
];

interface FactCheckData {
  id: number;
  verdict: string;
  trustScore: number;
  trustRating: string;
  reasoning: string;
  evidenceSummary: string;
  provider: string;
  createdAt: string;
}

export default function FactCheck() {
  const [claimText, setClaimText] = useState("");
  const [result, setResult] = useState<FactCheckData | null>(null);
  const [status, setStatus] = useState<"idle" | "creating" | "analyzing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  const createClaim = useCreateClaim();
  const runFactCheck = useRunFactCheck();

  const isLoading = status === "creating" || status === "analyzing";

  const handleSubmit = async (text: string) => {
    const claim = text.trim();
    if (!claim || claim.length < 10) { return; }

    setResult(null);
    setErrorMsg("");
    setStatus("creating");

    try {
      const claimResult = await createClaim.mutateAsync({
        data: {
          eventId: 1,
          text: claim,
          status: "unverified",
          confidence: 0,
        },
      });

      setStatus("analyzing");

      const factCheckResult = await runFactCheck.mutateAsync({
        data: { claimId: claimResult.id },
      });

      setResult(factCheckResult as FactCheckData);
      setStatus("done");

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Analysis failed. Please try again.");
      setStatus("error");
    }
  };

  const verdict = result?.verdict as Verdict | undefined;
  const verdictCfg = verdict ? VERDICT_CONFIG[verdict] ?? VERDICT_CONFIG.Unverified : null;

  return (
    <div className="min-h-full bg-grid-pattern">
      <div className="bg-gradient-to-b from-background/0 via-background/60 to-background">
        <div className="container mx-auto px-4 py-16 max-w-3xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-sm bg-primary/10 border border-primary/20 mb-6">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              AI Fact Checker
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Enter any claim and our intelligence engine will analyze it for accuracy,
              cross-reference evidence, and return a verified verdict.
            </p>
          </div>

          {/* Input Panel */}
          <Card className="p-6 border-border bg-card mb-6">
            <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
              CLAIM TO VERIFY
            </label>
            <Textarea
              placeholder="Enter the claim you want to verify..."
              value={claimText}
              onChange={(e) => setClaimText(e.target.value)}
              className="min-h-[120px] resize-none font-sans text-base bg-secondary/30 border-secondary focus-visible:ring-primary mb-4"
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
                    {status === "creating" ? "Registering Claim..." : "Analyzing..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Run Fact Check
                  </>
                )}
              </Button>
              <span className="text-xs text-muted-foreground font-mono">
                {claimText.length} chars {claimText.length < 10 && claimText.length > 0 && "(min 10)"}
              </span>
            </div>

            {/* Example claims */}
            {!result && status === "idle" && (
              <div className="mt-5 pt-5 border-t border-border">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                  Try an example:
                </p>
                <div className="flex flex-col gap-2">
                  {EXAMPLE_CLAIMS.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setClaimText(ex)}
                      className="text-left text-sm text-muted-foreground hover:text-primary transition-colors py-1.5 px-3 rounded-sm hover:bg-primary/5 border border-transparent hover:border-primary/10 font-sans"
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

          {/* Loading indicator */}
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
                  <p className="font-mono text-sm text-primary">
                    {status === "creating" ? "REGISTERING CLAIM" : "RUNNING ANALYSIS"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {status === "creating"
                      ? "Preparing claim for analysis..."
                      : "Cross-referencing sources and evaluating evidence..."}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Result */}
          {result && verdictCfg && (
            <div ref={resultRef}>
              <Card
                className={`p-6 border ${verdictCfg.border} ${verdictCfg.bg} mb-4`}
              >
                {/* Verdict header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6">
                  <TrustScore score={result.trustScore} size="lg" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {(() => {
                        const Icon = verdictCfg.icon;
                        return <Icon className={`w-6 h-6 ${verdictCfg.color}`} />;
                      })()}
                      <span className={`text-2xl font-bold font-mono ${verdictCfg.color}`}>
                        {verdictCfg.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="font-mono text-xs border-current/20"
                      >
                        {result.trustRating} Confidence
                      </Badge>
                      <Badge
                        variant="outline"
                        className="font-mono text-xs text-muted-foreground"
                      >
                        via {result.provider}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator className="mb-5 opacity-30" />

                {/* Reasoning */}
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
                      ANALYSIS REASONING
                    </h3>
                    <p className="text-sm leading-relaxed">{result.reasoning}</p>
                  </div>

                  {result.evidenceSummary && (
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
                        EVIDENCE SUMMARY
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {result.evidenceSummary}
                      </p>
                    </div>
                  )}

                  <div className="text-xs font-mono text-muted-foreground flex items-center gap-2 pt-2">
                    <span>Analysis completed</span>
                    <span>·</span>
                    <span>
                      {new Date(result.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Run again */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setResult(null);
                    setStatus("idle");
                    setClaimText("");
                  }}
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
