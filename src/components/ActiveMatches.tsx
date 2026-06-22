import { useState, useEffect } from 'react';
import { Match, MatchResult } from '../types';
import { Swords, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, SkipBack, SkipForward } from 'lucide-react';

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
  
  const [selectedRound, setSelectedRound] = useState<number>(currentRound);

  useEffect(() => {
    if (matches.some(m => m.round === currentRound)) {
      setSelectedRound(currentRound);
    }
  }, [currentRound, matches]);

  const getResultBadge = (result: MatchResult) => {
    switch (result) {
      case '1-0':
        return <span className="text-emerald-400 font-bold text-xs tracking-wide">1-0</span>;
      case '0-1':
        return <span className="text-emerald-400 font-bold text-xs tracking-wide">0-1</span>;
      case '0.5-0.5':
        return <span className="text-sky-400 font-bold text-xs tracking-wide">½-½</span>;
      case '1-0F':
        return <span className="text-emerald-400 font-bold text-xs tracking-wide">1-0F</span>;
      case '0-1F':
        return <span className="text-emerald-400 font-bold text-xs tracking-wide">0-1F</span>;
      case 'pending':
      default:
        return <span className="text-slate-500 font-bold text-xs tracking-wide">-</span>;
    }
  };

  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);
  const activeRound = rounds.includes(selectedRound) ? selectedRound : (rounds.length > 0 ? rounds[rounds.length - 1] : currentRound);

  const roundMatches = matches
    .filter((m) => m.round === activeRound)
    .sort((a, b) => a.tableNumber - b.tableNumber);

  const isRoundActive = activeRound === currentRound;

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-6 shadow-2xl flex flex-col h-[650px]" id="matches-card">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between border-b border-white/10 pb-4 mb-4 gap-4 shrink-0">
        <div>
          <h3 className="font-sans font-bold text-xl text-slate-100 flex items-center gap-2">
            <Swords className="w-5 h-5 text-indigo-400" /> Meja Pertandingan
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            {isAdmin ? 'Masukan hasil laga di babak aktif.' : 'Pantau hasil tanding secara langsung.'}
          </p>
        </div>

        {/* Pagination Controls */}
        {rounds.length > 0 && (
          <div className="flex items-center gap-1 self-center bg-slate-950/50 p-1.5 rounded-2xl border border-white/5 shadow-inner">
            <button 
              onClick={() => setSelectedRound(rounds[0])}
              disabled={activeRound === rounds[0]}
              className="p-1.5 text-slate-500 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setSelectedRound(r => rounds[Math.max(0, rounds.indexOf(r) - 1)])}
              disabled={activeRound === rounds[0]}
              className="p-1.5 text-slate-500 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center px-1 gap-1 overflow-x-auto hide-scrollbar max-w-[200px] md:max-w-[400px]">
              {rounds.map(r => (
                <button
                  key={r}
                  onClick={() => setSelectedRound(r)}
                  className={`min-w-[32px] h-8 flex items-center justify-center text-xs font-bold font-mono rounded-xl transition-all cursor-pointer ${
                    activeRound === r 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                      : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setSelectedRound(r => rounds[Math.min(rounds.length - 1, rounds.indexOf(r) + 1)])}
              disabled={activeRound === rounds[rounds.length - 1]}
              className="p-1.5 text-slate-500 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setSelectedRound(rounds[rounds.length - 1])}
              disabled={activeRound === rounds[rounds.length - 1]}
              className="p-1.5 text-slate-500 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-grow min-h-0 relative overflow-hidden">
        <div className="absolute inset-0 overflow-y-auto pr-2 custom-scrollbar">
          {rounds.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 h-full">
              <AlertCircle className="w-8 h-8 text-indigo-400 mb-2 opacity-50" />
              <p className="text-sm">Belum ada pairing pertandingan.</p>
              <p className="text-xs mt-1">Gunakan tombol "Buat Pairing Babak Baru" untuk memulai.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 pb-4">
              {roundMatches.map((match) => {
                const isBye = match.blackPlayerId === 'BYE' || match.whitePlayerId === 'BYE';
                const isPending = match.result === 'pending';
                const hasResult = !isPending;

                return (
                  <div
                    key={match.id}
                    className={`flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 md:py-2.5 md:px-4 rounded-xl border transition-all shadow-sm group ${
                      isRoundActive ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-900/30 border-white/5 opacity-80'
                    }`}
                  >
                    {/* Table Number & Status Indicator */}
                    <div className="flex items-center justify-between md:justify-start gap-4 shrink-0">
                      <div className="w-8 text-center font-mono font-bold text-slate-400 text-sm">
                        {match.tableNumber}
                      </div>
                      
                      {/* Mobile Result Badge for non-admin or past rounds */}
                      <div className="md:hidden">
                        {getResultBadge(match.result)}
                      </div>
                    </div>

                    {/* Desktop Players and Middle Actions Layout */}
                    <div className="flex-1 flex flex-col md:flex-row md:items-center justify-center gap-3 md:gap-6 min-w-0">
                      
                      {/* White Player */}
                      <div className="flex-1 flex items-center justify-start md:justify-end gap-2.5 min-w-0">
                        {hasResult && match.result.startsWith('1-0') ? (
                          <span className="text-[10px] text-emerald-400 font-bold tracking-wider hidden xl:block uppercase">Menang</span>
                        ) : hasResult && match.result.startsWith('0-1') ? (
                          <span className="text-[10px] text-rose-400 font-bold tracking-wider hidden xl:block uppercase">Kalah</span>
                        ) : null}
                        <span className={`font-semibold font-sans text-sm truncate ${match.result.startsWith('1-0') ? 'text-white' : 'text-slate-300'}`}>
                          {match.whitePlayerName}
                        </span>
                        <div className="w-5 h-5 rounded-sm bg-slate-100 border border-slate-300 flex-shrink-0" title="Buah Putih"></div>
                      </div>

                      {/* Middle Area: Admin Controls or Result Badge */}
                      <div className="flex items-center justify-center shrink-0 min-w-[120px] bg-slate-950/40 md:bg-transparent rounded-xl py-2 md:py-0">
                        {isAdmin && isRoundActive && !isBye ? (
                          <div className="flex items-center gap-1.5 bg-slate-900 md:bg-transparent p-1 md:p-0 rounded-lg">
                            <button
                              onClick={() => onRecordResult(match.id, '1-0')}
                              className={`w-9 h-7 rounded text-xs font-bold font-mono transition-all cursor-pointer ${
                                match.result === '1-0' ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'bg-white/5 hover:bg-white/10 text-slate-300'
                              }`}
                            >
                              1-0
                            </button>
                            
                            {system !== 'knockout' && (
                              <button
                                onClick={() => onRecordResult(match.id, '0.5-0.5')}
                                className={`w-9 h-7 rounded text-xs font-bold font-mono transition-all cursor-pointer ${
                                  match.result === '0.5-0.5' ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' : 'bg-white/5 hover:bg-white/10 text-slate-300'
                                }`}
                              >
                                ½-½
                              </button>
                            )}

                            <button
                              onClick={() => onRecordResult(match.id, '0-1')}
                              className={`w-9 h-7 rounded text-xs font-bold font-mono transition-all cursor-pointer ${
                                match.result === '0-1' ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'bg-white/5 hover:bg-white/10 text-slate-300'
                              }`}
                            >
                              0-1
                            </button>

                            {!isPending && (
                              <button
                                onClick={() => onClearResult(match.id)}
                                className="w-7 h-7 flex items-center justify-center rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors ml-1 cursor-pointer"
                                title="Reset"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : isBye ? (
                          <span className="text-[10px] text-slate-500 font-mono tracking-widest bg-white/5 px-2 py-1 rounded">BYE</span>
                        ) : (
                          <div className="hidden md:flex justify-center w-[80px]">
                            {getResultBadge(match.result)}
                          </div>
                        )}
                      </div>

                      {/* Black Player */}
                      <div className="flex-1 flex items-center justify-start md:justify-start gap-2.5 min-w-0">
                        <div className="w-5 h-5 rounded-sm bg-slate-900 border border-slate-700 flex-shrink-0 shadow-inner" title="Buah Hitam"></div>
                        <span className={`font-semibold font-sans text-sm truncate ${match.result.startsWith('0-1') ? 'text-white' : 'text-slate-300'}`}>
                          {match.blackPlayerName}
                        </span>
                        {hasResult && match.result.startsWith('0-1') ? (
                          <span className="text-[10px] text-emerald-400 font-bold tracking-wider hidden xl:block uppercase">Menang</span>
                        ) : hasResult && match.result.startsWith('1-0') ? (
                          <span className="text-[10px] text-rose-400 font-bold tracking-wider hidden xl:block uppercase">Kalah</span>
                        ) : null}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
