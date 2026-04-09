"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DiagnosticRecord } from "@/types";
import { Clock, CheckCircle, AlertTriangle, AlertCircle, Trash2, ChevronRight, RefreshCw } from "lucide-react";

function HealthBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "text-green-400 bg-green-500/10 border-green-500/20" :
    score >= 50 ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" :
    "text-red-400 bg-red-500/10 border-red-500/20";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${color}`}>
      {score}%
    </span>
  );
}

export default function HistoryPage() {
  const [records, setRecords] = useState<DiagnosticRecord[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/diagnostic/history?page=${p}&limit=20`);
      if (!res.ok) return;
      const data = await res.json();
      setRecords(data.records);
      setTotal(data.total);
      setPage(p);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/diagnostic/history?id=${id}`, { method: "DELETE" });
    load(page);
  };

  useEffect(() => { load(); }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Historique des diagnostics</h1>
            <p className="text-gray-400 text-sm mt-1">{total} diagnostic(s) enregistré(s)</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => load(page)} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <Card className="bg-white/5 border-white/10 p-12 text-center text-gray-500">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Aucun diagnostic enregistré.</p>
            <p className="text-sm mt-1">
              Lancez un diagnostic TAC depuis l&apos;onglet Diagnostics.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {records.map(r => (
              <Card key={r.id} className="bg-white/5 border-white/10 p-4 hover:bg-white/[0.08] transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <HealthBadge score={r.healthScore} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-sm">{r.hostname}</span>
                        <span className="text-gray-500 text-xs">{r.model}</span>
                        <span className="text-gray-600 text-xs">PAN-OS {r.version}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(r.timestamp).toLocaleString("fr-FR")}
                        </span>
                        {r.issueCount.critical > 0 && (
                          <span className="text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {r.issueCount.critical} critique(s)
                          </span>
                        )}
                        {r.issueCount.major > 0 && (
                          <span className="text-orange-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {r.issueCount.major} majeur(s)
                          </span>
                        )}
                        {r.issueCount.critical === 0 && r.issueCount.major === 0 && (
                          <span className="text-green-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            OK
                          </span>
                        )}
                        <span className="text-gray-600">{r.durationMs}ms</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Link href={`/dashboard/history/${r.id}`}>
                      <Button variant="outline" size="sm">
                        Voir <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(r.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {total > 20 && (
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => load(page - 1)} disabled={page <= 1}>
              Précédent
            </Button>
            <span className="px-4 py-2 text-sm text-gray-400">
              Page {page} / {Math.ceil(total / 20)}
            </span>
            <Button variant="outline" size="sm" onClick={() => load(page + 1)} disabled={page >= Math.ceil(total / 20)}>
              Suivant
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
