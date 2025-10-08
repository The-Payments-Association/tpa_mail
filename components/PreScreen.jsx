"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Search, Sparkles, ArrowRight, MessageSquare } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const TPAMailLogo = () => (
  <div className="flex flex-col items-center gap-4 mb-8">
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative group"
    >
      <div className="absolute -inset-2 bg-gradient-to-r from-[#00DFB8] via-[#00B894] to-[#00A085] rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition duration-1000"></div>
      <div className="relative w-20 h-20 bg-gradient-to-br from-[#00DFB8] to-[#00B894] rounded-2xl flex items-center justify-center shadow-2xl">
        <Mail className="w-10 h-10 text-white" />
        <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-gradient-to-r from-[#00DFB8] to-[#00E6C7] rounded-full border-3 border-white dark:border-slate-800 shadow-lg flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      </div>
    </motion.div>
    <div className="text-center">
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent"
      >
        TPA Mail
      </motion.h1>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1 mt-2"
      >
        The Payments Association
      </motion.p>
    </div>
  </div>
);

export default function PreScreen({ onStartEmailFlow, onStartInterviewFlow, onSearchMembers }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-100/20 dark:from-slate-900 dark:via-teal-950/30 dark:to-emerald-950/20 p-6 transition-colors duration-300 flex items-center justify-center">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      {/* Theme Toggle - Fixed Position */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-2xl"
      >
        {/* Glass Card */}
        <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 border border-white/20 dark:border-slate-700/20 rounded-3xl shadow-2xl shadow-teal-500/10 overflow-hidden transition-colors duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-white/80 via-white/60 to-white/80 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-800/80 backdrop-blur-sm border-b border-white/20 dark:border-slate-700/20 p-12 transition-colors duration-300">
            <TPAMailLogo />

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-center"
            >
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
                What would you like to do today?
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Choose your workflow to get started
              </p>
            </motion.div>
          </div>

          {/* Content */}
          <div className="p-12">
            <div className="grid gap-6">
              {/* Email Flow Button */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <Button
                  onClick={onStartEmailFlow}
                  className="w-full h-20 text-lg bg-gradient-to-r from-[#00DFB8] via-[#00B894] to-[#00A085] hover:from-[#00B894] hover:via-[#00A085] hover:to-[#008B73] text-white border-0 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <div className="relative flex items-center justify-between w-full px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <Mail className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">Start email flow</div>
                        <div className="text-sm text-white/80 font-normal">
                          Create personalised commentary requests
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Button>
              </motion.div>

              {/* Interview Flow Button with Beta Badge */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="relative"
              >
                {/* Beta Badge */}
                <Badge className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg px-2 py-0.5 text-xs font-semibold">
                  BETA
                </Badge>
                
                <Button
                  onClick={onStartInterviewFlow}
                  variant="outline"
                  className="w-full h-20 text-lg bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border-white/30 dark:border-slate-600/30 hover:bg-white/70 dark:hover:bg-slate-700/70 hover:border-[#00E6C7]/30 text-gray-700 dark:text-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#00E6C7]/0 via-[#00E6C7]/5 to-[#00E6C7]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <div className="relative flex items-center justify-between w-full px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#00E6C7]/20 to-[#00DFB8]/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <MessageSquare className="w-6 h-6 text-[#00B894] dark:text-[#00DFB8]" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">Start interview flow</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                          Generate personalised questions for members
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-[#00B894] group-hover:translate-x-1 transition-all" />
                  </div>
                </Button>
              </motion.div>

              {/* Search Members Button */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                <Button
                  onClick={onSearchMembers}
                  variant="outline"
                  className="w-full h-20 text-lg bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border-white/30 dark:border-slate-600/30 hover:bg-white/70 dark:hover:bg-slate-700/70 hover:border-[#00DFB8]/30 text-gray-700 dark:text-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#00DFB8]/0 via-[#00DFB8]/5 to-[#00DFB8]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <div className="relative flex items-center justify-between w-full px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#00DFB8]/20 to-[#00B894]/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <Search className="w-6 h-6 text-[#00B894]" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">Search members</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                          Browse and filter member directory
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-[#00B894] group-hover:translate-x-1 transition-all" />
                  </div>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Floating decoration */}
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-[#00DFB8]/20 to-[#00B894]/20 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-[#00B894]/20 to-[#00A085]/20 rounded-full blur-2xl pointer-events-none"></div>
      </motion.div>
    </div>
  );
}