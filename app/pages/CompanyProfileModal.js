"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2,
  Globe,
  Briefcase,
  Target,
  TrendingUp,
  Award,
  Shield,
  Users,
  Info,
  MapPin,
} from "lucide-react";

export default function CompanyProfileModal({ company, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!company) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-white/30 dark:border-slate-700/30 flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#00DFB8] to-[#00B894] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0">
              {company.company.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {company.company}
              </DialogTitle>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{company.employeeCount} employees</span>
                </div>
                {company.geographicFocus?.[0] && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{company.geographicFocus[0]}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-shrink-0"
        >
          <TabsList className="grid w-full grid-cols-3 bg-white/50 dark:bg-slate-700/50">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600">
              <Info className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="expertise" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600">
              <Target className="w-4 h-4 mr-2" />
              Expertise
            </TabsTrigger>
            <TabsTrigger value="details" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600">
              <Building2 className="w-4 h-4 mr-2" />
              Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="m-0 mt-4">
            <ScrollArea className="h-[calc(85vh-280px)]">
              <div className="space-y-4 pr-4">
                {/* About */}
                <Card className="bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-slate-600/30">
                  <CardContent className="p-4">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#00DFB8]" />
                      About
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      {company.bio}
                    </p>
                  </CardContent>
                </Card>

                {/* Key expertise */}
                <Card className="bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-slate-600/30">
                  <CardContent className="p-4">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#00DFB8]" />
                      Key expertise
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {company.expertise.slice(0, 6).map((skill, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-[#00DFB8]/10 border-[#00DFB8]/30 text-gray-700 dark:text-gray-300"
                        >
                          {skill}
                        </Badge>
                      ))}
                      {company.expertise.length > 6 && (
                        <Badge
                          variant="outline"
                          className="bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-gray-600"
                        >
                          +{company.expertise.length - 6} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Areas of interest */}
                <Card className="bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-slate-600/30">
                  <CardContent className="p-4">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#00DFB8]" />
                      Areas of interest
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {company.interests.slice(0, 6).map((interest, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-[#00B894]/10 border-[#00B894]/30 text-gray-700 dark:text-gray-300"
                        >
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Market segments */}
                {company.marketSegments && company.marketSegments.length > 0 && (
                  <Card className="bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-slate-600/30">
                    <CardContent className="p-4">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-[#00DFB8]" />
                        Market segments
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {company.marketSegments
                          .slice(0, 6)
                          .map((segment, index) => (
                            <div
                              key={index}
                              className="text-sm text-gray-600 dark:text-gray-300 bg-white/70 dark:bg-slate-600/70 rounded-lg px-3 py-2"
                            >
                              {segment}
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="expertise" className="m-0 mt-4">
            <ScrollArea className="h-[calc(85vh-280px)]">
              <div className="space-y-4 pr-4">
                {/* All expertise */}
                <Card className="bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-slate-600/30">
                  <CardContent className="p-4">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      All expertise areas
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {company.expertise.map((skill, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-[#00DFB8]/10 border-[#00DFB8]/30 text-gray-700 dark:text-gray-300"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Solution types */}
                {company.solutionTypes && company.solutionTypes.length > 0 && (
                  <Card className="bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-slate-600/30">
                    <CardContent className="p-4">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#00DFB8]" />
                        Solution types
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {company.solutionTypes.map((solution, index) => (
                          <div
                            key={index}
                            className="text-sm text-gray-600 dark:text-gray-300 bg-white/70 dark:bg-slate-600/70 rounded-lg px-3 py-2"
                          >
                            {solution}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent initiatives */}
                {company.recentInitiatives &&
                  company.recentInitiatives.length > 0 && (
                    <Card className="bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-slate-600/30">
                      <CardContent className="p-4">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                          <Award className="w-4 h-4 text-[#00DFB8]" />
                          Recent initiatives
                        </h3>
                        <ul className="space-y-2">
                          {company.recentInitiatives
                            .slice(0, 5)
                            .map((initiative, index) => (
                              <li
                                key={index}
                                className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2 bg-white/70 dark:bg-slate-600/70 rounded-lg px-3 py-2"
                              >
                                <span className="text-[#00DFB8] mt-0.5 flex-shrink-0">
                                  •
                                </span>
                                <span>{initiative}</span>
                              </li>
                            ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="details" className="m-0 mt-4">
            <ScrollArea className="h-[calc(85vh-280px)]">
              <div className="space-y-4 pr-4">
                {/* Geographic focus */}
                {company.geographicFocus &&
                  company.geographicFocus.length > 0 && (
                    <Card className="bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-slate-600/30">
                      <CardContent className="p-4">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                          <Globe className="w-4 h-4 text-[#00DFB8]" />
                          Geographic focus
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {company.geographicFocus.map((region, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="bg-white/50 dark:bg-slate-700/50 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                            >
                              {region}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {/* Regulatory expertise */}
                {company.regulatoryExpertise &&
                  company.regulatoryExpertise.length > 0 && (
                    <Card className="bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-slate-600/30">
                      <CardContent className="p-4">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-[#00DFB8]" />
                          Regulatory expertise
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {company.regulatoryExpertise.map((expertise, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="bg-white/50 dark:bg-slate-700/50 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                            >
                              {expertise}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {/* Industry recognition */}
                {company.industryRecognition &&
                  company.industryRecognition.length > 0 && (
                    <Card className="bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-slate-600/30">
                      <CardContent className="p-4">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                          <Award className="w-4 h-4 text-[#00DFB8]" />
                          Industry recognition
                        </h3>
                        <ul className="space-y-2">
                          {company.industryRecognition.map(
                            (recognition, index) => (
                              <li
                                key={index}
                                className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2"
                              >
                                <span className="text-[#00DFB8] mt-0.5 flex-shrink-0">
                                  •
                                </span>
                                <span>{recognition}</span>
                              </li>
                            )
                          )}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <Button
            onClick={onClose}
            className="bg-gradient-to-r from-[#00DFB8] to-[#00B894] hover:from-[#00B894] hover:to-[#00A085] text-white border-0"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}