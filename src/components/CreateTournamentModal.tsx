import React, { useState } from 'react';
import { GameType, GlobalPlayer } from '../types';
import { PlusCircle, X, Shield, Clock, Calendar, Search, Users, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface CreateTournamentModalProps {
  onClose: () => void;
  onCreate: (
    name: string,
    gameType: GameType,
    totalRounds: number,
    system: 'swiss' | 'knockout',
    selectedPlayerIds: string[],
    regStartDate?: string,
    regEndDate?: string
  ) => void;
  globalPlayers: GlobalPlayer[];
}

export default function CreateTournamentModal({ onClose, onCreate, globalPlayers }: CreateTournamentModalProps) {
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [name, setName] = useState('');
  const [gameType, setGameType] = useState<GameType>('Rapid');
  const [system, setSystem] = useState<'swiss' | 'knockout'>('swiss');
  const [totalRounds, setTotalRounds] = useState(5);
  const [regStartDate, setRegStartDate] = useState(getLocalDateString());
  const [regEndDate, setRegEndDate] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama turnamen wajib diisi.');
      return;
    }
    
    let finalRounds = totalRounds;
    if (system === 'knockout') {
      finalRounds = 1; // Will be auto-calculated upon starting based on registered player count
    } else {
      if (totalRounds < 1 || totalRounds > 12) {
        setError('Ronde harus berkisar antara 1 s.d. 12.');
        return;
      }
    }

    if (regStartDate && regEndDate && regEndDate < regStartDate) {
      setError('Batas akhir pendaftaran tidak boleh sebelum tanggal mulai.');
      return;
    }

    onCreate(name, gameType, finalRounds, system, [], regStartDate, regEndDate);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 z-[5500] animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900/40 backdrop-blur-2xl border border-white/15 rounded-3xl w-full max-w-xl p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
        id="create-tournament-dialog"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-350 hover:text-white p-1.5 hover:bg-white/5 rounded-xl transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4 shrink-0">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-300 rounded-xl border border-indigo-500/15">
            <PlusCircle className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-lg text-slate-100">Buat Turnamen Baru</h3>
            <p className="text-xs text-slate-400 mt-0.5">Atur sistem tanding dan masa pendaftaran untuk turnamen baru.</p>
          </div>
        </div>

        {/* Direct error row */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-350 rounded-xl text-xs font-sans shrink-0">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 flex-grow overflow-y-auto pr-1">
          {/* Tournament Name */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-400 uppercase tracking-wider mb-2">
              Nama Turnamen
            </label>
            <input
              type="text"
              placeholder="Contoh: Turnamen Piala Walikota Chess 2026"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 font-sans transition-all"
              id="tournament-input-name"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tournament System Choice */}
            <div>
              <label className="block text-xs font-mono font-medium text-slate-400 uppercase tracking-wider mb-2">
                Sistem Turnamen
              </label>
              <select
                value={system}
                onChange={(e) => setSystem(e.target.value as 'swiss' | 'knockout')}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 font-sans transition-all"
                id="tournament-input-system"
              >
                <option value="swiss">Sistem Swiss/Klasemen</option>
                <option value="knockout">Sistem Gugur/Knockout</option>
              </select>
            </div>

            {/* Game Type Selection */}
            <div>
              <label className="block text-xs font-mono font-medium text-slate-400 uppercase tracking-wider mb-2">
                Format Catur
              </label>
              <select
                value={gameType}
                onChange={(e) => setGameType(e.target.value as GameType)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 font-sans transition-all"
                id="tournament-input-type"
              >
                <option value="Blitz">Blitz (3 s.d. 5 Menit)</option>
                <option value="Rapid">Rapid (10 s.d. 25 Menit)</option>
                <option value="Classical">Classical (Klasikal)</option>
              </select>
            </div>

            {/* Total Rounds */}
            <div>
              <label className="block text-xs font-mono font-medium text-slate-400 uppercase tracking-wider mb-2">
                {system === 'knockout' ? 'Jumlah Ronde (Otomatis)' : 'Jumlah Ronde'}
              </label>
              <input
                type="number"
                disabled={system === 'knockout'}
                min={1}
                max={12}
                value={system === 'knockout' ? '' : totalRounds}
                placeholder={system === 'knockout' ? 'Ditentukan nanti...' : undefined}
                onChange={(e) => setTotalRounds(parseInt(e.target.value) || 5)}
                className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none font-mono transition-all ${
                  system === 'knockout' ? 'opacity-40 select-none' : 'focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400'
                }`}
                id="tournament-input-rounds"
                required={system !== 'knockout'}
              />
            </div>
          </div>

          {/* Registration Period Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                Mulai Pendaftaran (Tanggal)
              </label>
              <input
                type="date"
                value={regStartDate}
                onClick={(e) => 'showPicker' in HTMLInputElement.prototype && (e.target as HTMLInputElement).showPicker()}
                onChange={(e) => {
                  setRegStartDate(e.target.value);
                  setError('');
                }}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-slate-100 text-xs focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 font-sans transition-all cursor-pointer"
                id="tournament-input-start-date"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-rose-400" />
                Batas Akhir Pendaftaran (Tanggal)
              </label>
              <input
                type="date"
                value={regEndDate}
                onClick={(e) => 'showPicker' in HTMLInputElement.prototype && (e.target as HTMLInputElement).showPicker()}
                onChange={(e) => {
                  setRegEndDate(e.target.value);
                  setError('');
                }}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-slate-100 text-xs focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 font-sans transition-all cursor-pointer"
                id="tournament-input-end-date"
                placeholder="Pilih batas akhir..."
              />
              <p className="text-[10px] text-slate-500 mt-1">Kosongkan jika tidak ada batas akhir.</p>
            </div>
          </div>

          {/* Tips Info Block */}
          <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 flex gap-2 w-full text-[11px] text-slate-300 leading-relaxed font-sans shrink-0">
            <Clock className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <p className="text-slate-300">
              {system === 'swiss' 
                ? 'Sistem Swiss memasangkan pemain dengan poin setara tanpa eliminasi. Semua pemain bertanding di seluruh babak.' 
                : 'Sistem Gugur mengeliminasi pemain setelah kalah 1 kali tanding. Ronde baru dihasilkan otomatis hingga tersisa 1 pemenang.'}
            </p>
          </div>
        </form>

        {/* Form Actions */}
        <div className="flex gap-3 justify-end pt-3 border-t border-white/10 mt-4 shrink-0 font-sans">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-sans font-medium text-slate-350 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 text-xs font-sans font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer"
            id="submit-tournament"
          >
            Mulai Turnamen
          </button>
        </div>
      </motion.div>
    </div>
  );
}
