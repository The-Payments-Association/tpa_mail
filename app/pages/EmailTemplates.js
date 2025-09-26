"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ArrowLeft,
  Mail,
  Building2,
  FileText,
  Edit3,
  Eye,
  Send,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  User,
  AtSign,
} from "lucide-react";
import { toast } from "sonner";

const TPAMailLogo = () => (
  <div className="flex items-center gap-4 mb-6">
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#00DFB8] via-[#00B894] to-[#00A085] rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
      <div className="relative w-12 h-12 bg-gradient-to-br from-[#00DFB8] to-[#00B894] rounded-xl flex items-center justify-center shadow-lg">
        <Mail className="w-6 h-6 text-white" />
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

// Updated function to generate company-focused email template
const generateCompanyEmailTemplate = (company, articleData) => {
  return {
    subject: `Commentary opportunity - ${articleData.title}`,
    body: `Hi [CONTACT NAME],

I hope you're well

I'm a data journalist at The Payments Association - I'm writing to introduce myself and offer you the opportunity to provide commentary for my article on ${articleData.title}.

The article [ARTICLE SUMMARY TO BE ADDED]

Given ${company.company}'s expertise in ${company.expertise.slice(0, 2).join(' and ')}, your perspective would be particularly valuable for our readers.

For context: Article commentary is ~70 word statement which is included in the 'Industry Voices' section of our articles - along with the person's name, job title, and company - which are shared with our entire membership and through our social media channels.

The deadline for commentary is **XXX**

Let me know if you would like any more information

Many thanks,

[Your Name]
The Payments Association`
  };
};

export default function EmailTemplates({
  articleData = {},
  selectedCompanies = [],
  onBack,
  onContinue,
}) {
  const [emailTemplates, setEmailTemplates] = useState(() =>
    selectedCompanies.map((company) => ({
      companyId: company.id,
      company,
      contactName: "",
      contactRole: "",
      contactEmail: "",
      template: generateCompanyEmailTemplate(company, articleData),
      isEdited: false,
      isApproved: false,
    }))
  );

  const [currentEmailIndex, setCurrentEmailIndex] = useState(0);
  const [copiedField, setCopiedField] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const currentTemplate = emailTemplates[currentEmailIndex];
  const totalEmails = emailTemplates.length;

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

  const updateContactInfo = (field, value) => {
    setEmailTemplates((prev) =>
      prev.map((template, index) =>
        index === currentEmailIndex
          ? {
              ...template,
              [field]: value,
              isEdited: true,
            }
          : template
      )
    );
  };

  const generateAIEmails = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleData,
          selectedMembers: selectedCompanies // Pass companies as members
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setEmailTemplates(prev =>
          prev.map(template => {
            const aiTemplate = data.emails.find(email => email.memberId === template.companyId);
            if (aiTemplate) {
              return {
                ...template,
                template: aiTemplate.template,
                isEdited: true
              };
            }
            return template;
          })
        );
        toast.success("AI-generated emails created!", {
          description: `Generated ${data.emails.length} personalised templates`,
          duration: 3000,
        });
      } else {
        toast.error("Failed to generate AI emails");
      }
    } catch (error) {
      console.error('Email generation error:', error);
      toast.error("Error generating emails");
    } finally {
      setIsGenerating(false);
    }
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
    setEmailTemplates((prev) =>
      prev.map((template, index) =>
        index === currentEmailIndex
          ? { ...template, isApproved: true }
          : template
      )
    );

    if (currentEmailIndex < totalEmails - 1) {
      setCurrentEmailIndex(currentEmailIndex + 1);
      toast.success("Email approved! Moving to next...");
    } else {
      toast.success("All emails reviewed!", {
        description: "Ready to proceed to final step",
        duration: 3000,
      });
    }
  };

  const handlePrevious = () => {
    if (currentEmailIndex > 0) {
      setCurrentEmailIndex(currentEmailIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentEmailIndex < totalEmails - 1) {
      setCurrentEmailIndex(currentEmailIndex + 1);
    }
  };

  const handleContinue = () => {
    const unapprovedEmails = emailTemplates.filter(
      (template) => !template.isApproved
    );

    if (unapprovedEmails.length > 0) {
      toast.error(
        `Please review and approve all emails (${unapprovedEmails.length} remaining)`
      );
      return;
    }

    toast.success("All emails approved!", {
      description: `Ready to send ${emailTemplates.length} personalised messages`,
      duration: 3000,
    });

    onContinue?.(emailTemplates);
  };

  const handleBack = () => {
    onBack?.();
  };

  const approvedCount = emailTemplates.filter(
    (template) => template.isApproved
  ).length;

  if (!currentTemplate) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-100/20 p-6">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto">
        <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-3xl shadow-2xl shadow-teal-500/10 overflow-hidden">
          <div className="bg-gradient-to-r from-white/80 via-white/60 to-white/80 backdrop-blur-sm border-b border-white/20 p-8">
            <TPAMailLogo />

            {articleData.title && (
              <div className="mb-4 p-3 bg-white/30 backdrop-blur-sm border border-white/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-[#00DFB8]" />
                  <span className="text-sm font-medium text-gray-700">
                    Article: "{articleData.title}"
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  Review email templates
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  Review and customise each company-focused email template. Add contact details after identifying the right person at each organisation.
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#00DFB8]">
                  {approvedCount}/{totalEmails}
                </div>
                <div className="text-sm text-gray-500">approved</div>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Email {currentEmailIndex + 1} of {totalEmails}
                </span>
                <div className="flex gap-2">
                  <Button
                    onClick={generateAIEmails}
                    disabled={isGenerating}
                    className="h-7 px-3 bg-gradient-to-r from-[#00DFB8] to-[#00B894] hover:from-[#00B894] hover:to-[#00A085] text-white border-0"
                  >
                    {isGenerating ? "Generating..." : "🤖 AI Generate All"}
                  </Button>
                  <span className="text-sm text-gray-500">
                    {Math.round((approvedCount / totalEmails) * 100)}% complete
                  </span>
                </div>
              </div>
              <div className="w-full bg-white/40 rounded-full h-2 backdrop-blur-sm">
                <div
                  className="bg-gradient-to-r from-[#00DFB8] to-[#00B894] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(approvedCount / totalEmails) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Company Info Sidebar */}
              <div className="lg:col-span-1">
                <Card className="bg-white/50 backdrop-blur-sm border-white/30 sticky top-8">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#00DFB8] to-[#00B894] rounded-xl flex items-center justify-center text-white font-semibold">
                        {currentTemplate.company.company.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {currentTemplate.company.company}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {currentTemplate.company.employeeCount} employees
                        </CardDescription>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <h4 className="text-sm font-semibold text-gray-700">
                        Expertise Areas
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {currentTemplate.company.expertise.map((skill, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs bg-white/50 border-[#00DFB8]/20 text-gray-600"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <h4 className="text-sm font-semibold text-gray-700">Contact Details</h4>
                      <div className="space-y-2">
                        <div>
                          <Label htmlFor="contact-name" className="text-xs">Contact Name</Label>
                          <Input
                            id="contact-name"
                            placeholder="e.g. John Smith"
                            value={currentTemplate.contactName}
                            onChange={(e) => updateContactInfo('contactName', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="contact-role" className="text-xs">Role/Title</Label>
                          <Input
                            id="contact-role"
                            placeholder="e.g. Head of Payments"
                            value={currentTemplate.contactRole}
                            onChange={(e) => updateContactInfo('contactRole', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="contact-email" className="text-xs">Email Address</Label>
                          <Input
                            id="contact-email"
                            placeholder="e.g. john.smith@company.com"
                            value={currentTemplate.contactEmail}
                            onChange={(e) => updateContactInfo('contactEmail', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="pt-4 border-t border-white/20">
                      {currentTemplate.isApproved ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          <Check className="w-3 h-3 mr-1" />
                          Approved
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-yellow-50 text-yellow-800 border-yellow-200"
                        >
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
                    className="bg-white/50 backdrop-blur-sm border-white/30 hover:bg-white/70"
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
                            : "bg-gray-300"
                        }`}
                      />
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleNext}
                    disabled={currentEmailIndex === totalEmails - 1}
                    className="bg-white/50 backdrop-blur-sm border-white/30 hover:bg-white/70"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>

                {/* Subject Line */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700">
                      Subject line
                    </label>
                    <div className="flex gap-2">
                      {currentTemplate.isEdited && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-[#00DFB8]/10 border-[#00DFB8]/20 text-[#00DFB8]"
                        >
                          <Edit3 className="w-3 h-3 mr-1" />
                          Edited
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(
                            currentTemplate.template.subject,
                            "Subject"
                          )
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
                  </div>
                  <input
                    type="text"
                    value={currentTemplate.template.subject}
                    onChange={(e) => updateTemplate("subject", e.target.value)}
                    className="w-full px-4 py-3 text-base bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl shadow-sm hover:bg-white/70 focus:bg-white/80 focus:border-[#00DFB8]/30 transition-all duration-300 placeholder:text-gray-400"
                    placeholder="Enter email subject..."
                  />
                </div>

                {/* Email Body */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700">
                      Email content
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          currentTemplate.template.body,
                          "Email content"
                        )
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
                      className="min-h-[400px] text-base bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl shadow-sm hover:bg-white/70 focus:bg-white/80 focus:border-[#00DFB8]/30 transition-all duration-300 placeholder:text-gray-400 resize-none"
                      placeholder="Enter email content..."
                      rows={16}
                    />
                    <div className="absolute bottom-4 right-4">
                      <Badge
                        variant="outline"
                        className="bg-white/70 border-gray-200"
                      >
                        {currentTemplate.template.body.split(" ").length} words
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Fields to Fill Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-yellow-800 mb-2">
                    📝 Remember to update:
                  </h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• [CONTACT NAME] - Add specific contact name</li>
                    <li>• [ARTICLE SUMMARY TO BE ADDED] - Add concise article summary</li>
                    <li>• **XXX** - Add specific deadline date</li>
                    <li>• [Your Name] - Add your name</li>
                  </ul>
                </div>

                {/* Approve Button */}
                <div className="flex justify-end">
                  {currentTemplate.isApproved ? (
                    <Badge className="bg-green-100 text-green-800 border-green-200 px-4 py-2">
                      <Check className="w-4 h-4 mr-2" />
                      Email approved
                    </Badge>
                  ) : (
                    <Button
                      onClick={handleApproveEmail}
                      className="px-6 py-3 bg-gradient-to-r from-[#00DFB8] to-[#00B894] hover:from-[#00B894] hover:to-[#00A085] text-white border-0 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve & Continue
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-8 mt-8 border-t border-white/20">
              <Button
                variant="outline"
                onClick={handleBack}
                className="px-6 bg-white/50 backdrop-blur-sm border-white/30 hover:bg-white/70"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to companies
              </Button>

              <Button
                size="lg"
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-gradient-to-r from-[#00DFB8] via-[#00B894] to-[#00A085] hover:from-[#00B894] hover:via-[#00A085] hover:to-[#008B73] text-white border-0 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 group"
              >
                <span className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Restart
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