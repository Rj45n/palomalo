"use client";

import { use } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import InterfaceDetailChart from "@/components/dashboard/InterfaceDetailChart";
import { ChevronLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ name: string }>;
}

export default function InterfaceDetailPage({ params }: PageProps) {
  const { name } = use(params);
  const decoded = decodeURIComponent(name);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Breadcrumb */}
        <Link
          href="/dashboard/interfaces"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Toutes les interfaces
        </Link>

        {/* Graphiques temps réel */}
        <InterfaceDetailChart interfaceName={decoded} pollInterval={5000} />
      </div>
    </DashboardLayout>
  );
}
