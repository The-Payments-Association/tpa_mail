"use client";

import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Search } from "lucide-react";

export default function PreScreen({ onStartEmailFlow, onSearchMembers }) {
  return (
    <div className="min-h-screen flex items-centre justify-centre bg-gradient-to-br from-white via-[#E8FFFA] to-[#CFFFEF]">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <Card className="w-[380px] mx-auto backdrop-blur-xl bg-white/80 border border-white/30 shadow-xl rounded-3xl text-centre">
          <CardHeader>
            <CardTitle className="text-3xl font-semibold bg-gradient-to-r from-[#00B894] to-[#009F7F] bg-clip-text text-transparent">
              What would you like to do today?
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Choose how you want to start your workflow
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4 mt-4">
            <Button
              onClick={onStartEmailFlow}
              className="h-12 text-base bg-gradient-to-r from-[#00DFB8] to-[#00B894] hover:from-[#00B894] hover:to-[#009E80] text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-centre justify-centre gap-2"
            >
              <Mail className="w-5 h-5" /> Start Email Flow
            </Button>

            <Button
              onClick={onSearchMembers}
              variant="outline"
              className="h-12 text-base border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-all duration-300 flex items-centre justify-centre gap-2"
            >
              <Search className="w-5 h-5" /> Search Members
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
