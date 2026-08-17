import type { Metadata } from "next";
import UgcGenerator from "./ugc-generator";

export const metadata: Metadata = {
  title: "UGC Review Generator",
  description:
    "Generate UGC review prompts and Zeely-style local lead ad packets in one workspace. Turn any offer into overlay copy, a proof-led script, and a 30-day content plan.",
};

export default function Home() {
  return <UgcGenerator />;
}
