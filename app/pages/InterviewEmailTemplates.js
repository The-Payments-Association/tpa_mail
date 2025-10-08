"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ArrowLeft,
  Mail,
  Building2,
  FileText,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const TPAMailLogo = () => (
  <div className="flex items-center gap-4 mb-6">
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#00DFB8] via-[#00B894] to-[#00A085] rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
      <div className="relative w-12 h-12 bg-gradient-to-br from-[#00DFB8] to-[#00B894] rounded-xl flex items-center justify-center shadow-lg">
        <MessageSquare className="w-6 h-6 text-white" />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-[#00DFB8] to-[#00E6C7] rounded-full border-2 border-white dark:border-slate-800 shadow-lg flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
      </div>
    </div>
    <div>
      <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
        TPA Mail - Interview Mode
      </h1>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        The Payments Association
      </p>
    </div>
  </div>
);

export default function InterviewEmailTemplates({
  articleData = {},
  selectedMembers = [],
  onBack,
  onContinue,
}) {
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [currentEmailIndex, setCurrentEmailIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const hasGeneratedRef = useRef(false);

  const currentTemplate = emailTemplates[currentEmailIndex];
  const totalEmails = emailTemplates.length;

  // Auto-generate on mount - only once
  useEffect(() => {
    if (!hasGeneratedRef.current && selectedMembers.length > 0 && articleData.title) {
      hasGeneratedRef.current = true;
      generateInterviewEmails();
    }
  }, []); // Empty dependency array - only run once

  const generateInterviewEmails = async () => {
    setIsGenerating(true);
    toast.info("Generating personalised interview requests...", {
      description: "AI is creating custom questions for each member",
      duration: 2000,
    });

    try {
      const response = await fetch("/api/generate-interview-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleData,
          selectedMembers,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setEmailTemplates(data.emails);
        toast.success("Interview requests generated!", {
          description: `Created ${data.emails.length} personalised questions`,
          duration: 3000,
        });
      } else {
        toast.error("Failed to generate interview emails");
      }
    } catch (error) {
      console.error("Email generation error:", error);
      toast.error("Error generating emails");
    } finally {
      setIsGenerating(false);
    }
  };

  const updateTemplate = (field, value) => {
    setEmailTemplates((prev) =>
      prev.map((template, index) =>
        index === currentEmailIndex
          ? {
              ...template,
              template: { ...template.template, [field]: value },
              isEdited: true,
            }
          : template
      )
    );
  };

  const updateQuestion = (value) => {
    setEmailTemplates((prev) =>
      prev.map((template, index) =>
        index === currentEmailIndex
          ? {
              ...template,
              generatedQuestion: value,
              template: {
                ...template.template,
                body: template.template.body.replace(
                  /\*\*(.+?)\*\*/g, // Find text between **
                  `**${value}**`
                ),
              },
              isEdited: true,
            }
          : template
      )
    );
  };

  const handleApproveEmail = () => {
    setEmailTemplates((prev) =>
      prev.map((template, index) =>
        index === currentEmailIndex
          ? { ...template, isApproved: true }
          : template
      )
    );

    if (currentEmailIndex < totalEmails - 1) {
      setCurrentEmailIndex(currentEmailIndex + 1);
      toast.success("Interview request approved!");
    } else {
      toast.success("All interview requests reviewed!");
    }
  };

  const handlePrevious = () => {
    if (currentEmailIndex > 0) setCurrentEmailIndex(currentEmailIndex - 1);
  };

  const handleNext = () => {
    if (currentEmailIndex < totalEmails - 1) setCurrentEmailIndex(currentEmailIndex + 1);
  };

  const handleContinue = () => {
    const unapproved = emailTemplates.filter((t) => !t.isApproved);
    if (unapproved.length > 0) {
      toast.error(`Please approve all emails (${unapproved.length} remaining)`);
      return;
    }
    onContinue?.(emailTemplates);
  };

  const approvedCount = emailTemplates.filter((t) => t.isApproved).length;

  if (isGenerating) {
    return (
      <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-2xl max-w-md mx-4">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-[#00DFB8] animate-spin" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Generating personalised questions...
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                AI is creating {selectedMembers.length} custom interview questions
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentTemplate) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-100/20 dark:from-slate-900 dark:via-teal-950/30 dark:to-emerald-950/20 p-6 transition-colors duration-300">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 border border-white/20 dark:border-slate-700/20 rounded-3xl shadow-2xl shadow-teal-500/10 overflow-hidden transition-colors duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-white/80 via-white/60 to-white/80 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-800/80 backdrop-blur-sm border-b border-white/20 dark:border-slate-700/20 p-8 transition-colors duration-300">
            <TPAMailLogo />

            {articleData.title && (
              <div className="mb-4 p-3 bg-white/30 dark:bg-slate-700/30 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-[#00DFB8]" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Article: "{articleData.title}"
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Review interview requests
                </h2>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Each email includes a personalised question based on the member's expertise
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#00DFB8]">
                  {approvedCount}/{totalEmails}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  approved
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Interview request {currentEmailIndex + 1} of {totalEmails}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {Math.round((approvedCount / totalEmails) * 100)}% complete
                </span>
              </div>
              <div className="w-full bg-white/40 dark:bg-slate-700/40 rounded-full h-2 backdrop-blur-sm">
                <div
                  className="bg-gradient-to-r from-[#00DFB8] to-[#00B894] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(approvedCount / totalEmails) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Company Info Sidebar */}
              <div className="lg:col-span-1">
                <Card className="bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border-white/30 dark:border-slate-600/30 sticky top-8">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#00DFB8] to-[#00B894] rounded-xl flex items-center justify-center text-white font-semibold">
                        {currentTemplate.member.company.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-lg dark:text-gray-200">
                          {currentTemplate.member.company}
                        </CardTitle>
                        <CardDescription className="text-sm dark:text-gray-400">
                          Interview request
                        </CardDescription>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Expertise areas
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {currentTemplate.member.expertise.map((skill, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs bg-white/50 dark:bg-slate-600/50 border-[#00DFB8]/20 text-gray-600 dark:text-gray-300"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/20 dark:border-slate-600/20">
                      {currentTemplate.isApproved ? (
                        <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800">
                          <Check className="w-3 h-3 mr-1" />
                          Approved
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800">
                          Pending review
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              </div>

              {/* Email Template Editor */}
              <div className="lg:col-span-2 space-y-6">
                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentEmailIndex === 0}
                    className="bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border-white/30 dark:border-slate-600/30 hover:bg-white/70 dark:hover:bg-slate-700/70"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>

                  <div className="flex gap-1">
                    {emailTemplates.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentEmailIndex(index)}
                        className={`w-3 h-3 rounded-full transition-all ${
                          index === currentEmailIndex
                            ? "bg-[#00DFB8]"
                            : emailTemplates[index].isApproved
                            ? "bg-green-400"
                            : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      />
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleNext}
                    disabled={currentEmailIndex === totalEmails - 1}
                    className="bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border-white/30 dark:border-slate-600/30 hover:bg-white/70 dark:hover:bg-slate-700/70"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>

                {/* AI-Generated Question */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#00DFB8]" />
                    AI-generated interview question
                  </label>
                  <div className="p-4 bg-[#00DFB8]/5 dark:bg-[#00DFB8]/10 border border-[#00DFB8]/20 rounded-xl">
                    <Textarea
                      value={currentTemplate.generatedQuestion}
                      onChange={(e) => updateQuestion(e.target.value)}
                      className="min-h-[100px] bg-white/50 dark:bg-slate-700/50"
                      placeholder="Edit the AI-generated question..."
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    💡 This question was generated based on {currentTemplate.member.company}'s expertise in{" "}
                    {currentTemplate.member.expertise.slice(0, 2).join(" and ")}
                  </p>
                </div>

                {/* Subject Line */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Subject line
                  </label>
                  <input
                    type="text"
                    value={currentTemplate.template.subject}
                    onChange={(e) => updateTemplate("subject", e.target.value)}
                    className="w-full px-4 py-3 text-base bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 rounded-xl"
                  />
                </div>

                {/* Email Body */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Email content
                  </label>
                  <Textarea
                    value={currentTemplate.template.body}
                    onChange={(e) => updateTemplate("body", e.target.value)}
                    className="min-h-[500px] whitespace-pre-wrap"
                  />
                </div>

                {/* Approve Button */}
                <div className="flex justify-end">
                  {currentTemplate.isApproved ? (
                    <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800 px-4 py-2">
                      <Check className="w-4 h-4 mr-2" />
                      Interview request approved
                    </Badge>
                  ) : (
                    <Button
                      onClick={handleApproveEmail}
                      className="px-6 py-3 bg-gradient-to-r from-[#00DFB8] to-[#00B894] hover:from-[#00B894] hover:to-[#00A085] text-white border-0 rounded-xl shadow-lg"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve & continue
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-8 mt-8 border-t border-white/20 dark:border-slate-700/20">
              <Button
                variant="outline"
                onClick={onBack}
                className="px-6 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border-white/30 dark:border-slate-600/30 hover:bg-white/70 dark:hover:bg-slate-700/70"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to companies
              </Button>

              <Button
                size="lg"
                onClick={handleContinue}
                disabled={approvedCount < totalEmails}
                className="px-8 py-3 bg-gradient-to-r from-[#00DFB8] via-[#00B894] to-[#00A085] hover:from-[#00B894] hover:via-[#00A085] hover:to-[#008B73] text-white border-0 rounded-xl shadow-lg disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  Continue to review
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}