import type { ReactNode } from "react";
import { ProjectDialog } from "@/components/work/ProjectDialog";

/** The dialog shell stays mounted while prev / next swap the project inside it. */
export default function InterceptedWorkLayout({ children }: { children: ReactNode }) {
  return <ProjectDialog>{children}</ProjectDialog>;
}
