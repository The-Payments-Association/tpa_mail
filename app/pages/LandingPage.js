"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Mail, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

const TPAMailLogo = () => (
  <div className="flex items-center gap-4 mb-8">
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#00DFB8] via-[#00B894] to-[#00A085] rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
      <div className="relative w-14 h-14 bg-gradient-to-br from-[#00DFB8] to-[#00B894] rounded-xl flex items-center justify-center shadow-lg">
        <Mail className="w-7 h-7 text-white" />
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-[#00DFB8] to-[#00E6C7] rounded-full border-2 border-white shadow-lg flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
      </div>
    </div>
    <div>
      <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
        TPA Mail
      </h1>
      <p className="text-sm text-gray-500 flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        The Payments Association
      </p>
    </div>
  </div>
);

export default function LandingPage({ onContinue, initialData = {} }) {
  const [title, setTitle] = useState(initialData.title || "");
  const [synopsis, setSynopsis] = useState(initialData.synopsis || "");
  const [fullArticle, setFullArticle] = useState(initialData.fullArticle || "");
  const [isArticleDialogOpen, setIsArticleDialogOpen] = useState(false);

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

    const data = {
      title,
      synopsis,
      fullArticle
    };
    
    onContinue?.(data);
  };

  const getArticlePreview = () => {
    if (!fullArticle) return "Click to add your full article content...";
    const wordCount = fullArticle.trim().split(/\s+/).length;
    const preview = fullArticle.substring(0, 120);
    return `${preview}... (${wordCount} words)`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-100/20 p-6">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      
      <div className="relative max-w-4xl mx-auto">
        {/* Main Glass Card */}
        <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-3xl shadow-2xl shadow-teal-500/10 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-white/80 via-white/60 to-white/80 backdrop-blur-sm border-b border-white/20 p-8">
            <TPAMailLogo />
            <p className="text-lg text-gray-600 leading-relaxed">
              Create and manage your payment industry communications
            </p>
          </div>
          
          {/* Content */}
          <div className="p-8 space-y-8">
            {/* Title Field */}
            <div className="space-y-3 group">
              <Label htmlFor="title" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                Article title
                <div className="h-1 w-1 bg-[#00DFB8] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Label>
              <div className="relative">
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter your article title here..."
                  className="h-12 text-base bg-white/50 backdrop-blur-sm border-white/30 rounded-xl shadow-sm hover:bg-white/70 focus:bg-white/80 focus:border-[#00DFB8]/30 transition-all duration-300 placeholder:text-gray-400"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-[#00DFB8]/5 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>
              </div>
            </div>

            {/* Synopsis Field */}
            <div className="space-y-3 group">
              <Label htmlFor="synopsis" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                Synopsis
                <div className="h-1 w-1 bg-[#00B894] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Label>
              <div className="relative">
                <Textarea
                  id="synopsis"
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder="Enter a brief synopsis of your article..."
                  className="min-h-[120px] text-base bg-white/50 backdrop-blur-sm border-white/30 rounded-xl shadow-sm hover:bg-white/70 focus:bg-white/80 focus:border-[#00DFB8]/30 transition-all duration-300 placeholder:text-gray-400 resize-none"
                  rows={4}
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-[#00DFB8]/5 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>
              </div>
            </div>

            {/* Full Article Field */}
            <div className="space-y-3 group">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                Full article
                <div className="h-1 w-1 bg-[#00E6C7] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Label>
              
              <Dialog open={isArticleDialogOpen} onOpenChange={setIsArticleDialogOpen}>
                <DialogTrigger asChild>
                  <div 
                    className="relative min-h-[80px] p-4 bg-white/40 backdrop-blur-sm border border-white/30 rounded-xl cursor-pointer hover:bg-white/60 hover:border-[#00DFB8]/20 transition-all duration-300 group/article"
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gradient-to-br from-[#00DFB8]/20 to-[#00B894]/20 rounded-lg">
                        <FileText className="w-5 h-5 text-[#00B894]" />
                      </div>
                      <div className="flex-1">
                        <span className={`text-sm leading-relaxed ${fullArticle ? 'text-gray-700' : 'text-gray-500'}`}>
                          {getArticlePreview()}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#00DFB8] opacity-0 group-hover/article:opacity-100 transition-opacity" />
                    </div>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#00DFB8]/5 via-[#00E6C7]/5 to-[#00DFB8]/5 opacity-0 group-hover/article:opacity-100 transition-opacity"></div>
                  </div>
                </DialogTrigger>
                
             <DialogContent className="max-w-5xl max-h-[85vh] bg-white/95 backdrop-blur-xl border-white/20 flex flex-col">
  <DialogHeader>
    <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
      Full article content
    </DialogTitle>
  </DialogHeader>
  <div className="mt-6 flex-1 flex flex-col overflow-hidden">
    <Textarea
      value={fullArticle}
      onChange={(e) => setFullArticle(e.target.value)}
      placeholder="Paste or type your full article content here (up to 2000 words)..."
      className="flex-1 text-base bg-white/60 backdrop-blur-sm border-white/30 rounded-xl shadow-sm focus:bg-white/80 focus:border-[#00DFB8]/30 transition-all duration-300 placeholder:text-gray-400 resize-none overflow-y-auto"
    />
    <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/20 flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-gradient-to-r from-[#00DFB8] to-[#00E6C7] rounded-full"></div>
        <span className="text-sm text-gray-600 font-medium">
          {fullArticle ? `${fullArticle.trim().split(/\s+/).filter(word => word.length > 0).length} words` : 'No content yet'}
        </span>
      </div>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsArticleDialogOpen(false)}
          className="bg-white/50 backdrop-blur-sm border-white/30 hover:bg-white/70"
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
    disabled={!title || !synopsis}
    onClick={handleNext} // Add this onClick handler
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