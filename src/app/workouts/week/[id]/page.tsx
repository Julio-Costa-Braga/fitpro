"use client";

import { useParams } from "next/navigation";
import { WeekForm } from "@/components/week/WeekForm";

export default function EditWeekPage() {
  const { id } = useParams<{ id: string }>();
  return <WeekForm weekId={id} />;
}