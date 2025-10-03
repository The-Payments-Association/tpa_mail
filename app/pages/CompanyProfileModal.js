"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Globe,
  Briefcase,
  Users,
  Award,
  Target,
  TrendingUp,
  Shield,
  X,
} from "lucide-react";

export default function CompanyProfileModal({ company, isOpen, onClose }) {
  if (!company) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-white/30 dark:border-slate-700/30">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#00DFB8] to-[#00B894] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {company.company.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {company.company}
                </DialogTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {company.employeeCount} employees
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* About */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#00DFB8]" />
              About
            </h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {company.bio}
            </p>
          </section>

          {/* Expertise */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-[#00DFB8]" />
              Expertise
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
          </section>

          {/* Areas of Interest */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#00DFB8]" />
              Areas of Interest
            </h3>
            <div className="flex flex-wrap gap-2">
              {company.interests.map((interest, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="bg-[#00B894]/10 border-[#00B894]/30 text-gray-700 dark:text-gray-300"
                >
                  {interest}
                </Badge>
              ))}
            </div>
          </section>

          {/* Market Segments */}
          {company.marketSegments && company.marketSegments.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#00DFB8]" />
                Market Segments
              </h3>
              <div className="flex flex-wrap gap-2">
                {company.marketSegments.map((segment, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="bg-white/50 dark:bg-slate-700/50 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                  >
                    {segment}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Geographic Focus */}
          {company.geographicFocus && company.geographicFocus.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#00DFB8]" />
                Geographic Focus
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
            </section>
          )}

          {/* Solution Types */}
          {company.solutionTypes && company.solutionTypes.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#00DFB8]" />
                Solution Types
              </h3>
              <div className="flex flex-wrap gap-2">
                {company.solutionTypes.map((solution, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="bg-white/50 dark:bg-slate-700/50 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                  >
                    {solution}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Recent Initiatives */}
          {company.recentInitiatives && company.recentInitiatives.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-[#00DFB8]" />
                Recent Initiatives
              </h3>
              <ul className="space-y-2">
                {company.recentInitiatives.map((initiative, index) => (
                  <li
                    key={index}
                    className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2"
                  >
                    <span className="text-[#00DFB8] mt-1">•</span>
                    <span>{initiative}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Regulatory Expertise */}
          {company.regulatoryExpertise &&
            company.regulatoryExpertise.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#00DFB8]" />
                  Regulatory Expertise
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
              </section>
            )}

          {/* Industry Recognition */}
          {company.industryRecognition &&
            company.industryRecognition.length > 0 && (
              <section className="pb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#00DFB8]" />
                  Industry Recognition
                </h3>
                <ul className="space-y-2">
                  {company.industryRecognition.map((recognition, index) => (
                    <li
                      key={index}
                      className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2"
                    >
                      <span className="text-[#00DFB8] mt-1">•</span>
                      <span>{recognition}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={onClose}
            variant="outline"
            className="bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border-white/30 dark:border-slate-600/30"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}