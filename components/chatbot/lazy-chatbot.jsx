"use client";

import dynamic from "next/dynamic";

export const ShifaaChatbotLazy = dynamic(
  () => import("@/components/chatbot").then((mod) => mod.ShifaaChatbot),
  { ssr: false, loading: () => null }
);
