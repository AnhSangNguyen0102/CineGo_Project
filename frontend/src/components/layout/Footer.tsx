import React from 'react';
import { Film, ShieldCheck, Heart, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-cinema-border bg-cinema-dark mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                <Film className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-white text-base">CineGo Smart Cinema</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Next-generation cinema ticketing with smart seat recommendation and real-time reservation.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Academic MVP Prototype</span>
            </div>
          </div>

          {/* Cinemas */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
              Locations
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>CineGo Grand Central IMAX</li>
              <li>CineGo Downtown Megamall</li>
              <li>CineGo Waterfront Plaza</li>
            </ul>
          </div>

          {/* Tech Stack */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
              Built With
            </h4>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="neutral" size="sm">React 18</Badge>
              <Badge variant="neutral" size="sm">TypeScript</Badge>
              <Badge variant="neutral" size="sm">Tailwind CSS</Badge>
              <Badge variant="neutral" size="sm">TanStack Query</Badge>
              <Badge variant="neutral" size="sm">Zustand</Badge>
              <Badge variant="neutral" size="sm">MSW</Badge>
              <Badge variant="neutral" size="sm">WebSockets</Badge>
            </div>
          </div>

          {/* Academic Simulation Notice */}
          <div className="bg-slate-900/60 border border-cinema-border rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
              <Sparkles className="w-4 h-4" />
              <span>Simulation Mode Active</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              All payment methods and transactions in CineGo are strictly simulated for academic demonstration. No real financial data is handled.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-cinema-border/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 CineGo Smart Cinema System. Non-commercial academic project.</p>
          <p className="flex items-center gap-1">
            Engineered with <Heart className="w-3.5 h-3.5 text-rose-500 inline fill-rose-500" /> for movie lovers.
          </p>
        </div>
      </div>
    </footer>
  );
};
