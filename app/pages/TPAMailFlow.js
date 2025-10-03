"use client";

import { useState } from "react";
import LandingPage from "./LandingPage";
import MemberSelection from "./MemberSelection";
import EmailTemplates from "./EmailTemplates";
import SearchMembers from "./SearchMembers";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function TPAMailFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showSearch, setShowSearch] = useState(false);
  const [articleData, setArticleData] = useState({
    title: "",
    synopsis: "",
    fullArticle: "",
  });
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState([]);

  const handleContinueFromLanding = (data) => {
    setArticleData(data);
    setCurrentStep(2);
  };

  const handleBackToLanding = () => {
    setCurrentStep(1);
  };

  const handleContinueFromMembers = (members) => {
    setSelectedMembers(members);
    setCurrentStep(3);
  };

  const handleBackToMembers = () => {
    setCurrentStep(2);
  };

  const handleContinueFromEmailTemplates = (templates) => {
    setEmailTemplates(templates);
    setCurrentStep(4);
  };

  const handleBackToEmailTemplates = () => {
    setCurrentStep(3);
  };

  // Show search modal
  if (showSearch) {
    return <SearchMembers onBack={() => setShowSearch(false)} />;
  }

  // Render current step
  switch (currentStep) {
    case 1:
      return (
        <div className="relative">
          {/* Search Button - Fixed Position */}
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              onClick={() => setShowSearch(true)}
              className="h-14 px-6 bg-gradient-to-r from-[#00DFB8] to-[#00B894] hover:from-[#00B894] hover:to-[#00A085] text-white border-0 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 group"
            >
              <Search className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              Search Members
            </Button>
          </div>

          <LandingPage
            onContinue={handleContinueFromLanding}
            initialData={articleData}
          />
        </div>
      );
    case 2:
      return (
        <div className="relative">
          {/* Search Button - Fixed Position */}
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              onClick={() => setShowSearch(true)}
              className="h-14 px-6 bg-gradient-to-r from-[#00DFB8] to-[#00B894] hover:from-[#00B894] hover:to-[#00A085] text-white border-0 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 group"
            >
              <Search className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              Search Members
            </Button>
          </div>

          <MemberSelection
            articleData={articleData}
            onBack={handleBackToLanding}
            onContinue={handleContinueFromMembers}
            initialSelectedMemberIds={
              selectedMembers.length > 0
                ? selectedMembers.map((member) => member.id)
                : []
            }
          />
        </div>
      );
    case 3:
      return (
        <EmailTemplates
          articleData={articleData}
          selectedMembers={selectedMembers}
          onBack={handleBackToMembers}
          onContinue={handleContinueFromEmailTemplates}
        />
      );
    case 4:
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-100/20 p-6 flex items-centre justify-centre">
          <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-3xl shadow-2xl shadow-teal-500/10 p-12 text-centre max-w-2xl">
            <div className="w-16 h-16 bg-gradient-to-br from-[#00DFB8] to-[#00B894] rounded-2xl flex items-centre justify-centre mx-auto mb-6">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-4">
              Ready to send!
            </h1>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Your {emailTemplates.length} personalised emails are ready to be
              sent to the selected TPA members.
            </p>
            <div className="flex gap-4 justify-centre">
              <button
                onClick={handleBackToEmailTemplates}
                className="px-6 py-3 bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl hover:bg-white/70 transition-all duration-300"
              >
                Back to edit
              </button>
              <button className="px-8 py-3 bg-gradient-to-r from-[#00DFB8] via-[#00B894] to-[#00A085] hover:from-[#00B894] hover:via-[#00A085] hover:to-[#008B73] text-white border-0 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300">
                Send all emails
              </button>
            </div>
          </div>
        </div>
      );
    default:
      return <LandingPage onContinue={handleContinueFromLanding} />;
  }
}