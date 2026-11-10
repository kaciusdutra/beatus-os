import { ReactNode } from "react";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

interface Props {
  children: ReactNode;
}

export default function AppLayout({
  children,
}: Props) {
  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-slate-100 print:block print:h-auto print:overflow-visible print:bg-white">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden print:block print:overflow-visible">
        <Topbar />

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 print:overflow-visible print:p-0">
          <div className="min-h-full w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}