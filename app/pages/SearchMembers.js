"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  X,
  Building2,
  Globe,
  Briefcase,
  ArrowLeft,
  SlidersHorizontal,
  Plus,
} from "lucide-react";
import { membersDatabase } from "@/lib/membersDatabase";
import CompanyProfileModal from "./CompanyProfileModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [currentSearchInput, setCurrentSearchInput] = useState("");
  const [searchTerms, setSearchTerms] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filter states
  const [selectedExpertise, setSelectedExpertise] = useState([]);
  const [selectedMarkets, setSelectedMarkets] = useState([]);
  const [selectedRegions, setSelectedRegions] = useState([]);

  // Extract unique filter options
  const filterOptions = useMemo(() => {
    const expertise = new Set();
    const markets = new Set();
    const regions = new Set();

    membersDatabase.forEach((member) => {
      member.expertise?.forEach((exp) => expertise.add(exp));
      member.marketSegments?.forEach((market) => markets.add(market));
      member.geographicFocus?.forEach((region) => regions.add(region));
    });

    return {
      expertise: Array.from(expertise).sort(),
      markets: Array.from(markets).sort(),
      regions: Array.from(regions).sort(),
    };
  }, []);

  // Handle adding search term
  const handleAddSearchTerm = (e) => {
    if (e.key === "Enter" && currentSearchInput.trim()) {
      e.preventDefault();
      if (!searchTerms.includes(currentSearchInput.trim())) {
        setSearchTerms([...searchTerms, currentSearchInput.trim()]);
      }
      setCurrentSearchInput("");
    }
  };

  // Handle removing search term
  const handleRemoveSearchTerm = (term) => {
    setSearchTerms(searchTerms.filter((t) => t !== term));
  };

  // Enhanced search logic with filters and multi-search
  const searchResults = useMemo(() => {
    let results = membersDatabase;

    // Apply expertise filter
    if (selectedExpertise.length > 0) {
      results = results.filter((member) =>
        selectedExpertise.some((exp) => member.expertise?.includes(exp))
      );
    }

    // Apply market filter
    if (selectedMarkets.length > 0) {
      results = results.filter((member) =>
        selectedMarkets.some((market) =>
          member.marketSegments?.includes(market)
        )
      );
    }

    // Apply region filter
    if (selectedRegions.length > 0) {
      results = results.filter((member) =>
        selectedRegions.some((region) =>
          member.geographicFocus?.includes(region)
        )
      );
    }

    // Apply multi-search terms - must match ALL terms
    if (searchTerms.length > 0) {
      results = results.filter((member) => {
        return searchTerms.every((term) => {
          const searchLower = term.toLowerCase();
          return (
            member.company.toLowerCase().includes(searchLower) ||
            member.expertise.some((exp) =>
              exp.toLowerCase().includes(searchLower)
            ) ||
            member.interests.some((interest) =>
              interest.toLowerCase().includes(searchLower)
            ) ||
            member.marketSegments?.some((segment) =>
              segment.toLowerCase().includes(searchLower)
            ) ||
            member.geographicFocus?.some((geo) =>
              geo.toLowerCase().includes(searchLower)
            ) ||
            member.solutionTypes?.some((solution) =>
              solution.toLowerCase().includes(searchLower)
            ) ||
            member.bio.toLowerCase().includes(searchLower)
          );
        });
      });
    }

    return results;
  }, [searchTerms, selectedExpertise, selectedMarkets, selectedRegions]);

  const handleCompanyClick = (company) => {
    setSelectedCompany(company);
    setIsModalOpen(true);
  };

  const clearAllFilters = () => {
    setSelectedExpertise([]);
    setSelectedMarkets([]);
    setSelectedRegions([]);
  };

  const clearAllSearchTerms = () => {
    setSearchTerms([]);
    setCurrentSearchInput("");
  };

  const activeFilterCount =
    selectedExpertise.length + selectedMarkets.length + selectedRegions.length;

  const FilterSection = ({ title, options, selected, onChange }) => (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
        {title}
      </h4>
      <ScrollArea className="h-48">
        <div className="space-y-2 pr-4">
          {options.slice(0, 15).map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox
                id={`${title}-${option}`}
                checked={selected.includes(option)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onChange([...selected, option]);
                  } else {
                    onChange(selected.filter((item) => item !== option));
                  }
                }}
                className="border-[#00DFB8]/30 data-[state=checked]:bg-[#00DFB8] data-[state=checked]:border-[#00DFB8]"
              />
              <Label
                htmlFor={`${title}-${option}`}
                className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                {option}
              </Label>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-100/20 dark:from-slate-900 dark:via-teal-950/30 dark:to-emerald-950/20 p-6 transition-colors duration-300">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        {/* Theme toggle */}
        <div className="fixed top-6 right-6 z-50">
          <ThemeToggle />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <Card className="border-white/20 dark:border-slate-700/20 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-white/80 via-white/60 to-white/80 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-800/80 backdrop-blur-sm border-b border-white/20 dark:border-slate-700/20">
              <TPAMailLogo />

              <div className="flex items-center justify-between mb-6">
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Search member directory
                  </CardTitle>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
                    {searchResults.length} member
                    {searchResults.length === 1 ? "" : "s"} found
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#00DFB8]">
                    {membersDatabase.length}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    total members
                  </div>
                </div>
              </div>

              {/* Multi-search input with bubbles */}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                    <Input
                      type="text"
                      value={currentSearchInput}
                      onChange={(e) => setCurrentSearchInput(e.target.value)}
                      onKeyDown={handleAddSearchTerm}
                      placeholder="Type search term and press Enter (e.g., 'open banking')..."
                      className="w-full h-14 pl-12 pr-4 text-base bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border-white/30 dark:border-slate-600/30 rounded-xl shadow-sm hover:bg-white/70 dark:hover:bg-slate-700/70 focus:bg-white/80 dark:focus:bg-slate-700/80 focus:border-[#00DFB8]/30 transition-all duration-300"
                    />
                  </div>

                  {/* Filters button */}
                  <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-14 px-6 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border-white/30 dark:border-slate-600/30 hover:bg-white/70 dark:hover:bg-slate-700/70 relative"
                      >
                        <SlidersHorizontal className="w-5 h-5 mr-2" />
                        Filters
                        {activeFilterCount > 0 && (
                          <Badge className="absolute -top-2 -right-2 bg-[#00DFB8] text-white h-6 w-6 flex items-center justify-center p-0 rounded-full">
                            {activeFilterCount}
                          </Badge>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-white/30 dark:border-slate-700/30">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                          Filter members
                        </DialogTitle>
                      </DialogHeader>

                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-6 mt-6">
                          <FilterSection
                            title="Expertise"
                            options={filterOptions.expertise}
                            selected={selectedExpertise}
                            onChange={setSelectedExpertise}
                          />

                          <FilterSection
                            title="Market segments"
                            options={filterOptions.markets}
                            selected={selectedMarkets}
                            onChange={setSelectedMarkets}
                          />

                          <FilterSection
                            title="Geographic focus"
                            options={filterOptions.regions}
                            selected={selectedRegions}
                            onChange={setSelectedRegions}
                          />
                        </div>
                      </ScrollArea>

                      <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
                        <Button
                          variant="outline"
                          onClick={clearAllFilters}
                          disabled={activeFilterCount === 0}
                          className="bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border-white/30 dark:border-slate-600/30"
                        >
                          Clear all filters
                        </Button>
                        <Button
                          onClick={() => setIsFilterOpen(false)}
                          className="bg-gradient-to-r from-[#00DFB8] to-[#00B894] hover:from-[#00B894] hover:to-[#00A085] text-white border-0"
                        >
                          Apply filters
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Search term bubbles */}
                {searchTerms.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      Search terms:
                    </span>
                    {searchTerms.map((term) => (
                      <Badge
                        key={term}
                        variant="outline"
                        className="bg-[#00DFB8] text-white border-[#00DFB8] hover:bg-[#00B894] transition-colors px-3 py-1 text-sm"
                      >
                        {term}
                        <button
                          onClick={() => handleRemoveSearchTerm(term)}
                          className="ml-2 hover:text-white/70 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllSearchTerms}
                      className="h-7 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Clear all
                    </Button>
                  </div>
                )}

                {/* Active filters display */}
                {activeFilterCount > 0 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      Filters:
                    </span>
                    {selectedExpertise.map((exp) => (
                      <Badge
                        key={exp}
                        variant="outline"
                        className="bg-[#00DFB8]/10 border-[#00DFB8]/30 text-gray-700 dark:text-gray-300 hover:bg-[#00DFB8]/20 transition-colors px-3 py-1"
                      >
                        {exp}
                        <button
                          onClick={() =>
                            setSelectedExpertise(
                              selectedExpertise.filter((item) => item !== exp)
                            )
                          }
                          className="ml-2 hover:text-[#00DFB8] transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    {selectedMarkets.map((market) => (
                      <Badge
                        key={market}
                        variant="outline"
                        className="bg-[#00B894]/10 border-[#00B894]/30 text-gray-700 dark:text-gray-300 hover:bg-[#00B894]/20 transition-colors px-3 py-1"
                      >
                        {market}
                        <button
                          onClick={() =>
                            setSelectedMarkets(
                              selectedMarkets.filter((item) => item !== market)
                            )
                          }
                          className="ml-2 hover:text-[#00B894] transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    {selectedRegions.map((region) => (
                      <Badge
                        key={region}
                        variant="outline"
                        className="bg-[#00A085]/10 border-[#00A085]/30 text-gray-700 dark:text-gray-300 hover:bg-[#00A085]/20 transition-colors px-3 py-1"
                      >
                        {region}
                        <button
                          onClick={() =>
                            setSelectedRegions(
                              selectedRegions.filter((item) => item !== region)
                            )
                          }
                          className="ml-2 hover:text-[#00A085] transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-8">
              {searchResults.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    No results found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Try adjusting your search terms or filters
                  </p>
                  {(activeFilterCount > 0 || searchTerms.length > 0) && (
                    <div className="flex gap-2 justify-center">
                      {searchTerms.length > 0 && (
                        <Button
                          variant="outline"
                          onClick={clearAllSearchTerms}
                          className="bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border-white/30 dark:border-slate-600/30"
                        >
                          Clear search terms
                        </Button>
                      )}
                      {activeFilterCount > 0 && (
                        <Button
                          variant="outline"
                          onClick={clearAllFilters}
                          className="bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border-white/30 dark:border-slate-600/30"
                        >
                          Clear all filters
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map((member) => (
                    <Card
                      key={member.id}
                      onClick={() => handleCompanyClick(member)}
                      className="cursor-pointer transition-all duration-300 hover:border-[#00DFB8]/40 hover:shadow-lg group bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border-white/30 dark:border-slate-600/30"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#00DFB8] to-[#00B894] rounded-lg flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                            {member.company.substring(0, 2).toUpperCase()}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-1 group-hover:text-[#00DFB8] transition-colors truncate">
                              {member.company}
                            </h3>

                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                              {member.bio}
                            </p>

                            <div className="flex flex-wrap gap-1">
                              {member.expertise
                                .slice(0, 2)
                                .map((skill, index) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 bg-white/50 dark:bg-slate-600/50 border-[#00DFB8]/20 text-gray-600 dark:text-gray-300"
                                  >
                                    {skill}
                                  </Badge>
                                ))}
                              {member.expertise.length > 2 && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 bg-white/50 dark:bg-slate-600/50 border-gray-200 dark:border-gray-600"
                                >
                                  +{member.expertise.length - 2}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Back button */}
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
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Company profile modal */}
      <CompanyProfileModal
        company={selectedCompany}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}