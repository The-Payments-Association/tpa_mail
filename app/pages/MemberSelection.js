"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Users, Mail, Building2, Star, CheckCircle2, FileText, Globe, Briefcase } from "lucide-react";
import { toast } from "sonner";

const TPAMailLogo = () => (
  <div className="flex items-center gap-4 mb-6">
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#00DFB8] via-[#00B894] to-[#00A085] rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
      <div className="relative w-12 h-12 bg-gradient-to-br from-[#00DFB8] to-[#00B894] rounded-xl flex items-center justify-center shadow-lg">
        <Building2 className="w-6 h-6 text-white" />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-[#00DFB8] to-[#00E6C7] rounded-full border-2 border-white shadow-lg flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
      </div>
    </div>
    <div>
      <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
        TPA Mail
      </h1>
      <p className="text-xs text-gray-500">The Payments Association</p>
    </div>
  </div>
);

export default function MemberSelection({
  articleData = {},
  onBack,
  onContinue,
  initialSelectedCompanyIds = []
}) {
  const [selectedCompanies, setSelectedCompanies] = useState(initialSelectedCompanyIds);
  const [selectAll, setSelectAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiCompanies, setApiCompanies] = useState([]);

  // Mock data for demonstration
  const mockCompanies = [
    {
      id: 1,
      company: "ACI Worldwide",
      expertise: ["Payment Orchestration", "Real-time Payments", "Fraud Management"],
      interests: ["AI-driven routing", "Cross-border optimization", "Authorization rate improvement"],
      bio: "Original innovator in global payments technology, delivers transformative software solutions that power intelligent payments orchestration in real time",
      marketSegments: ["Enterprise", "Banks", "Merchants", "PSPs"],
      geographicFocus: ["Global", "UK", "EU", "APAC"],
      relevanceScore: 95
    },
    // Add other companies...
  ];

  const companiesToShow = apiCompanies.length > 0 ? apiCompanies : mockCompanies;

  useEffect(() => {
    const fetchRelevantCompanies = async () => {
      if (!articleData.title) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const response = await fetch('/api/analyze-article', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(articleData)
        });
        
        const data = await response.json();
        if (data.success) {
          setApiCompanies(data.members);
          toast.success('Found relevant companies based on your article');
        } else {
          toast.error('Failed to analyze article and find relevant companies');
          setApiCompanies(mockCompanies);
        }
      } catch (error) {
        console.error('API error:', error);
        toast.error('Error connecting to analysis service, using default companies');
        setApiCompanies(mockCompanies);
      } finally {
        setLoading(false);
      }
    };

    fetchRelevantCompanies();
  }, [articleData]);

  useEffect(() => {
    setSelectAll(selectedCompanies.length === companiesToShow.length && companiesToShow.length > 0);
  }, [selectedCompanies, companiesToShow]);

  useEffect(() => {
    setSelectedCompanies(initialSelectedCompanyIds);
  }, [initialSelectedCompanyIds]);

  const handleCompanySelect = (companyId) => {
    setSelectedCompanies(prev => {
      if (prev.includes(companyId)) {
        return prev.filter(id => id !== companyId);
      } else {
        return [...prev, companyId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(companiesToShow.map(company => company.id));
    }
    setSelectAll(!selectAll);
  };

  const getRelevanceColor = (score) => {
    if (score >= 90) return "text-[#00DFB8] bg-[#00DFB8]/10";
    if (score >= 80) return "text-[#00B894] bg-[#00B894]/10";
    return "text-[#00A085] bg-[#00A085]/10";
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
    
    const selectedCompanyData = companiesToShow.filter(company => 
      selectedCompanies.includes(company.id)
    );
    
    onContinue?.(selectedCompanyData);
  };

  const handleBack = () => {
    onBack?.();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-100/20 p-6 flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-3xl shadow-2xl p-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#00DFB8] border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Analyzing your article...</h2>
          <p className="text-gray-600">Finding the most relevant companies for commentary</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-100/20 p-6">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      
      <div className="relative max-w-6xl mx-auto">
        <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-3xl shadow-2xl shadow-teal-500/10 overflow-hidden">
          <div className="bg-gradient-to-r from-white/80 via-white/60 to-white/80 backdrop-blur-sm border-b border-white/20 p-8">
            <TPAMailLogo />
            
            {articleData.title && (
              <div className="mb-4 p-3 bg-white/30 backdrop-blur-sm border border-white/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-[#00DFB8]" />
                  <span className="text-sm font-medium text-gray-700">Article: "{articleData.title}"</span>
                </div>
                {articleData.synopsis && (
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {articleData.synopsis.length > 120 
                      ? `${articleData.synopsis.substring(0, 120)}...` 
                      : articleData.synopsis
                    }
                  </p>
                )}
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Recommended companies</h2>
                <p className="text-gray-600 leading-relaxed">
                  Based on your article content, we've identified these companies who would be most relevant for commentary. 
                  You'll need to identify specific contacts within these organisations.
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#00DFB8]">{selectedCompanies.length}</div>
                <div className="text-sm text-gray-500">selected</div>
              </div>
            </div>
          </div>
          
          <div className="p-8">
            <div className="flex items-center justify-between mb-6 p-4 bg-white/40 backdrop-blur-sm border border-white/30 rounded-xl">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                  className="border-[#00DFB8]/30 data-[state=checked]:bg-[#00DFB8] data-[state=checked]:border-[#00DFB8]"
                />
                <label htmlFor="select-all" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Select all companies ({companiesToShow.length})
                </label>
              </div>
              <Badge variant="outline" className="bg-white/50 border-[#00DFB8]/20">
                <Building2 className="w-3 h-3 mr-1" />
                {selectedCompanies.length} of {companiesToShow.length}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {companiesToShow.map((company) => (
                <div
                  key={company.id}
                  className={`relative p-6 bg-white/50 backdrop-blur-sm border rounded-xl cursor-pointer transition-all duration-300 group ${
                    selectedCompanies.includes(company.id)
                      ? 'border-[#00DFB8]/40 bg-[#00DFB8]/5 shadow-lg'
                      : 'border-white/30 hover:border-[#00DFB8]/20 hover:bg-white/70'
                  }`}
                  onClick={() => handleCompanySelect(company.id)}
                >
                  <div className="absolute top-4 right-4">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedCompanies.includes(company.id)
                        ? 'bg-[#00DFB8] border-[#00DFB8]'
                        : 'border-gray-300 group-hover:border-[#00DFB8]/50'
                    }`}>
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
                      <h3 className="font-semibold text-gray-800 mb-1">{company.company}</h3>
                      
                      {company.relevanceScore && (
                        <div className="flex items-center gap-2 mb-3">
                          <Star className="w-3 h-3 text-[#00DFB8]" />
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${getRelevanceColor(company.relevanceScore)}`}>
                            {company.relevanceScore}% match
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1 mb-3">
                        {company.expertise.slice(0, 3).map((skill, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs bg-white/50 border-[#00DFB8]/20 text-gray-600"
                          >
                            {skill}
                          </Badge>
                        ))}
                        {company.expertise.length > 3 && (
                          <Badge variant="outline" className="text-xs bg-white/50 border-gray-200">
                            +{company.expertise.length - 3}
                          </Badge>
                        )}
                      </div>

                      {company.marketSegments && (
                        <div className="flex items-center gap-2 mb-2">
                          <Briefcase className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {company.marketSegments.slice(0, 3).join(', ')}
                          </span>
                        </div>
                      )}

                      {company.geographicFocus && (
                        <div className="flex items-center gap-2 mb-3">
                          <Globe className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {company.geographicFocus.slice(0, 3).join(', ')}
                          </span>
                        </div>
                      )}

                      <p className="text-xs text-gray-600 leading-relaxed">
                        {company.bio.length > 100 
                          ? `${company.bio.substring(0, 100)}...` 
                          : company.bio
                        }
                      </p>

                      {company.reasoning && (
                        <div className="mt-2 p-2 bg-[#00DFB8]/5 rounded-lg">
                          <p className="text-xs text-gray-600 italic">"{company.reasoning}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-white/20">
              <Button 
                variant="outline"
                onClick={handleBack}
                className="px-6 bg-white/50 backdrop-blur-sm border-white/30 hover:bg-white/70"
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
                  Continue with {selectedCompanies.length} {selectedCompanies.length === 1 ? 'company' : 'companies'}
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