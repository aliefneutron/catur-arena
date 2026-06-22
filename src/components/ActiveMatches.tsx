import { Match, MatchResult } from '../types';
import { Swords, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface ActiveMatchesProps {
  matches: Match[];
  onRecordResult: (matchId: string, result: MatchResult) => void;
  onClearResult: (matchId: string) => void;
  isAdmin: boolean;
  currentRound: number;
  system?: 'swiss' | 'knockout';
}

export default function ActiveMatches({
  matches,
  onRecordResult,
  onClearResult,
  isAdmin,
  currentRound,
  system = 'swiss',
}: ActiveMatchesProps) {
  
  const getResultBadge = (result: MatchResult) => {
    switch (result) {
      case '1-0':
        return (
          <span className="px-2.5 py-1 text-xs font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded">
            1 - 0 (Putih Menang)
          </span>
        );
      case '0-1':
        return (
          <span className="px-2.5 py-1 text-xs font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded">
            0 - 1 (Hitam Menang)
          </span>
        );
      case '0.5-0.5':
        return (
          <span className="px-2.5 py-1 text-xs font-mono font-bold bg-sky-500/10 text-sky-300 border border-sky-500/20 rounded">
            ½ - ½ (Remis)
          </span>
        );
      case '1-0F':
        return (
          <span className="px-2.5 py-1 text-xs font-mono font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded">
            1 - 0 F (W.O. Putih)
          </span>
        );
      case '0-1F':
        return (
          <span className="px-2.5 py-1 text-xs font-mono font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded">
            0 - 1 F (W.O. Hitam)
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-mono font-semibold bg-white/5 text-slate-400 border border-white/10 rounded animate-pulse">
            Bertanding...
          </span>
        );
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col h-full" id="matches-card">
      <div className="flex border-b border-white/10 pb-4 mb-5 items-center justify-between">
        <div>
          <h3 className="font-sans font-bold text-xl text-slate-100 flex items-center gap-2">
            <Swords className="w-5 h-5 text-indigo-400" /> Pairing Babak {currentRound}
          </h3>
          <p className="text-xs text-slate-300 mt-1 font-sans">
            Daftar meja pertandingan untuk babak aktif. {isAdmin ? 'Masukan hasil laga di bawah untuk memperbarui poin.' : 'Pantau hasil tanding secara langsung.'}
          </p>
        </div>
        <div className="text-xs font-bold font-mono px-3.5 py-1 bg-indigo-500/10 text-indigo-300 rounded-full border border-indigo-500/15">
          BABAK {currentRound}
        </div>
      </div>

      <div className="space-y-4">
        {matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <AlertCircle className="w-8 h-8 text-indigo-450 mb-2 text-indigo-400" />
            <p className="text-sm">Belum ada pairing untuk babak ini.</p>
            <p className="text-xs text-slate-400 mt-1">Gunakan tombol "Buat Pairing Babak Baru" untuk mengacak pertandingan.</p>
          </div>
        ) : (
          matches.map((match) => {
            const isBye = match.blackPlayerId === 'BYE' || match.whitePlayerId === 'BYE';
            const isPending = match.result === 'pending';

            return (
              <div
                key={match.id}
                className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:border-white/15 hover:bg-white/10 transition-all flex flex-col gap-4 shadow-sm"
                id={`match-table-${match.tableNumber}`}
              >
                {/* Table Header Row */}
                <div className="flex items-center justify-between text-xs font-mono border-b border-white/5 pb-2">
                  <span className="text-indigo-300 font-bold">Papan #{match.tableNumber}</span>
                  <div>{getResultBadge(match.result)}</div>
                </div>

                {/* Matchup Duelists Row */}
                <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-4 py-1">
                  {/* White Player */}
                  <div className={`md:col-span-4 flex items-center gap-3 ${match.result === '1-0' || match.result === '1-0F' ? 'text-indigo-300 font-bold' : 'text-slate-200'}`}>
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-900 text-sm flex-shrink-0 shadow-md">
                      P
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold font-sans text-sm truncate">{match.whitePlayerName}</p>
                      <span className="text-[10px] font-mono text-slate-400">PUTIH</span>
                    </div>
                  </div>

                  {/* VS Emblem */}
                  <div className="md:col-span-3 text-center flex items-center justify-center">
                    <span className="text-[10px] font-mono font-bold text-indigo-300 tracking-widest px-3.5 py-1 bg-indigo-500/15 rounded-full border border-indigo-500/20">
                      V S
                    </span>
                  </div>

                  {/* Black Player */}
                  <div className={`md:col-span-4 flex items-center md:flex-row-reverse gap-3 md:text-right ${match.result === '0-1' || match.result === '0-1F' ? 'text-indigo-300 font-bold' : 'text-slate-200'}`}>
                    <div className="w-8 h-8 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center font-bold text-slate-100 text-sm flex-shrink-0 shadow-md">
                      H
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold font-sans text-sm truncate">{match.blackPlayerName}</p>
                      <span className="text-[10px] font-mono text-slate-400">HITAM</span>
                    </div>
                  </div>
                </div>

                {/* Organizer Input Action Dashboard */}
                {isAdmin && (
                  <div className="mt-2 pt-3 border-t border-white/5 flex flex-wrap items-center gap-2 justify-end relative z-10">
                    {isBye ? (
                      <span className="text-xs text-slate-400 italic font-sans pr-2">
                        Pemain BYE otomatis mendapatkan kemenangan penuh (1 poin).
                      </span>
                    ) : (
                      <>
                        {system === 'knockout' ? (
                          <span className="text-[10px] text-slate-400 font-medium italic mr-2">
                            Catat Hasil (Tiebreak/Sudden Death):
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300 font-sans mr-2">Catat Hasil:</span>
                        )}
                        
                        {/* 1-0 Button */}
                        <button
                          onClick={() => onRecordResult(match.id, '1-0')}
                          disabled={match.result === '1-0'}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all border ${
                            match.result === '1-0'
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                              : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          1 - 0
                        </button>

                        {/* Draw Button */}
                        {system !== 'knockout' && (
                          <button
                            onClick={() => onRecordResult(match.id, '0.5-0.5')}
                            disabled={match.result === '0.5-0.5'}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all border ${
                              match.result === '0.5-0.5'
                                ? 'bg-sky-600 text-white border-sky-500 shadow-md shadow-sky-600/20'
                                : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            ½ - ½
                          </button>
                        )}

                        {/* 0-1 Button */}
                        <button
                          onClick={() => onRecordResult(match.id, '0-1')}
                          disabled={match.result === '0-1'}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all border ${
                            match.result === '0-1'
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                              : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          0 - 1
                        </button>

                        {/* Forfeit and clear items */}
                        <div className="h-5 w-px bg-white/10 mx-1" />

                        {/* Reset Matches Button */}
                        {!isPending && (
                          <button
                            onClick={() => onClearResult(match.id)}
                            className="p-1.5 hover:bg-white/5 text-slate-300 hover:text-white rounded-xl transition-all flex items-center justify-center gap-1 text-[11px] font-sans border border-transparent hover:border-white/10"
                            title="Reset Hasil Pertandingan"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Reset
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
