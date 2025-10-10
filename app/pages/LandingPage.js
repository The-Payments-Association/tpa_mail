"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Mail,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Info,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ThemeToggle } from "@/components/ThemeToggle";

const TPAMailLogo = () => (
  <div className="flex items-center gap-4 mb-8">
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#00DFB8] via-[#00B894] to-[#00A085] rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
      <div className="relative w-14 h-14 bg-gradient-to-br from-[#00DFB8] to-[#00B894] rounded-xl flex items-center justify-center shadow-lg">
        <Mail className="w-7 h-7 text-white" />
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-[#00DFB8] to-[#00E6C7] rounded-full border-2 border-white dark:border-slate-800 shadow-lg flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
      </div>
    </div>
    <div>
      <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-gray-100 dark:to-gray-400">
        TPA Mail
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        The Payments Association
      </p>
    </div>
  </div>
);

const InfoPopover = ({ title, children, side = "right" }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 dark:bg-slate-700 hover:bg-[#00DFB8]/20 dark:hover:bg-[#00DFB8]/20 hover:border-[#00DFB8] border border-transparent transition-all duration-200 group"
        aria-label={`More information about ${title}`}
      >
        <Info className="w-3 h-3 text-gray-500 dark:text-gray-400 group-hover:text-[#00B894]" />
      </button>
    </PopoverTrigger>
    <PopoverContent
      side={side}
      className="w-80 p-4 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-white/20 dark:border-slate-700/20 shadow-xl"
    >
      <div className="space-y-2">
        <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#00B894]" />
          {title}
        </h4>
        <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed space-y-2">
          {children}
        </div>
      </div>
    </PopoverContent>
  </Popover>
);

export default function LandingPage({ onContinue, initialData = {} }) {
  const [title, setTitle] = useState(initialData.title || "");
  const [synopsis, setSynopsis] = useState(initialData.synopsis || "");
  const [fullArticle, setFullArticle] = useState(initialData.fullArticle || "");
  const [isArticleDialogOpen, setIsArticleDialogOpen] = useState(false);
  const [quotaStatus, setQuotaStatus] = useState(null);

  // Fetch quota status on mount
  useEffect(() => {
    const fetchQuotaStatus = async () => {
      try {
        const response = await fetch("/api/quota-status");
        const data = await response.json();

        if (data.success) {
          setQuotaStatus(data.quota);

          // Show warning if quota is high
          if (data.quota.percentageUsed >= 90) {
            toast.warning("Quota warning", {
              description: `${data.quota.percentageUsed}% of daily quota used`,
              duration: 5000,
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch quota status:", error);
      }
    };

    fetchQuotaStatus();
  }, []);

  const handleArticleSave = () => {
    setIsArticleDialogOpen(false);
    if (fullArticle) {
      toast.success("Article saved successfully", {
        description: "Your content has been secured",
        duration: 3000,
      });
    }
  };

  const handleNext = () => {
    if (!title || !synopsis) {
      toast.error("Please complete the required fields");
      return;
    }

    // Check quota before continuing
    if (quotaStatus && !quotaStatus.allowed) {
      toast.error("Daily quota exceeded", {
        description:
          "The team has used all free tokens for today. Please try again tomorrow.",
        duration: 8000,
      });
      return;
    }

    const data = {
      title,
      synopsis,
      fullArticle,
    };

    onContinue?.(data);
  };

  const getArticlePreview = () => {
    if (!fullArticle) return "Click to add your full article content...";
    const wordCount = fullArticle.trim().split(/\s+/).length;
    const preview = fullArticle.substring(0, 120);
    return `${preview}... (${wordCount} words)`;
  };

  const getQuotaColor = () => {
    if (!quotaStatus) return "from-[#00DFB8] to-[#00B894]";
    if (quotaStatus.percentageUsed >= 90) return "from-red-500 to-red-600";
    if (quotaStatus.percentageUsed >= 75)
      return "from-orange-500 to-orange-600";
    return "from-[#00DFB8] to-[#00B894]";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-100/20 dark:from-slate-900 dark:via-teal-950/30 dark:to-emerald-950/20 p-6 transition-colors duration-300">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      {/* Theme Toggle - Fixed Position */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="relative max-w-4xl mx-auto">
        {/* Quota Status Bar - Above Main Card */}
        {quotaStatus && (
          <div className="mb-4 p-4 backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 border border-white/20 dark:border-slate-700/20 rounded-2xl shadow-lg transition-colors duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Daily quota usage
                </span>
                <InfoPopover title="About quota" side="bottom">
                  <p>
                    This tracks your team's daily usage of the AI analysis
                    system.
                  </p>
                  <p className="mt-2">
                    <strong>Tokens:</strong> Measures text processing capacity
                    (roughly 750 words = 1,000 tokens)
                  </p>
                  <p className="mt-2">
                    <strong>Requests:</strong> Number of article analyses
                    performed today
                  </p>
                  <p className="mt-2 text-[#00B894] font-medium">
                    Quota resets daily at midnight UTC
                  </p>
                </InfoPopover>
                {quotaStatus.percentageUsed >= 90 && (
                  <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />
                )}
              </div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {quotaStatus.percentageUsed}% used
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden transition-colors">
              <div
                className={`bg-gradient-to-r ${getQuotaColor()} h-2 rounded-full transition-all duration-500 ease-out`}
                style={{ width: `${quotaStatus.percentageUsed}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {quotaStatus?.tokensRemaining != null
                  ? quotaStatus.tokensRemaining.toLocaleString() +
                    " tokens remaining"
                  : "N/A"}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {quotaStatus?.requestsRemaining ?? "N/A"} requests left
              </span>
            </div>

            {/* Warning Message */}
            {quotaStatus.percentageUsed >= 90 && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs text-red-700 dark:text-red-400">
                  <strong>Warning:</strong> Running low on quota. Service may be
                  limited soon.
                </p>
              </div>
            )}

            {!quotaStatus.allowed && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs text-red-700 dark:text-red-400">
                  <strong>Quota exceeded:</strong> Daily limit reached. Service
                  will resume tomorrow.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Main Glass Card */}
        <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 border border-white/20 dark:border-slate-700/20 rounded-3xl shadow-2xl shadow-teal-500/10 overflow-hidden transition-colors duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-white/80 via-white/60 to-white/80 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-800/80 backdrop-blur-sm border-b border-white/20 dark:border-slate-700/20 p-8 transition-colors duration-300">
            <TPAMailLogo />
            <div className="flex items-start gap-2">
              <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-300">
                Title keywords receive 3× weight, synopsis keywords 2×, and full
                article keywords 1×. Context keywords (title + synopsis) are
                always prioritised with artificial frequency boosts. Full article
                content is optional—add it for longer pieces to capture additional
                discriminating keywords (filtered to &lt;40% member prevalence), or
                omit for short articles where title + synopsis provide sufficient
                context.
              </p>
              <InfoPopover title="How keyword weighting works" side="left">
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-[#00B894]">Title (3× weight)</p>
                    <p className="mt-1">
                      Highest priority. Keywords in your title define what the
                      article is about.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-[#00B894]">
                      Synopsis (2× weight)
                    </p>
                    <p className="mt-1">
                      Medium priority. Provides context and supporting keywords.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-[#00B894]">
                      Article (1× weight)
                    </p>
                    <p className="mt-1">
                      Standard priority. Captures additional detail and rare
                      specialist terms.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-gray-200 dark:border-slate-700">
                    <p className="font-medium">Field weights adapt dynamically</p>
                    <p className="mt-1">
                      System analyses where keywords appear in member profiles and
                      adjusts field importance automatically (e.g., regulatory
                      articles boost regulatoryExpertise field).
                    </p>
                  </div>
                </div>
              </InfoPopover>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 space-y-8">
            {/* Title Field */}
            <div className="space-y-3 group">
              <Label
                htmlFor="title"
                className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2"
              >
                Article title
                <InfoPopover title="Article title" side="right">
                  <p>
                    <strong>Most important field</strong> - receives 3× keyword
                    weight.
                  </p>
                  <p className="mt-2">
                    Use clear, specific keywords that define your article's main
                    topic (e.g., "Merchant Regulation Roadmap Q4" or "Cross-Border
                    Payment Costs 2025").
                  </p>
                  <p className="mt-2">
                    The system extracts keywords like "merchant", "regulation",
                    "cross-border" and prioritises members with matching expertise.
                  </p>
                  <p className="mt-2 text-[#00B894] font-medium">
                    Required field
                  </p>
                </InfoPopover>
                <div className="h-1 w-1 bg-[#00DFB8] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Label>
              <div className="relative">
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter your article title here..."
                  className="h-12 text-base bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border-white/30 dark:border-slate-600/30 rounded-xl shadow-sm hover:bg-white/70 dark:hover:bg-slate-700/70 focus:bg-white/80 dark:focus:bg-slate-700/80 focus:border-[#00DFB8]/30 transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-[#00DFB8]/5 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>
              </div>
            </div>

            {/* Synopsis Field */}
            <div className="space-y-3 group">
              <Label
                htmlFor="synopsis"
                className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2"
              >
                Synopsis ~30 detailed words
                <InfoPopover title="Article synopsis" side="right">
                  <p>
                    <strong>Context provider</strong> - receives 2× keyword weight.
                  </p>
                  <p className="mt-2">
                    Write a detailed 30-word summary that explains the article's
                    focus using specific terminology (e.g., "Analysis of PSD3
                    regulatory requirements and compliance deadlines for payment
                    service providers").
                  </p>
                  <p className="mt-2">
                    <strong>Pro tip:</strong> Include domain-specific terms like
                    "compliance", "acquiring", "CBDC", "AML" - these are highly
                    discriminating and help match specialist members.
                  </p>
                  <p className="mt-2 text-[#00B894] font-medium">
                    Required field
                  </p>
                </InfoPopover>
                <div className="h-1 w-1 bg-[#00B894] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Label>
              <div className="relative">
                <Textarea
                  id="synopsis"
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder="Enter a brief synopsis of your article..."
                  className="h-12 text-base bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border-white/30 dark:border-slate-600/30 rounded-xl shadow-sm hover:bg-white/70 dark:hover:bg-slate-700/70 focus:bg-white/80 dark:focus:bg-slate-700/80 focus:border-[#00DFB8]/30 transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
                  rows={4}
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-[#00DFB8]/5 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>
              </div>
            </div>

            {/* Full Article Field */}
            <div className="space-y-3 group">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                Full article
                <InfoPopover title="Full article content" side="right">
                  <p>
                    <strong>Optional field</strong> - receives 1× keyword weight.
                  </p>
                  <p className="mt-2">
                    <strong>When to add:</strong> For comprehensive articles
                    (500+ words) where you want to capture specialist terminology
                    and niche expertise not in title/synopsis.
                  </p>
                  <p className="mt-2">
                    <strong>When to skip:</strong> For short articles, press
                    releases, or when title + synopsis already contain the key
                    terms.
                  </p>
                  <p className="mt-2">
                    Only discriminating keywords (appearing in &lt;40% of members)
                    are extracted from the full article to maintain quality.
                  </p>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">
                    Typical result: 10-15 keywords (title+synopsis only) vs 30-60
                    keywords (with full article).
                  </p>
                </InfoPopover>
                <div className="h-1 w-1 bg-[#00E6C7] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Label>

              <Dialog
                open={isArticleDialogOpen}
                onOpenChange={setIsArticleDialogOpen}
              >
                <DialogTrigger asChild>
                  <div
                    className="relative min-h-[80px] p-4 bg-white/40 dark:bg-slate-700/40 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 rounded-xl cursor-pointer hover:bg-white/60 dark:hover:bg-slate-700/60 hover:border-[#00DFB8]/20 transition-all duration-300 group/article"
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gradient-to-br from-[#00DFB8]/20 to-[#00B894]/20 rounded-lg">
                        <FileText className="w-5 h-5 text-[#00B894]" />
                      </div>
                      <div className="flex-1">
                        <span
                          className={`text-sm leading-relaxed ${
                            fullArticle
                              ? "text-gray-700 dark:text-gray-300"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {getArticlePreview()}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#00DFB8] opacity-0 group-hover/article:opacity-100 transition-opacity" />
                    </div>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#00DFB8]/5 via-[#00E6C7]/5 to-[#00DFB8]/5 opacity-0 group-hover/article:opacity-100 transition-opacity"></div>
                  </div>
                </DialogTrigger>

                <DialogContent className="max-w-5xl max-h-[85vh] bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-white/20 dark:border-slate-700/20 flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
                      Full article content
                    </DialogTitle>
                  </DialogHeader>
                  <div className="mt-6 flex-1 flex flex-col overflow-hidden">
                    <Textarea
                      value={fullArticle}
                      onChange={(e) => setFullArticle(e.target.value)}
                      placeholder="Paste or type your full article content here (up to 2000 words)..."
                      className="flex-1 text-base bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-white/30 dark:border-slate-600/30 rounded-xl shadow-sm focus:bg-white/80 dark:focus:bg-slate-700/80 focus:border-[#00DFB8]/30 transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none overflow-y-auto"
                    />
                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/20 dark:border-slate-700/20 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gradient-to-r from-[#00DFB8] to-[#00E6C7] rounded-full"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                          {fullArticle
                            ? `${
                                fullArticle
                                  .trim()
                                  .split(/\s+/)
                                  .filter((word) => word.length > 0).length
                              } words`
                            : "No content yet"}
                        </span>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsArticleDialogOpen(false)}
                          className="bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border-white/30 dark:border-slate-600/30 hover:bg-white/70 dark:hover:bg-slate-700/70"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleArticleSave}
                          className="bg-gradient-to-r from-[#00DFB8] to-[#00B894] hover:from-[#00B894] hover:to-[#00A085] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          Save article
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Next Button */}
            <div className="flex justify-end pt-8">
              <Button
                size="lg"
                disabled={
                  !title || !synopsis || (quotaStatus && !quotaStatus.allowed)
                }
                onClick={handleNext}
                className="px-8 py-3 bg-gradient-to-r from-[#00DFB8] via-[#00B894] to-[#00A085] hover:from-[#00B894] hover:via-[#00A085] hover:to-[#008B73] text-white border-0 rounded-xl shadow-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 group"
              >
                <span className="flex items-center gap-2">
                  Continue
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}