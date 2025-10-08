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
  Copy,
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

// Email validation function
const validateEmail = (template) => {
  const issues = [];
  const warnings = [];

  // Critical issues (must fix)
  if (template.body.includes("**XXX**") || template.body.includes("XXX")) {
    issues.push("Contains placeholder **XXX** that needs to be replaced");
  }

  if (!template.body.includes("Hi ")) {
    issues.push("Missing greeting");
  }

  // Warnings (should review)
  if (template.body.length < 200) {
    warnings.push("Email seems quite short (under 200 characters)");
  }

  if (template.body.length > 1200) {
    warnings.push("Email is quite long (over 1200 characters) - consider shortening");
  }

  const wordCount = template.body.split(/\s+/).filter((w) => w.length > 0).length;
  if (wordCount < 60) {
    warnings.push(`Email has only ${wordCount} words - consider adding more detail`);
  }

  if (!template.body.toLowerCase().includes("article")) {
    warnings.push("No mention of 'article' found");
  }

  if (!template.body.toLowerCase().includes("deadline")) {
    warnings.push("No deadline mentioned in email");
  }

  // Check if question is still generic/placeholder
  if (
    template.body.toLowerCase().includes("how will this impact") ||
    template.body.toLowerCase().includes("what are your thoughts")
  ) {
    warnings.push("Question may be too generic - consider making it more specific");
  }

  return { issues, warnings };
};

export default function InterviewEmailTemplates({
  articleData = {},
  selectedMembers = [],
  onBack,
  onContinue,
}) {
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [currentEmailIndex, setCurrentEmailIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const hasGeneratedRef = useRef(false);

  const currentTemplate = emailTemplates[currentEmailIndex];
  const totalEmails = emailTemplates.length;

  // Get validation results for current template
  const validationResults = currentTemplate
    ? validateEmail(currentTemplate.template)
    : { issues: [], warnings: [] };

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
        // Store original question for each template
        const templatesWithOriginal = data.emails.map(email => ({
          ...email,
          originalQuestion: email.generatedQuestion
        }));
        setEmailTemplates(templatesWithOriginal);
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
      prev.map((template, index) => {
        if (index !== currentEmailIndex) return template;

        // Find and replace ONLY the specific question text in the body
        // We use the original question to find the exact text to replace
        const oldQuestion = template.generatedQuestion;
        const newBody = template.template.body.replace(
          `**${oldQuestion}**`,
          `**${value}**`
        );

        return {
          ...template,
          generatedQuestion: value,
          template: {
            ...template.template,
            body: newBody,
          },
          isEdited: true,
        };
      })
    );
  };

  const copyToClipboard = async (text, fieldName) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`${fieldName} copied to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleApproveEmail = () => {
    // Check for critical validation issues
    if (validationResults.issues.length > 0) {
      toast.error("Cannot approve email with validation errors", {
        description: "Please fix all critical issues first",
        duration: 4000,
      });
      return;
    }

    setEmailTemplates((prev) =>
      prev.map((template, index) =>
        index === currentEmailIndex
          ? { ...template, isApproved: true }
          : template
      )
    );

    if (currentEmailIndex < totalEmails - 1) {
      setCurrentEmailIndex(currentEmailIndex + 1);
      toast.success("Interview request approved! Moving to next...");
    } else {
      toast.success("All interview requests reviewed!", {
        description: "Ready to proceed to final step",
        duration: 3000,
      });
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
                  Each email includes a personalised thought leadership question
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

                {/* Validation Warnings */}
                {(validationResults.issues.length > 0 ||
                  validationResults.warnings.length > 0) && (
                  <div
                    className={`rounded-lg p-4 border ${
                      validationResults.issues.length > 0
                        ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                        : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                    }`}
                  >
                    <h4
                      className={`text-sm font-semibold mb-2 flex items-center gap-2 ${
                        validationResults.issues.length > 0
                          ? "text-red-800 dark:text-red-400"
                          : "text-yellow-800 dark:text-yellow-400"
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4" />
                      {validationResults.issues.length > 0
                        ? "Critical issues"
                        : "Warnings"}
                    </h4>

                    {validationResults.issues.length > 0 && (
                      <ul className="text-sm text-red-700 dark:text-red-400 space-y-1 mb-2">
                        {validationResults.issues.map((issue, idx) => (
                          <li key={idx}>• {issue}</li>
                        ))}
                      </ul>
                    )}

                    {validationResults.warnings.length > 0 && (
                      <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                        {validationResults.warnings.map((warning, idx) => (
                          <li key={idx}>• {warning}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* AI-Generated Question */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#00DFB8]" />
                      AI-generated interview question
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(currentTemplate.generatedQuestion, "Question")
                      }
                      className="h-7 px-2"
                    >
                      {copiedField === "Question" ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <div className="p-4 bg-[#00DFB8]/5 dark:bg-[#00DFB8]/10 border border-[#00DFB8]/20 rounded-xl">
                    <Textarea
                      value={currentTemplate.generatedQuestion}
                      onChange={(e) => updateQuestion(e.target.value)}
                      className="min-h-[100px] bg-white/50 dark:bg-slate-700/50"
                      placeholder="Edit the AI-generated question..."
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    💡 This thought leadership question was generated based on {currentTemplate.member.company}'s expertise in{" "}
                    {currentTemplate.member.expertise.slice(0, 2).join(" and ")}
                  </p>
                </div>

                {/* Subject Line */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Subject line
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(currentTemplate.template.subject, "Subject")
                      }
                      className="h-7 px-2"
                    >
                      {copiedField === "Subject" ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <input
                    type="text"
                    value={currentTemplate.template.subject}
                    onChange={(e) => updateTemplate("subject", e.target.value)}
                    className="w-full px-4 py-3 text-base bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 rounded-xl shadow-sm hover:bg-white/70 dark:hover:bg-slate-700/70 focus:bg-white/80 dark:focus:bg-slate-700/80 focus:border-[#00DFB8]/30 transition-all duration-300"
                  />
                </div>

                {/* Email Body */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Email content
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(currentTemplate.template.body, "Email content")
                      }
                      className="h-7 px-2"
                    >
                      {copiedField === "Email content" ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <div className="relative">
                    <Textarea
                      value={currentTemplate.template.body}
                      onChange={(e) => updateTemplate("body", e.target.value)}
                      className="min-h-[500px] whitespace-pre-wrap"
                    />
                    <div className="absolute bottom-4 right-4">
                      <Badge
                        variant="outline"
                        className="bg-white/70 dark:bg-slate-600/70 border-gray-200 dark:border-slate-500"
                      >
                        {
                          (currentTemplate?.template?.body || "")
                            .split(" ")
                            .filter((w) => w.length > 0).length
                        }{" "}
                        words
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Fields to Fill Warning */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-400 mb-2">
                    📝 Remember to update:
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                    <li>• Specific contact name and role (replace **XXX**)</li>
                    <li>• Any deadline dates marked with **XXX**</li>
                    <li>• Ensure question is thought leadership focused (not sales)</li>
                  </ul>
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
                      disabled={validationResults.issues.length > 0}
                      className="px-6 py-3 bg-gradient-to-r from-[#00DFB8] to-[#00B894] hover:from-[#00B894] hover:to-[#00A085] text-white border-0 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="px-8 py-3 bg-gradient-to-r from-[#00DFB8] via-[#00B894] to-[#00A085] hover:from-[#00B894] hover:via-[#00A085] hover:to-[#008B73] text-white border-0 rounded-xl shadow-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
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