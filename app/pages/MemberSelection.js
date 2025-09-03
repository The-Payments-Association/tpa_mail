"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Users, Mail, Building2, Star, CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";

const TPAMailLogo = () => (
  <div className="flex items-center gap-4 mb-6">
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#00DFB8] via-[#00B894] to-[#00A085] rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
      <div className="relative w-12 h-12 bg-gradient-to-br from-[#00DFB8] to-[#00B894] rounded-xl flex items-center justify-center shadow-lg">
        <Users className="w-6 h-6 text-white" />
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

// Mock data for demonstration - this will be replaced by GPT API results
const mockMembers = [
  {
    id: 1,
    name: "Sarah Mitchell",
    role: "Head of Digital Payments",
    company: "Barclays",
    email: "s.mitchell@barclays.co.uk",
    relevanceScore: 95,
    expertise: ["Open Banking", "Digital Transformation", "Regulatory Compliance"],
    avatar: "SM"
  },
  {
    id: 2,
    name: "James Chen",
    role: "Chief Technology Officer",
    company: "Revolut",
    email: "j.chen@revolut.com",
    relevanceScore: 92,
    expertise: ["Fintech Innovation", "API Development", "Mobile Payments"],
    avatar: "JC"
  },
  {
    id: 3,
    name: "Emma Thompson",
    role: "VP of Product Strategy",
    company: "Mastercard",
    email: "e.thompson@mastercard.com",
    relevanceScore: 90,
    expertise: ["Payment Networks", "Strategic Planning", "Market Analysis"],
    avatar: "ET"
  },
  {
    id: 4,
    name: "Michael Rodriguez",
    role: "Director of Innovation",
    company: "HSBC",
    email: "m.rodriguez@hsbc.co.uk",
    relevanceScore: 88,
    expertise: ["Blockchain", "Innovation Strategy", "Digital Banking"],
    avatar: "MR"
  },
  {
    id: 5,
    name: "Dr. Priya Patel",
    role: "Senior Research Analyst",
    company: "Bank of England",
    email: "p.patel@bankofengland.co.uk",
    relevanceScore: 87,
    expertise: ["Monetary Policy", "CBDC Research", "Financial Stability"],
    avatar: "PP"
  },
  {
    id: 6,
    name: "Alexander Wright",
    role: "Head of Partnerships",
    company: "Stripe",
    email: "a.wright@stripe.com",
    relevanceScore: 85,
    expertise: ["Payment Processing", "B2B Partnerships", "Global Expansion"],
    avatar: "AW"
  },
  {
    id: 7,
    name: "Rachel Foster",
    role: "Compliance Director",
    company: "Lloyds Banking Group",
    email: "r.foster@lloydsbanking.com",
    relevanceScore: 83,
    expertise: ["Regulatory Affairs", "Risk Management", "Anti-Money Laundering"],
    avatar: "RF"
  },
  {
    id: 8,
    name: "David Kumar",
    role: "Product Manager",
    company: "PayPal",
    email: "d.kumar@paypal.com",
    relevanceScore: 82,
    expertise: ["Digital Wallets", "User Experience", "Cross-border Payments"],
    avatar: "DK"
  },
  {
    id: 9,
    name: "Lisa Anderson",
    role: "Head of Digital Strategy",
    company: "Santander",
    email: "l.anderson@santander.co.uk",
    relevanceScore: 80,
    expertise: ["Digital Banking", "Customer Experience", "Transformation"],
    avatar: "LA"
  },
  {
    id: 10,
    name: "Thomas Wilson",
    role: "Senior Vice President",
    company: "Visa",
    email: "t.wilson@visa.com",
    relevanceScore: 78,
    expertise: ["Payment Innovation", "Merchant Services", "Network Security"],
    avatar: "TW"
  }
];

export default function MemberSelection({ 
  articleData = {}, 
  onBack, 
  onContinue, 
  initialSelectedMemberIds = [] 
}) {
  const [selectedMembers, setSelectedMembers] = useState(initialSelectedMemberIds);
  const [selectAll, setSelectAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiMembers, setApiMembers] = useState([]);

  // Determine which members to show (API results or fallback to mock)
  const membersToShow = apiMembers.length > 0 ? apiMembers : mockMembers;

  // Fetch relevant members from API
  useEffect(() => {
    const fetchRelevantMembers = async () => {
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
          setApiMembers(data.members);
          toast.success('Found relevant industry contacts based on your article');
        } else {
          toast.error('Failed to analyze article and find relevant members');
          setApiMembers(mockMembers);
        }
      } catch (error) {
        console.error('API error:', error);
        toast.error('Error connecting to analysis service, using default contacts');
        setApiMembers(mockMembers);
      } finally {
        setLoading(false);
      }
    };

    fetchRelevantMembers();
  }, [articleData]);

  // Update selectAll state when selectedMembers changes
  useEffect(() => {
    setSelectAll(selectedMembers.length === membersToShow.length && membersToShow.length > 0);
  }, [selectedMembers, membersToShow]);

  // Initialize selected members if coming back from next step
  useEffect(() => {
    setSelectedMembers(initialSelectedMemberIds);
  }, [initialSelectedMemberIds]);

  const handleMemberSelect = (memberId) => {
    setSelectedMembers(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(membersToShow.map(member => member.id));
    }
    setSelectAll(!selectAll);
  };

  const getRelevanceColor = (score) => {
    if (score >= 90) return "text-[#00DFB8] bg-[#00DFB8]/10";
    if (score >= 80) return "text-[#00B894] bg-[#00B894]/10";
    return "text-[#00A085] bg-[#00A085]/10";
  };

  const handleContinue = () => {
    if (selectedMembers.length === 0) {
      toast.error("Please select at least one member to contact");
      return;
    }
    
    toast.success(`${selectedMembers.length} members selected`, {
      description: "Proceeding to compose messages",
      duration: 3000,
    });
    
    // Pass selected member data to parent
    const selectedMemberData = membersToShow.filter(member => 
      selectedMembers.includes(member.id)
    );
    
    console.log("Selected members:", selectedMemberData);
    onContinue?.(selectedMemberData);
  };

  const handleBack = () => {
    onBack?.();
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-100/20 p-6 flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-3xl shadow-2xl p-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#00DFB8] border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Analyzing your article...</h2>
          <p className="text-gray-600">Finding the most relevant industry contacts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-100/20 p-6">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      
      <div className="relative max-w-6xl mx-auto">
        {/* Main Glass Card */}
        <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-3xl shadow-2xl shadow-teal-500/10 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-white/80 via-white/60 to-white/80 backdrop-blur-sm border-b border-white/20 p-8">
            <TPAMailLogo />
            
            {/* Article Context */}
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
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Recommended contacts</h2>
                <p className="text-gray-600 leading-relaxed">
                  {apiMembers.length > 0 
                    ? "Based on your article content, we've identified these key industry contacts who would be most relevant for your communication."
                    : "Here are some industry contacts from our database. We'll improve recommendations with AI analysis soon."
                  }
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#00DFB8]">{selectedMembers.length}</div>
                <div className="text-sm text-gray-500">selected</div>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-8">
            {/* Select All Controls */}
            <div className="flex items-center justify-between mb-6 p-4 bg-white/40 backdrop-blur-sm border border-white/30 rounded-xl">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                  className="border-[#00DFB8]/30 data-[state=checked]:bg-[#00DFB8] data-[state=checked]:border-[#00DFB8]"
                />
                <label htmlFor="select-all" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Select all members ({membersToShow.length})
                </label>
              </div>
              <Badge variant="outline" className="bg-white/50 border-[#00DFB8]/20">
                <Users className="w-3 h-3 mr-1" />
                {selectedMembers.length} of {membersToShow.length}
              </Badge>
            </div>

            {/* Members Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {membersToShow.map((member) => (
                <div
                  key={member.id}
                  className={`relative p-6 bg-white/50 backdrop-blur-sm border rounded-xl cursor-pointer transition-all duration-300 group ${
                    selectedMembers.includes(member.id)
                      ? 'border-[#00DFB8]/40 bg-[#00DFB8]/5 shadow-lg'
                      : 'border-white/30 hover:border-[#00DFB8]/20 hover:bg-white/70'
                  }`}
                  onClick={() => handleMemberSelect(member.id)}
                >
                  {/* Selection Indicator */}
                  <div className="absolute top-4 right-4">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedMembers.includes(member.id)
                        ? 'bg-[#00DFB8] border-[#00DFB8]'
                        : 'border-gray-300 group-hover:border-[#00DFB8]/50'
                    }`}>
                      {selectedMembers.includes(member.id) && (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gradient-to-br from-[#00DFB8] to-[#00B894] rounded-xl flex items-center justify-center text-white font-semibold text-sm">
                      {member.avatar}
                    </div>

                    {/* Member Info */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 mb-1">{member.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{member.role}</p>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{member.company}</span>
                      </div>

                      {/* Relevance Score */}
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="w-3 h-3 text-[#00DFB8]" />
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getRelevanceColor(member.relevanceScore)}`}>
                          {member.relevanceScore}% match
                        </span>
                      </div>

                      {/* Expertise Tags */}
                      <div className="flex flex-wrap gap-1">
                        {member.expertise.slice(0, 2).map((skill, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs bg-white/50 border-[#00DFB8]/20 text-gray-600"
                          >
                            {skill}
                          </Badge>
                        ))}
                        {member.expertise.length > 2 && (
                          <Badge variant="outline" className="text-xs bg-white/50 border-gray-200">
                            +{member.expertise.length - 2}
                          </Badge>
                        )}
                      </div>

                      {/* Show reasoning if available from API */}
                      {member.reasoning && (
                        <div className="mt-2 p-2 bg-[#00DFB8]/5 rounded-lg">
                          <p className="text-xs text-gray-600 italic">"{member.reasoning}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
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
                disabled={selectedMembers.length === 0}
                className="px-8 py-3 bg-gradient-to-r from-[#00DFB8] via-[#00B894] to-[#00A085] hover:from-[#00B894] hover:via-[#00A085] hover:to-[#008B73] text-white border-0 rounded-xl shadow-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 group"
              >
                <span className="flex items-center gap-2">
                  Continue with {selectedMembers.length} {selectedMembers.length === 1 ? 'member' : 'members'}
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