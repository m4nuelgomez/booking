"use client";

import { Suspense } from "react";
import ScheduleModal from "./ScheduleModal";

export default function ScheduleModalShell({
  conversationId,
}: {
  conversationId: string;
}) {
  return (
    <Suspense fallback={null}>
      <ScheduleModal conversationId={conversationId} />
    </Suspense>
  );
}
