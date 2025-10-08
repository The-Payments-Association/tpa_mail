"use client";

import { useState } from "react";
import LandingPage from "./LandingPage";
import MemberSelection from "./MemberSelection";
import EmailTemplates from "./EmailTemplates";
import SearchMembers from "./SearchMembers";
import PreScreen from "@/components/PreScreen";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

// Define all available flows/routes
const FLOWS = {
  PRE_SCREEN: "preScreen",
  LANDING: "landing",
  MEMBER_SELECTION: "memberSelection",
  EMAIL_TEMPLATES: "emailTemplates",
  FINAL_REVIEW: "finalReview",
  SEARCH_MEMBERS: "searchMembers",
};

// Define flow configurations for easy scaling
const FLOW_CONFIG = {
  emailFlow: {
    steps: [
      FLOWS.LANDING,
      FLOWS.MEMBER_SELECTION,
      FLOWS.EMAIL_TEMPLATES,
      FLOWS.FINAL_REVIEW,
    ],
    initialData: {
      articleData: { title: "", synopsis: "", fullArticle: "" },
      selectedMembers: [],
      emailTemplates: [],
    },
  },
  // Easy to add new flows here
  // reportFlow: { steps: [...], initialData: {...} },
  // analysisFlow: { steps: [...], initialData: {...} },
};

export default function TPAMailFlow() {
  const [currentFlow, setCurrentFlow] = useState(FLOWS.PRE_SCREEN);
  const [flowData, setFlowData] = useState(FLOW_CONFIG.emailFlow.initialData);

  // Navigation helpers
  const navigateTo = (flow) => setCurrentFlow(flow);
  
  const updateFlowData = (updates) => {
    setFlowData((prev) => ({ ...prev, ...updates }));
  };

  const resetFlow = () => {
    setCurrentFlow(FLOWS.PRE_SCREEN);
    setFlowData(FLOW_CONFIG.emailFlow.initialData);
  };

  // Flow handlers
  const handleStartEmailFlow = () => {
    navigateTo(FLOWS.LANDING);
  };

  const handleSearchMembers = () => {
    navigateTo(FLOWS.SEARCH_MEMBERS);
  };

  const handleContinueFromLanding = (data) => {
    updateFlowData({ articleData: data });
    navigateTo(FLOWS.MEMBER_SELECTION);
  };

  const handleBackToLanding = () => {
    navigateTo(FLOWS.LANDING);
  };

  const handleContinueFromMembers = (members) => {
    updateFlowData({ selectedMembers: members });
    navigateTo(FLOWS.EMAIL_TEMPLATES);
  };

  const handleBackToMembers = () => {
    navigateTo(FLOWS.MEMBER_SELECTION);
  };

  const handleContinueFromEmailTemplates = (templates) => {
    updateFlowData({ emailTemplates: templates });
    navigateTo(FLOWS.FINAL_REVIEW);
  };

  const handleBackToEmailTemplates = () => {
    navigateTo(FLOWS.EMAIL_TEMPLATES);
  };

  const handleBackFromSearch = () => {
    navigateTo(FLOWS.PRE_SCREEN);
  };

  // Floating Search Button Component
  const FloatingSearchButton = () => (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={handleSearchMembers}
        className="h-14 px-6 bg-gradient-to-r from-[#00DFB8] to-[#00B894] hover:from-[#00B894] hover:to-[#00A085] text-white border-0 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 group"
      >
        <Search className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
        Search members
      </Button>
    </div>
  );

  // Render appropriate component based on current flow
  const renderFlow = () => {
    switch (currentFlow) {
      case FLOWS.PRE_SCREEN:
        return (
          <PreScreen
            onStartEmailFlow={handleStartEmailFlow}
            onSearchMembers={handleSearchMembers}
          />
        );

      case FLOWS.SEARCH_MEMBERS:
        return <SearchMembers onBack={handleBackFromSearch} />;

      case FLOWS.LANDING:
        return (
          <div className="relative">
            <FloatingSearchButton />
            <LandingPage
              onContinue={handleContinueFromLanding}
              initialData={flowData.articleData}
            />
          </div>
        );

      case FLOWS.MEMBER_SELECTION:
        return (
          <div className="relative">
            <FloatingSearchButton />
            <MemberSelection
              articleData={flowData.articleData}
              onBack={handleBackToLanding}
              onContinue={handleContinueFromMembers}
              initialSelectedMemberIds={flowData.selectedMembers.map((m) => m.id)}
            />
          </div>
        );

      case FLOWS.EMAIL_TEMPLATES:
        return (
          <EmailTemplates
            articleData={flowData.articleData}
            selectedMembers={flowData.selectedMembers}
            onBack={handleBackToMembers}
            onContinue={handleContinueFromEmailTemplates}
          />
        );

      case FLOWS.FINAL_REVIEW:
        return (
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-100/20 dark:from-slate-900 dark:via-teal-950/30 dark:to-emerald-950/20 p-6 flex items-center justify-center transition-colors duration-300">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
            
            <div className="relative backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 border border-white/20 dark:border-slate-700/20 rounded-3xl shadow-2xl shadow-teal-500/10 p-12 text-center max-w-2xl transition-colors duration-300">
              <div className="w-20 h-20 bg-gradient-to-br from-[#00DFB8] to-[#00B894] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg
                  className="w-10 h-10 text-white"
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
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent mb-4">
                Ready to send!
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                Your {flowData.emailTemplates.length} personalised emails are
                ready to be sent to the selected TPA members.
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  variant="outline"
                  onClick={handleBackToEmailTemplates}
                  className="px-6 py-3 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border-white/30 dark:border-slate-600/30 hover:bg-white/70 dark:hover:bg-slate-700/70 rounded-xl"
                >
                  Back to edit
                </Button>
                <Button
                  onClick={resetFlow}
                  className="px-8 py-3 bg-gradient-to-r from-[#00DFB8] via-[#00B894] to-[#00A085] hover:from-[#00B894] hover:via-[#00A085] hover:to-[#008B73] text-white border-0 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300"
                >
                  Start new flow
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return <PreScreen onStartEmailFlow={handleStartEmailFlow} onSearchMembers={handleSearchMembers} />;
    }
  };

  return renderFlow();
}