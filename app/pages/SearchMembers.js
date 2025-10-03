"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  X,
  Building2,
  Globe,
  Briefcase,
  ArrowLeft,
} from "lucide-react";
import { membersDatabase } from "@/lib/membersDatabase";
import CompanyProfileModal from "./CompanyProfileModal";
import { ThemeToggle } from "@/components/ThemeToggle";

const TPAMailLogo = () => (
  <div className="flex items-center gap-4 mb-6">
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#00DFB8] via-[#00B894] to-[#00A085] rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
      <div className="relative w-12 h-12 bg-gradient-to-br from-[#00DFB8] to-[#00B894] rounded-xl flex items-center justify-center shadow-lg">
        <Search className="w-6 h-6 text-white" />
      </div>
    </div>
    <div>
      <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
        Member Directory
      </h1>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        The Payments Association
      </p>
    </div>
  </div>
);

export default function SearchMembers({ onBack }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Search logic
  const searchResults = useMemo(() => {
  if (!searchQuery.trim()) return membersDatabase;

  // Split by spaces or newlines and filter out empty terms
  const queries = searchQuery
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return membersDatabase.filter((member) => {
    // Check if all search terms match at least one field
    return queries.every((query) => {
      return (
        member.company.toLowerCase().includes(query) ||
        member.expertise.some((exp) => exp.toLowerCase().includes(query)) ||
        member.interests.some((interest) =>
          interest.toLowerCase().includes(query)
        ) ||
        member.marketSegments?.some((segment) =>
          segment.toLowerCase().includes(query)
        ) ||
        member.geographicFocus?.some((geo) =>
          geo.toLowerCase().includes(query)
        ) ||
        member.solutionTypes?.some((solution) =>
          solution.toLowerCase().includes(query)
        ) ||
        member.bio.toLowerCase().includes(query)
      );
    });
  });
}, [searchQuery]);


  const handleCompanyClick = (company) => {
    setSelectedCompany(company);
    setIsModalOpen(true);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-100/20 dark:from-slate-900 dark:via-teal-950/30 dark:to-emerald-950/20 p-6 transition-colours duration-300">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        {/* Theme Toggle */}
        <div className="fixed top-6 right-6 z-50">
          <ThemeToggle />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 border border-white/20 dark:border-slate-700/20 rounded-3xl shadow-2xl shadow-teal-500/10 overflow-hidden transition-colours duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-white/80 via-white/60 to-white/80 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-800/80 backdrop-blur-sm border-b border-white/20 dark:border-slate-700/20 p-8 transition-colours duration-300">
              <TPAMailLogo />

              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Search Member Directory
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Search by company name, expertise, interests, or any
                    keyword to find relevant members
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#00DFB8]">
                    {searchResults.length}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {searchQuery ? "results" : "total members"}
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by company name, expertise, payment orchestration, open banking..."
                  className="w-full h-14 pl-12 pr-12 text-base bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border-white/30 dark:border-slate-600/30 rounded-xl shadow-sm hover:bg-white/70 dark:hover:bg-slate-700/70 focus:bg-white/80 dark:focus:bg-slate-700/80 focus:border-[#00DFB8]/30 transition-all duration-300"
                />
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colours"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {searchQuery && (
                <div className="mt-4 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="bg-[#00DFB8]/10 border-[#00DFB8]/30 text-gray-700 dark:text-gray-300"
                  >
                    Searching: "{searchQuery}"
                  </Badge>
                  <button
                    onClick={handleClearSearch}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colours"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Results */}
            <div className="p-8">
              {searchResults.length === 0 ? (
                <div className="text-centre py-16">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-centre justify-centre">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    No results found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Try adjusting your search terms
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {searchResults.map((member) => (
                    <div
                      key={member.id}
                      onClick={() => handleCompanyClick(member)}
                      className="p-6 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 rounded-xl cursor-pointer transition-all duration-300 hover:border-[#00DFB8]/40 hover:bg-white/70 dark:hover:bg-slate-700/70 hover:shadow-lg group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#00DFB8] to-[#00B894] rounded-xl flex items-centre justify-centre text-white font-semibold text-sm flex-shrink-0">
                          {member.company.substring(0, 2).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 group-hover:text-[#00DFB8] transition-colours">
                            {member.company}
                          </h3>

                          <div className="flex flex-wrap gap-1 mb-3">
                            {member.expertise.slice(0, 3).map((skill, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs bg-white/50 dark:bg-slate-600/50 border-[#00DFB8]/20 text-gray-600 dark:text-gray-300"
                              >
                                {skill}
                              </Badge>
                            ))}
                            {member.expertise.length > 3 && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-white/50 dark:bg-slate-600/50 border-gray-200 dark:border-gray-600"
                              >
                                +{member.expertise.length - 3}
                              </Badge>
                            )}
                          </div>

                          {member.marketSegments &&
                            member.marketSegments.length > 0 && (
                              <div className="flex items-centre gap-2 mb-2">
                                <Briefcase className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {member.marketSegments
                                    .slice(0, 2)
                                    .join(", ")}
                                </span>
                              </div>
                            )}

                          {member.geographicFocus &&
                            member.geographicFocus.length > 0 && (
                              <div className="flex items-centre gap-2">
                                <Globe className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {member.geographicFocus
                                    .slice(0, 3)
                                    .join(", ")}
                                </span>
                              </div>
                            )}

                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 line-clamp-2">
                            {member.bio}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Back Button */}
              <div className="flex justify-start pt-8 mt-8 border-t border-white/20 dark:border-slate-700/20">
                <Button
                  variant="outline"
                  onClick={onBack}
                  className="px-6 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border-white/30 dark:border-slate-600/30 hover:bg-white/70 dark:hover:bg-slate-700/70"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Company Profile Modal */}
      <CompanyProfileModal
        company={selectedCompany}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}