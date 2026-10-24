import React, { useState } from 'react';
import { Sparkles, Users, Layers, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { ShowtimeSeat } from '@/types';
import { formatCurrency } from '@/utils/cn';

interface SmartSeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  showtimeId: string;
  onAcceptSeats: (seats: ShowtimeSeat[]) => void;
}

export const SmartSeatModal: React.FC<SmartSeatModalProps> = ({
  isOpen,
  onClose,
  showtimeId,
  onAcceptSeats,
}) => {
  const [seatCount, setSeatCount] = useState(2);
  const [zone, setZone] = useState<'vip' | 'standard' | 'center' | 'front' | 'back'>('center');
  const [together, setTogether] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<{
    seats: ShowtimeSeat[];
    totalPrice: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRecommend = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await apiClient.post(ENDPOINTS.SHOWTIMES.SMART_SEAT(showtimeId), {
        count: seatCount,
        preferences: { zone, together },
      });
      setRecommendation({
        seats: res.data.recommendedSeats,
        totalPrice: res.data.totalPrice,
      });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Unable to find suitable seats matching your criteria. Try different options.');
      setRecommendation(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = () => {
    if (recommendation && recommendation.seats.length > 0) {
      onAcceptSeats(recommendation.seats);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2 text-white">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Smart Seat Recommendation
        </span>
      }
      description="Our cinema algorithm finds the best viewing angle and groups your party together."
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {recommendation ? (
            <Button variant="primary" onClick={handleAccept} leftIcon={<Check className="w-4 h-4" />}>
              Lock Recommended Seats
            </Button>
          ) : (
            <Button variant="gold" onClick={handleRecommend} isLoading={isLoading}>
              Find Best Seats
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        {/* Number of Tickets */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Number of Tickets (Max 8)
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => {
                  setSeatCount(num);
                  setRecommendation(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                  seatCount === num
                    ? 'bg-brand-600 text-white border-brand-500 shadow-md shadow-brand-500/20'
                    : 'bg-slate-900 text-slate-300 border-cinema-border hover:bg-slate-800'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Preferred Zone */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Preferred Seating Zone
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setZone('center');
                setRecommendation(null);
              }}
              className={`p-3 rounded-lg border text-left transition-all ${
                zone === 'center'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-slate-900 border-cinema-border text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="font-bold text-xs">Center & Sweet Spot</div>
              <div className="text-[10px] opacity-75">Optimal sound and sightline</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setZone('vip');
                setRecommendation(null);
              }}
              className={`p-3 rounded-lg border text-left transition-all ${
                zone === 'vip'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-slate-900 border-cinema-border text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="font-bold text-xs">VIP Prime Rows</div>
              <div className="text-[10px] opacity-75">Elevated premium comfort</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setZone('standard');
                setRecommendation(null);
              }}
              className={`p-3 rounded-lg border text-left transition-all ${
                zone === 'standard'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-slate-900 border-cinema-border text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="font-bold text-xs">Standard Value Rows</div>
              <div className="text-[10px] opacity-75">Budget-friendly viewing</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setZone('back');
                setRecommendation(null);
              }}
              className={`p-3 rounded-lg border text-left transition-all ${
                zone === 'back'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-slate-900 border-cinema-border text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="font-bold text-xs">Back Rows</div>
              <div className="text-[10px] opacity-75">Panoramic full screen overview</div>
            </button>
          </div>
        </div>

        {/* Together Toggle */}
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
          <input
            type="checkbox"
            checked={together}
            onChange={(e) => {
              setTogether(e.target.checked);
              setRecommendation(null);
            }}
            className="w-4 h-4 rounded bg-slate-900 border-cinema-border text-brand-600 focus:ring-brand-500"
          />
          <span>Keep all {seatCount} seats strictly next to each other</span>
        </label>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Proposed Seats Preview */}
        {recommendation && (
          <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                AI Suggested Group
              </span>
              <Badge variant="gold">
                {formatCurrency(recommendation.totalPrice)}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {recommendation.seats.map((s) => (
                <div
                  key={s.id}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400 text-amber-200 text-xs font-mono font-bold flex items-center gap-1"
                >
                  <span>{s.seatCode}</span>
                  <span className="text-[10px] text-amber-300/80 uppercase">({s.type})</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400">
              Clicking <strong>Lock Recommended Seats</strong> will reserve these seats for 5 minutes.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
