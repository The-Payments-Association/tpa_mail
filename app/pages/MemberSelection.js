"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  Star,
  CheckCircle2,
  FileText,
  Globe,
  Briefcase,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import LoadingOverlay from "./LoadingOverlay";
import { ThemeToggle } from "@/components/ThemeToggle";

const TPAMailLogo = () => (
  <div className="flex items-center gap-4 mb-6">
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#00DFB8] via-[#00B894] to-[#00A085] rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
      <div className="relative w-12 h-12 bg-gradient-to-br from-[#00DFB8] to-[#00B894] rounded-xl flex items-center justify-center shadow-lg">
        <Building2 className="w-6 h-6 text-white" />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-[#00DFB8] to-[#00E6C7] rounded-full border-2 border-white dark:border-slate-800 shadow-lg flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
      </div>
    </div>
    <div>
      <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
        TPA Mail
      </h1>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        The Payments Association
      </p>
    </div>
  </div>
);

const mockCompanies = [
  {
    id: 999,
    company: "API Running Please Wait",
    expertise: ["Payment Processing", "Digital Solutions"],
    interests: ["Technology Innovation", "Financial Services"],
    avatar: "API",
    bio: "This is a fallback entry displayed when the article analysis service is unavailable. Please check your connection and try again.",
    marketSegments: ["All Segments"],
    geographicFocus: ["Global"],
    solutionTypes: ["Fallback"],
    deliveryModels: ["N/A"],
    employeeCount: "N/A",
    recentInitiatives: ["Service restoration"],
    partnershipEcosystem: ["System maintenance"],
    regulatoryExpertise: ["Standard compliance"],
    industryRecognition: ["Fallback display"],
    relevanceScore: 0,
  },
];

export default function MemberSelection({
  articleData = {},
  onBack,
  onContinue,
  initialSelectedCompanyIds = [],
}) {
  const [selectedCompanies, setSelectedCompanies] = useState(
    initialSelectedCompanyIds
  );
  const [loading, setLoading] = useState(false);
  const [apiCompanies, setApiCompanies] = useState([]);
  const [quotaWarning, setQuotaWarning] = useState(null);

  const prevArticleDataRef = useRef();
  const prevInitialSelectedRef = useRef();
  const hasInitializedRef = useRef(false);

  const companiesToShow = useMemo(() => {
    return apiCompanies.length > 0 ? apiCompanies : mockCompanies;
  }, [apiCompanies]);

  const selectAll = useMemo(() => {
    return (
      selectedCompanies.length === companiesToShow.length &&
      companiesToShow.length > 0
    );
  }, [selectedCompanies.length, companiesToShow.length]);

  const stableArticleData = useMemo(() => {
    return {
      title: articleData?.title || "",
      synopsis: articleData?.synopsis || "",
      fullArticle: articleData?.fullArticle || "",
    };
  }, [articleData?.title, articleData?.synopsis, articleData?.fullArticle]);

  useEffect(() => {
    const fetchRelevantCompanies = async () => {
      if (!stableArticleData.title) {
        return;
      }

      if (
        prevArticleDataRef.current &&
        prevArticleDataRef.current.title === stableArticleData.title &&
        prevArticleDataRef.current.synopsis === stableArticleData.synopsis &&
        prevArticleDataRef.current.fullArticle === stableArticleData.fullArticle
      ) {
        return;
      }

      setLoading(true);
      prevArticleDataRef.current = stableArticleData;

      try {
        console.log("📤 Starting API call...");

        const response = await fetch("/api/analyze-article", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stableArticleData),
        });

        console.log("📥 API response received:", response.status);

        const data = await response.json();
        console.log("📄 API data:", data);

        if (data.success && Array.isArray(data.members)) {
          setApiCompanies(data.members);
          
          // Check quota status
          if (data.meta?.quotaStatus) {
            const { percentageUsed, tokensRemaining } = data.meta.quotaStatus;
            
            if (percentageUsed >= 90) {
              setQuotaWarning({
                level: 'critical',
                message: `Critical: ${percentageUsed}% of daily quota used`,
                tokensRemaining: tokensRemaining
              });
              toast.warning(`Quota warning: ${percentageUsed}% used`, {
                description: `Only ${tokensRemaining} tokens remaining today`,
                duration: 5000
              });
            } else if (percentageUsed >= 75) {
              setQuotaWarning({
                level: 'warning',
                message: `Warning: ${percentageUsed}% of daily quota used`,
                tokensRemaining: tokensRemaining
              });
            } else {
              setQuotaWarning(null);
            }
          }
          
          toast.success("Found relevant companies based on your article");
        } else if (data.quotaExceeded) {
          // Quota exceeded
          setQuotaWarning({
            level: 'exceeded',
            message: 'Daily quota exceeded',
            resetDate: data.quotaStatus?.resetDate
          });
          
          toast.error("Daily quota exceeded", {
            description: "The team has used all free tokens for today. Quota resets tomorrow.",
            duration: 10000
          });
          
          setApiCompanies([]);
        } else {
          console.warn("API returned unsuccessful response:", data);
          toast.error("Failed to analyse article and find relevant companies");
          setApiCompanies([]);
        }
      } catch (error) {
        console.error("API error:", error);
        toast.error(
          "Error connecting to analysis service, using default companies"
        );
        setApiCompanies([]);
      }
    };

    fetchRelevantCompanies();
  }, [
    stableArticleData.title,
    stableArticleData.synopsis,
    stableArticleData.fullArticle,
  ]);

  const handleLoadingComplete = () => {
    setLoading(false);
  };

  useEffect(() => {
    const currentIds = JSON.stringify(initialSelectedCompanyIds);
    const prevIds = JSON.stringify(prevInitialSelectedRef.current);

    if (!hasInitializedRef.current || currentIds !== prevIds) {
      setSelectedCompanies(initialSelectedCompanyIds);
      prevInitialSelectedRef.current = initialSelectedCompanyIds;
      hasInitializedRef.current = true;
    }
  }, [initialSelectedCompanyIds]);

  const handleCompanySelect = (companyId) => {
    setSelectedCompanies((prev) => {
      if (prev.includes(companyId)) {
        return prev.filter((id) => id !== companyId);
      } else {
        return [...prev, companyId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(companiesToShow.map((company) => company.id));
    }
  };

  const getRelevanceColor = (score) => {
    if (score >= 90)
      return "text-[#00DFB8] bg-[#00DFB8]/10 dark:bg-[#00DFB8]/20";
    if (score >= 80)
      return "text-[#00B894] bg-[#00B894]/10 dark:bg-[#00B894]/20";
    return "text-[#00A085] bg-[#00A085]/10 dark:bg-[#00A085]/20";
  };

  const handleContinue = () => {
    if (selectedCompanies.length === 0) {
      toast.error("Please select at least one company to contact");
      return;
    }

    toast.success(`${selectedCompanies.length} companies selected`, {
      description: "Proceeding to compose messages",
      duration: 3000,
    });

    const selectedCompanyData = companiesToShow.filter((company) =>
      selectedCompanies.includes(company.id)
    );

    onContinue?.(selectedCompanyData);
  };

  const handleBack = () => {
    onBack?.();
  };

  return (
    <>
      <LoadingOverlay
        isVisible={loading}
        title="Finding members you need to contact..."
        subtitle="Identifying the most relevant companies for commentary"
        forcedDuration={10000}
      />
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Main Content */}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-100/20 dark:from-slate-900 dark:via-teal-950/30 dark:to-emerald-950/20 p-6 transition-colors duration-300">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        <div className="relative max-w-6xl mx-auto">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 border border-white/20 dark:border-slate-700/20 rounded-3xl shadow-2xl shadow-teal-500/10 overflow-hidden transition-colors duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-white/80 via-white/60 to-white/80 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-800/80 backdrop-blur-sm border-b border-white/20 dark:border-slate-700/20 p-8 transition-colors duration-300">
              <TPAMailLogo />

              {stableArticleData.title && (
                <div className="mb-4 p-3 bg-white/30 dark:bg-slate-700/30 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 rounded-lg transition-colors duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-[#00DFB8]" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Article: "{stableArticleData.title}"
                    </span>
                  </div>
                  {stableArticleData.synopsis && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      {stableArticleData.synopsis.length > 120
                        ? `${stableArticleData.synopsis.substring(0, 120)}...`
                        : stableArticleData.synopsis}
                    </p>
                  )}
                </div>
              )}

              {/* Quota Warning Banner */}
              {quotaWarning && (
                <div className={`mb-4 p-4 rounded-lg border ${
                  quotaWarning.level === 'exceeded' 
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                    : quotaWarning.level === 'critical'
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                }`}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                      quotaWarning.level === 'exceeded'
                        ? 'text-red-600 dark:text-red-400'
                        : quotaWarning.level === 'critical'
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-yellow-600 dark:text-yellow-400'
                    }`} />
                    <div className="flex-1">
                      <h3 className={`text-sm font-semibold mb-1 ${
                        quotaWarning.level === 'exceeded'
                          ? 'text-red-800 dark:text-red-300'
                          : quotaWarning.level === 'critical'
                          ? 'text-orange-800 dark:text-orange-300'
                          : 'text-yellow-800 dark:text-yellow-300'
                      }`}>
                        {quotaWarning.message}
                      </h3>
                      <p className={`text-xs ${
                        quotaWarning.level === 'exceeded'
                          ? 'text-red-700 dark:text-red-400'
                          : quotaWarning.level === 'critical'
                          ? 'text-orange-700 dark:text-orange-400'
                          : 'text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {quotaWarning.level === 'exceeded' 
                          ? 'The team has used all free tokens for today. Service will resume tomorrow.'
                          : `${quotaWarning.tokensRemaining} tokens remaining. Consider limiting usage for the rest of the day.`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Recommended companies
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Based on your article content, we've identified these
                    companies who would be most relevant for commentary. You'll
                    need to identify specific contacts within these
                    organisations.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#00DFB8]">
                    {selectedCompanies.length}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    selected
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="flex items-center justify-between mb-6 p-4 bg-white/40 dark:bg-slate-700/40 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 rounded-xl transition-colors duration-300">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="select-all"
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                    className="border-[#00DFB8]/30 data-[state=checked]:bg-[#00DFB8] data-[state=checked]:border-[#00DFB8]"
                  />
                  <label
                    htmlFor="select-all"
                    className="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer"
                  >
                    Select all companies ({companiesToShow.length})
                  </label>
                </div>
                <Badge
                  variant="outline"
                  className="bg-white/50 dark:bg-slate-600/50 border-[#00DFB8]/20 dark:border-[#00DFB8]/30"
                >
                  <Building2 className="w-3 h-3 mr-1" />
                  {selectedCompanies.length} of {companiesToShow.length}
                </Badge>
              </div>

              {/* Companies grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {companiesToShow.map((company) => (
                  <div
                    key={company.id}
                    className={`relative p-6 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border rounded-xl cursor-pointer transition-all duration-300 group ${
                      selectedCompanies.includes(company.id)
                        ? "border-[#00DFB8]/40 bg-[#00DFB8]/5 dark:bg-[#00DFB8]/10 shadow-lg"
                        : "border-white/30 dark:border-slate-600/30 hover:border-[#00DFB8]/20 hover:bg-white/70 dark:hover:bg-slate-700/70"
                    }`}
                    onClick={() => handleCompanySelect(company.id)}
                  >
                    <div className="absolute top-4 right-4">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          selectedCompanies.includes(company.id)
                            ? "bg-[#00DFB8] border-[#00DFB8]"
                            : "border-gray-300 dark:border-gray-600 group-hover:border-[#00DFB8]/50"
                        }`}
                      >
                        {selectedCompanies.includes(company.id) && (
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#00DFB8] to-[#00B894] rounded-xl flex items-center justify-center text-white font-semibold text-sm">
                        {company.company.substring(0, 2).toUpperCase()}
                      </div>

                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
                          {company.company}
                        </h3>

                        {company.relevanceScore &&
                          company.relevanceScore > 0 && (
                            <div className="flex items-center gap-2 mb-3">
                              <Star className="w-3 h-3 text-[#00DFB8]" />
                              <span
                                className={`text-xs font-medium px-2 py-1 rounded-full ${getRelevanceColor(
                                  company.relevanceScore
                                )}`}
                              >
                                {company.relevanceScore}% match
                              </span>
                            </div>
                          )}

                        <div className="flex flex-wrap gap-1 mb-3">
                          {(company.expertise || [])
                            .slice(0, 3)
                            .map((skill, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs bg-white/50 dark:bg-slate-600/50 border-[#00DFB8]/20 text-gray-600 dark:text-gray-300"
                              >
                                {skill}
                              </Badge>
                            ))}
                          {(company.expertise || []).length > 3 && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-white/50 dark:bg-slate-600/50 border-gray-200 dark:border-gray-600"
                            >
                              +{(company.expertise || []).length - 3}
                            </Badge>
                          )}
                        </div>

                        {company.marketSegments &&
                          company.marketSegments.length > 0 && (
                            <div className="flex items-center gap-2 mb-2">
                              <Briefcase className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {company.marketSegments.slice(0, 3).join(", ")}
                              </span>
                            </div>
                          )}

                        {company.geographicFocus &&
                          company.geographicFocus.length > 0 && (
                            <div className="flex items-center gap-2 mb-3">
                              <Globe className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {company.geographicFocus.slice(0, 3).join(", ")}
                              </span>
                            </div>
                          )}

                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                          {company?.bio &&
                          typeof company.bio === "string" &&
                          company.bio.length > 100
                            ? `${company.bio.substring(0, 100)}...`
                            : company?.bio || "No description available"}
                        </p>

                        {company.reasoning && (
                          <div className="mt-2 p-2 bg-[#00DFB8]/5 dark:bg-[#00DFB8]/10 rounded-lg">
                            <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                              "{company.reasoning}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-white/20 dark:border-slate-700/20">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="px-6 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border-white/30 dark:border-slate-600/30 hover:bg-white/70 dark:hover:bg-slate-700/70"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to article
                </Button>

                <Button
                  size="lg"
                  onClick={handleContinue}
                  disabled={selectedCompanies.length === 0}
                  className="px-8 py-3 bg-gradient-to-r from-[#00DFB8] via-[#00B894] to-[#00A085] hover:from-[#00B894] hover:via-[#00A085] hover:to-[#008B73] text-white border-0 rounded-xl shadow-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 group"
                >
                  <span className="flex items-center gap-2">
                    Continue with {selectedCompanies.length}{" "}
                    {selectedCompanies.length === 1 ? "company" : "companies"}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}