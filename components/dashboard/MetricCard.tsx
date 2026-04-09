"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  icon: LucideIcon;
  color: "blue" | "orange" | "green" | "purple";
}

const colorClasses = {
  blue: "text-paloalto-blue bg-paloalto-blue/20",
  orange: "text-paloalto-orange bg-paloalto-orange/20",
  green: "text-green-500 bg-green-500/20",
  purple: "text-purple-500 bg-purple-500/20",
};

export default function MetricCard({
  title,
  value,
  unit,
  icon: Icon,
  color,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-lg p-6 border border-white/10 hover:border-white/20 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">{value}</span>
            {unit && <span className="text-lg text-muted-foreground">{unit}</span>}
          </div>
        </div>
        <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      {/* Barre de progression pour les pourcentages */}
      {unit === "%" && (
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`h-full ${
              color === "blue"
                ? "bg-paloalto-blue"
                : color === "orange"
                ? "bg-paloalto-orange"
                : color === "green"
                ? "bg-green-500"
                : "bg-purple-500"
            }`}
          />
        </div>
      )}
    </motion.div>
  );
}
