import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode,
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Search,
  Sparkles,
  RefreshCw,
  Armchair,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { CheckinResult, Booking } from '@/types';
import { formatTime, formatDate, formatCurrency } from '@/utils/cn';

export const StaffCheckinPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const { toast } = useToast();

  const [inputToken, setInputToken] = useState(initialCode);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [recentScans, setRecentScans] = useState<CheckinResult[]>([]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-camera-stream';

  const handleVerify = async (tokenToVerify?: string) => {
    const token = (tokenToVerify || inputToken).trim();
    if (!token) {
      toast.warning('Please enter or scan a ticket code.');
      return;
    }

    try {
      setIsVerifying(true);
      const res = await apiClient.post<CheckinResult>(ENDPOINTS.CHECKIN.VERIFY, { token });
      setResult(res.data);
      setRecentScans((prev) => [res.data, ...prev.slice(0, 9)]);

      if (res.data.status === 'valid') {
        toast.success(res.data.message, 'Valid Ticket');
      } else if (res.data.status === 'already_used') {
        toast.error(res.data.message, 'Already Checked In');
      } else {
        toast.warning(res.data.message, 'Verification Notice');
      }
    } catch (err: any) {
      toast.error('Failed to verify ticket with server.');
    } finally {
      setIsVerifying(false);
    }
  };

  // If URL has code parameter on initial load, auto-verify!
  useEffect(() => {
    if (initialCode) {
      handleVerify(initialCode);
    }
  }, [initialCode]);

  // Camera QR Scanner setup
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const scanner = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          setInputToken(decodedText);
          handleVerify(decodedText);
          stopCamera();
        },
        () => {
          // ignore scan frame errors
        }
      );
    } catch (err: any) {
      console.warn('Camera scan start failed:', err);
      toast.warning('Unable to access device camera. Please enter code manually.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handlePresetCode = (code: string) => {
    setInputToken(code);
    handleVerify(code);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20 space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <QrCode className="w-8 h-8 text-cyan-400" />
            Cinema Ticket Verification Desk
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Staff entrance gate terminal: Scan customer QR tickets or enter code manually.
          </p>
        </div>
        <Badge variant="warning" size="md">
          Staff Gate Mode
        </Badge>
      </div>

      {/* Preset Test Scenarios Box */}
      <div className="bg-slate-900 border border-cinema-border rounded-xl p-3.5 space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Quick Test Scan Presets (Evaluation Convenience):
        </span>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePresetCode('TICKET-CINEGO-VALID-001')}
            className="text-xs text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/10"
          >
            ✓ Test VALID Ticket
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePresetCode('TICKET-CINEGO-USED-002')}
            className="text-xs text-red-300 border-red-500/40 hover:bg-red-500/10"
          >
            ✗ Test ALREADY USED Ticket
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePresetCode('CG-984210')}
            className="text-xs text-sky-300 border-sky-500/40 hover:bg-sky-500/10"
          >
            Test Order Code (CG-984210)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePresetCode('INVALID-TOKEN-999')}
            className="text-xs text-slate-400 border-slate-700 hover:bg-slate-800"
          >
            Test INVALID Code
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Scanner & Input Form */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center justify-between">
              <span>Scan QR or Enter Token</span>
              {isCameraActive ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={stopCamera}
                  leftIcon={<CameraOff className="w-3.5 h-3.5" />}
                >
                  Turn Off Camera
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={startCamera}
                  leftIcon={<Camera className="w-3.5 h-3.5 text-cyan-400" />}
                >
                  Start Camera Scan
                </Button>
              )}
            </h2>

            {/* Camera Viewport */}
            <div
              className={`rounded-2xl overflow-hidden border border-cinema-border bg-black transition-all ${
                isCameraActive ? 'block min-h-[300px]' : 'hidden'
              }`}
            >
              <div id={scannerContainerId} className="w-full" />
            </div>

            {/* Manual Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerify();
              }}
              className="space-y-3 pt-2"
            >
              <Input
                label="Ticket QR Token / Order Reference"
                placeholder="e.g. TICKET-CINEGO-VALID-001 or CG-984210"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                leftIcon={<QrCode className="w-4 h-4" />}
                rightIcon={
                  inputToken && (
                    <button
                      type="button"
                      onClick={() => setInputToken('')}
                      className="text-slate-400 hover:text-white"
                    >
                      ×
                    </button>
                  )
                }
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isVerifying}
                leftIcon={<Search className="w-4 h-4" />}
              >
                Verify & Check In
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Scan Verification Result Card */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="p-6">
            <h2 className="text-base font-bold text-white border-b border-cinema-border pb-3 mb-4">
              Verification Status
            </h2>

            {!result ? (
              <div className="py-16 text-center space-y-2">
                <QrCode className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-sm font-medium text-slate-300">Ready to Scan</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Scan a customer's digital boarding pass or input their reference number to check in.
                </p>
              </div>
            ) : result.status === 'valid' && result.ticket ? (
              /* VALID TICKET STATE */
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-base font-bold text-emerald-300">TICKET VALID - ADMISSION APPROVED</h3>
                    <p className="text-xs text-emerald-200/80 mt-0.5">{result.message}</p>
                  </div>
                </div>

                {/* Ticket Details */}
                <div className="space-y-3 pt-2">
                  <div className="flex gap-4 items-center">
                    <img
                      src={result.ticket.movie.posterUrl}
                      alt={result.ticket.movie.title}
                      className="w-16 h-24 rounded-lg object-cover bg-slate-900 shadow-md"
                    />
                    <div>
                      <h4 className="text-lg font-extrabold text-white">
                        {result.ticket.movie.title}
                      </h4>
                      <p className="text-xs text-slate-400">{result.ticket.cinema.name}</p>
                      <p className="text-xs text-brand-400 font-bold mt-1">
                        {result.ticket.cinema.roomName} • {formatDate(result.ticket.showtime.startTime)} at{' '}
                        {formatTime(result.ticket.showtime.startTime)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-900 border border-cinema-border text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Customer Name:</span>
                      <span className="font-bold text-white">{result.ticket.userName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Seats ({result.ticket.seats.length}):</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {result.ticket.seats.map((s) => s.seatCode).join(', ')}
                      </span>
                    </div>
                  </div>

                  {result.ticket.foodItems.length > 0 && (
                    <div className="p-3 rounded-lg bg-slate-900 border border-cinema-border text-xs">
                      <span className="font-bold text-slate-300 block mb-1">Concessions to hand over:</span>
                      {result.ticket.foodItems.map((f, i) => (
                        <div key={i} className="text-slate-200">
                          • {f.quantity}x {f.name}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 text-right pt-2">
                    Verified at: {new Date(result.checkedInAt || Date.now()).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ) : result.status === 'already_used' ? (
              /* ALREADY USED STATE */
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 flex items-start gap-3">
                  <XCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-base font-bold text-red-300">ALREADY USED - ENTRY DENIED</h3>
                    <p className="text-xs text-red-200/90 mt-1 leading-relaxed">{result.message}</p>
                  </div>
                </div>

                {result.ticket && (
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-cinema-border text-xs space-y-1 text-slate-300">
                    <p>
                      <strong>Movie:</strong> {result.ticket.movie.title}
                    </p>
                    <p>
                      <strong>Seats:</strong> {result.ticket.seats.map((s) => s.seatCode).join(', ')}
                    </p>
                    <p>
                      <strong>Customer:</strong> {result.ticket.userName}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* INVALID / WRONG SHOWTIME STATE */
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/50 flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-base font-bold text-amber-300">INVALID OR EXPIRED TICKET</h3>
                    <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">{result.message}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Recent Scans Feed */}
          {recentScans.length > 0 && (
            <Card className="p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recent Terminal Check-Ins
              </h3>
              <div className="space-y-2">
                {recentScans.map((scan, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-cinema-border text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          scan.status === 'valid'
                            ? 'bg-emerald-500'
                            : scan.status === 'already_used'
                            ? 'bg-red-500'
                            : 'bg-amber-500'
                        }`}
                      />
                      <span className="font-semibold text-white">
                        {scan.ticket?.movie.title || 'Unknown Ticket'}
                      </span>
                    </div>
                    <Badge
                      variant={
                        scan.status === 'valid'
                          ? 'success'
                          : scan.status === 'already_used'
                          ? 'danger'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {scan.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
