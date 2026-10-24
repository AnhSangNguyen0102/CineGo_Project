import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Armchair,
  Plus,
  Edit2,
  Trash2,
  Layers,
  MapPin,
  CheckCircle,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { Room, RoomSeatConfig, SeatType } from '@/types';
import { SEED_CINEMAS } from '@/mocks/seedData';

const ROW_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M'];

export const AdminRoomsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Room | null>(null);

  // Layout editor state
  const [cinemaId, setCinemaId] = useState(SEED_CINEMAS[0].id);
  const [roomName, setRoomName] = useState('');
  const [rows, setRows] = useState(8);
  const [cols, setCols] = useState(10);
  const [seatLayout, setSeatLayout] = useState<RoomSeatConfig[]>([]);

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['admin-rooms'],
    queryFn: async () => {
      const res = await apiClient.get<Room[]>(ENDPOINTS.ADMIN.ROOMS);
      return res.data;
    },
  });

  const generateDefaultLayout = (numRows: number, numCols: number): RoomSeatConfig[] => {
    const list: RoomSeatConfig[] = [];
    for (let r = 0; r < numRows; r++) {
      const rowChar = ROW_LETTERS[r];
      for (let c = 1; c <= numCols; c++) {
        let type: SeatType = 'standard';
        if (r >= numRows - 1) {
          type = 'couple';
        } else if (r >= Math.floor(numRows / 2)) {
          type = 'vip';
        }
        list.push({
          id: `seat_${rowChar}${c}`,
          row: rowChar,
          col: c,
          seatCode: `${rowChar}${c}`,
          type,
        });
      }
    }
    return list;
  };

  const openAddModal = () => {
    setEditingRoom(null);
    setCinemaId(SEED_CINEMAS[0].id);
    setRoomName('New Auditorium (Dolby Laser)');
    setRows(6);
    setCols(8);
    setSeatLayout(generateDefaultLayout(6, 8));
    setModalOpen(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setCinemaId(room.cinemaId);
    setRoomName(room.name);
    setRows(room.totalRows);
    setCols(room.totalCols);
    setSeatLayout(room.seatLayout);
    setModalOpen(true);
  };

  const handleDimensionChange = (newRows: number, newCols: number) => {
    setRows(newRows);
    setCols(newCols);
    setSeatLayout(generateDefaultLayout(newRows, newCols));
  };

  // Cycle seat type on click: standard -> vip -> couple -> standard
  const handleToggleSeatType = (seatId: string) => {
    setSeatLayout((prev) =>
      prev.map((s) => {
        if (s.id === seatId) {
          const nextType: SeatType =
            s.type === 'standard' ? 'vip' : s.type === 'vip' ? 'couple' : 'standard';
          return { ...s, type: nextType };
        }
        return s;
      })
    );
  };

  // Set all seats in a row to a specific type
  const handleSetRowType = (rowLetter: string, type: SeatType) => {
    setSeatLayout((prev) =>
      prev.map((s) => (s.row === rowLetter ? { ...s, type } : s))
    );
  };

  const handleSave = async () => {
    if (!roomName.trim()) {
      toast.warning('Please enter a room name.');
      return;
    }

    const cinema = SEED_CINEMAS.find((c) => c.id === cinemaId) || SEED_CINEMAS[0];
    const payload = {
      cinemaId,
      cinemaName: cinema.name,
      name: roomName,
      totalRows: rows,
      totalCols: cols,
      totalSeats: seatLayout.length,
      seatLayout,
    };

    try {
      if (editingRoom) {
        await apiClient.put(ENDPOINTS.ADMIN.ROOM_DETAIL(editingRoom.id), payload);
        toast.success(`Room "${roomName}" updated successfully.`);
      } else {
        await apiClient.post(ENDPOINTS.ADMIN.ROOMS, payload);
        toast.success(`Room "${roomName}" created with layout.`);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-rooms'] });
      setModalOpen(false);
    } catch (err: any) {
      toast.error('Failed to save room.');
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      const res = await apiClient.delete(ENDPOINTS.ADMIN.ROOM_DETAIL(deleteCandidate.id));
      toast.info(res.data.message || 'Room removed.');
      queryClient.invalidateQueries({ queryKey: ['admin-rooms'] });
      setDeleteCandidate(null);
    } catch {
      toast.error('Failed to delete room.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Armchair className="w-7 h-7 text-brand-500" />
            Rooms & Interactive Seat Layout Editor
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure theater auditoriums, calibrate rows & columns, and design standard/VIP/couple zones.
          </p>
        </div>

        <Button variant="primary" onClick={openAddModal} leftIcon={<Plus className="w-4 h-4" />}>
          Create New Room
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Auditorium Name</TableHead>
            <TableHead>Cinema Location</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead>Grid Dimensions</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rooms?.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-brand-400">
                    <Armchair className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-sm block">{r.name}</span>
                    <span className="text-[11px] text-slate-400">ID: {r.id}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-xs text-slate-300 font-medium">{r.cinemaName}</span>
              </TableCell>
              <TableCell>
                <Badge variant="gold" size="sm">
                  {r.totalSeats} Seats
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-xs text-slate-300 font-mono">
                  {r.totalRows} Rows × {r.totalCols} Cols
                </span>
              </TableCell>
              <TableCell>
                {r.isActive ? (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" /> Active
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Inactive
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => openEditModal(r)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                    title="Edit seat layout"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteCandidate(r)}
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                    title="Delete room"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Seat Layout Editor Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRoom ? `Edit Layout: ${editingRoom.name}` : 'Auditorium Seat Layout Editor'}
        maxWidth="3xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Save Room & Layout
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Room Meta Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Cinema Location
              </label>
              <select
                value={cinemaId}
                onChange={(e) => setCinemaId(e.target.value)}
                className="w-full bg-slate-900 border border-cinema-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {SEED_CINEMAS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Auditorium Name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g. Auditorium 1 (IMAX Laser)"
            />
          </div>

          {/* Dimension Sliders */}
          <div className="grid grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-xl border border-cinema-border">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Number of Rows: <span className="text-brand-400 font-bold">{rows}</span>
              </label>
              <input
                type="range"
                min={4}
                max={10}
                value={rows}
                onChange={(e) => handleDimensionChange(Number(e.target.value), cols)}
                className="w-full accent-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Columns per Row: <span className="text-brand-400 font-bold">{cols}</span>
              </label>
              <input
                type="range"
                min={6}
                max={12}
                value={cols}
                onChange={(e) => handleDimensionChange(rows, Number(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>
          </div>

          {/* Interactive Seat Matrix Preview */}
          <div className="bg-slate-900/90 border border-cinema-border rounded-2xl p-6 space-y-4">
            <div className="text-center space-y-1">
              <div className="h-2 w-3/4 max-w-sm mx-auto bg-gradient-to-r from-transparent via-brand-500 to-transparent rounded-t-full" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Screen Direction
              </p>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Click any seat below to cycle its category (<strong>Standard</strong> →{' '}
              <strong>VIP Prime</strong> → <strong>Couple</strong>).
            </p>

            <div className="overflow-x-auto pb-2">
              <div className="mx-auto flex flex-col items-center gap-2">
                {Array.from(new Set(seatLayout.map((s) => s.row))).map((rLetter) => {
                  const rSeats = seatLayout.filter((s) => s.row === rLetter);

                  return (
                    <div key={rLetter} className="flex items-center gap-2">
                      <span className="w-4 text-xs font-mono font-bold text-slate-400 text-center">
                        {rLetter}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {rSeats.map((seat) => {
                          let typeStyle = 'bg-slate-800 border-slate-700 text-slate-200';
                          if (seat.type === 'vip') {
                            typeStyle = 'bg-amber-500/20 border-amber-500/50 text-amber-300';
                          } else if (seat.type === 'couple') {
                            typeStyle = 'bg-pink-500/20 border-pink-500/50 text-pink-300';
                          }

                          return (
                            <button
                              key={seat.id}
                              type="button"
                              onClick={() => handleToggleSeatType(seat.id)}
                              className={`w-7 h-7 rounded text-[10px] font-mono font-bold border transition-transform hover:scale-110 ${typeStyle}`}
                              title={`${seat.seatCode} (${seat.type.toUpperCase()})`}
                            >
                              {seat.col}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-1 ml-2">
                        <button
                          type="button"
                          onClick={() => handleSetRowType(rLetter, 'standard')}
                          className="px-1.5 py-0.5 text-[9px] rounded bg-slate-800 text-slate-400 hover:text-white"
                          title="Set row to Standard"
                        >
                          Std
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetRowType(rLetter, 'vip')}
                          className="px-1.5 py-0.5 text-[9px] rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                          title="Set row to VIP"
                        >
                          VIP
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetRowType(rLetter, 'couple')}
                          className="px-1.5 py-0.5 text-[9px] rounded bg-pink-500/20 text-pink-300 hover:bg-pink-500/30"
                          title="Set row to Couple"
                        >
                          Cpl
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total count badge */}
            <div className="flex justify-between items-center text-xs text-slate-400 pt-3 border-t border-cinema-border">
              <span>
                Total Capacity: <strong className="text-white">{seatLayout.length} seats</strong>
              </span>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="text-sky-300">
                  Standard: {seatLayout.filter((s) => s.type === 'standard').length}
                </span>
                <span className="text-amber-300">
                  VIP: {seatLayout.filter((s) => s.type === 'vip').length}
                </span>
                <span className="text-pink-300">
                  Couple: {seatLayout.filter((s) => s.type === 'couple').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={handleDelete}
        title="Remove Room"
        message={`Are you sure you want to remove "${deleteCandidate?.name}"? If active showtimes exist in this auditorium, it will be soft-deactivated.`}
        confirmText="Confirm Delete"
      />
    </div>
  );
};
