import React from "react";
import { Metadata } from "next";
import { api } from "@/lib/api";
import { ScheduleClient } from "./ScheduleClient";

export const metadata: Metadata = {
  title: "Airing Schedule — Weekly Anime Broadcast Calendar",
  description: "Live anime broadcast schedule with local timezone countdowns and tracking integration.",
};

export default async function SchedulePage() {
  const weekData = await api.getWeekSchedule().catch(() => []);

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-8 min-h-screen space-y-6">
      <ScheduleClient initialWeekData={weekData} />
    </div>
  );
}
