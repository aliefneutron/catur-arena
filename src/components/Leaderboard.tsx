import { Player, Match } from '../types';
import { Trophy, Search, User, Shield, Compass, Swords, Calendar, Award, X, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'motion/react';

interface LeaderboardProps {
  players: Player[];
  matches: Match[];
  system?: 'swiss' | 'knockout';
}

export default function Leaderboard({ players, matches, system = 'swiss' }: LeaderboardProps) {
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // Filter matches for a specific player
  const getPlayerMatches = (playerId: string) => {
    if (!matches) return [];
    return matches.filter(
      (m) => m.whitePlayerId === playerId || m.blackPlayerId === playerId
    ).sort((a, b) => a.round - b.round);
  };

  // Calculate Buchholz score dynamically based on opponents' current live scores
  const getBuchholzScore = (player: Player) => {
    return player.opponentIds.reduce((sum, oppId) => {
      // Ignore special players like BYE
      if (oppId === 'BYE') return sum;
      const opp = players.find((p) => p.id === oppId);
      return sum + (opp ? opp.score : 0);
    }, 0);
  };

  // Build sorted list of players
  const processedPlayers = players.map((p) => ({
    ...p,
    dynamicBuchholz: getBuchholzScore(p),
  }));

  // Standard Chess sorting:
  // 1. Highest overall points
  // 2. Highest Buchholz tiebreaks
  // 3. Highest rating
  // 4. Name alphabetical
  const sortedPlayers = [...processedPlayers].sort((a, b) => {
    if (Math.abs(b.score - a.score) > 0.01) return b.score - a.score;
    if (Math.abs(b.dynamicBuchholz - a.dynamicBuchholz) > 0.01) return b.dynamicBuchholz - a.dynamicBuchholz;
    if (b.rating !== a.rating) return b.rating - a.rating;
    return a.name.localeCompare(b.name);
  });

  const filteredPlayers = sortedPlayers.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col h-full" id="leaderboard-card">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
        <div>
          <h3 className="font-sans font-bold text-xl text-slate-100 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-indigo-400 animate-pulse" /> Klasemen Turnamen (Leaderboard)
          </h3>
          <p className="text-xs text-slate-300 mt-1 font-sans">
            Sistem penilaian: Menang = 1, Remis = 0.5, Kalah = 0. Tiebreak: Buchholz.
          </p>
        </div>

        {/* Search tool */}
        <div className="relative">
          <input
            type="text"
            placeholder="Cari nama pemain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-64 bg-white/5 text-slate-100 placeholder-slate-400 text-sm font-sans px-4 py-2 pl-10 rounded-xl border border-white/10 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all"
            id="player-search"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 text-xs font-mono font-medium tracking-wider uppercase">
              <th className="py-3 px-4 text-center w-12">Pos</th>
              <th className="py-3 px-4">Nama Pemain</th>
              <th className="py-3 px-4 text-center">Rating</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Tanding</th>
              <th className="py-3 px-4 text-center">Buchholz</th>
              <th className="py-3 px-4 text-right">Poin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-sans">
            {filteredPlayers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  {players.length === 0
                    ? 'Belum ada pemain terdaftar. Silakan tambah pemain.'
                    : 'Pemain tidak ditemukan.'}
                </td>
              </tr>
            ) : (
              filteredPlayers.map((player, idx) => {
                const globalRank = idx + 1;
                const isPodium = globalRank <= 3;
                const matchesPlayed = player.opponentIds.filter(id => id !== 'BYE').length + player.byes;

                return (
                  <tr
                    key={player.id}
                    className={`hover:bg-white/5 transition-colors ${
                      isPodium ? 'bg-indigo-500/[0.025]' : ''
                    }`}
                  >
                    {/* Rank Pos */}
                    <td className="py-3.5 px-4 text-center">
                      {globalRank === 1 ? (
                        <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold font-mono">
                          🥇
                        </div>
                      ) : globalRank === 2 ? (
                        <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10 border border-white/20 text-slate-200 text-xs font-bold font-mono">
                          🥈
                        </div>
                      ) : globalRank === 3 ? (
                        <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-700/10 border border-indigo-700/20 text-indigo-400 text-xs font-bold font-mono">
                          🥉
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">{globalRank}</span>
                      )}
                    </td>

                    {/* Player Info */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => setSelectedPlayer(player)}
                        className="flex items-center gap-2 group/btn cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-indigo-505 rounded-xl p-0.5"
                        title="Klik untuk melihat riwayat pertandingan"
                      >
                        <div className="w-8 h-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden shrink-0 group-hover/btn:border-indigo-500/30 group-hover/btn:shadow-lg group-hover/btn:shadow-indigo-500/20 transition-all">
                          {player.photoUrl ? (
                            <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User className="w-4 h-4 group-hover/btn:scale-110 transition-transform text-slate-400 group-hover/btn:text-indigo-400" />
                          )}
                        </div>
                        <div className="flex flex-col items-start min-w-0">
                          <span className="font-semibold text-slate-200 text-sm group-hover/btn:text-indigo-300 group-hover/btn:underline decoration-indigo-500/50 decoration-2 underline-offset-4 transition-all truncate w-full">
                            {player.name}
                          </span>
                          {player.address && (
                            <span className="text-[10px] text-slate-400 font-sans truncate w-full max-w-[150px] leading-tight mt-0.5" title={player.address}>
                              {player.address}
                            </span>
                          )}
                        </div>
                      </button>
                    </td>

                    {/* Rating */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono text-xs text-slate-300 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                        {player.rating || 1200}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      {player.active ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> Aktif
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded ${
                          system === 'knockout'
                            ? 'bg-rose-550/10 text-rose-300 border border-rose-500/15'
                            : 'bg-white/5 text-slate-400 border border-white/10'
                        }`}>
                          {system === 'knockout' ? 'Gugur' : 'Absen'}
                        </span>
                      )}
                    </td>

                    {/* Matches played */}
                    <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-300">
                      {matchesPlayed}
                    </td>

                    {/* Buchholz Tiebreaks */}
                    <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-300">
                      {player.dynamicBuchholz.toFixed(1)}
                    </td>

                    {/* Score */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-mono text-sm font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-1 rounded-lg">
                        {player.score.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Player Match History Modal */}
      {selectedPlayer && (() => {
        const playerMatches = getPlayerMatches(selectedPlayer.id);
        
        let winsCount = 0;
        let lossesCount = 0;
        let drawsCount = 0;
        
        const preparedMatches = playerMatches.map(match => {
          let opponentName = '';
          let colorPlayed: 'Putih' | 'Hitam' | 'BYE' = 'Putih';
          let pointsEarned = 0;
          let outcomeText = 'Remis';
          let outcomeColorClass = 'bg-slate-500/10 border-slate-500/25 text-slate-300';
          
          if (match.whitePlayerId === selectedPlayer.id) {
            opponentName = match.blackPlayerName;
            colorPlayed = 'Putih';
            
            if (opponentName === 'BYE') {
              colorPlayed = 'BYE';
              pointsEarned = 1.0;
              outcomeText = 'Bye (1)';
              outcomeColorClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 font-bold';
              winsCount++;
            } else if (match.result === '1-0' || match.result === '1-0F') {
              pointsEarned = 1.0;
              outcomeText = 'Menang (1)';
              outcomeColorClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 font-bold';
              winsCount++;
            } else if (match.result === '0-1' || match.result === '0-1F') {
              pointsEarned = 0.0;
              outcomeText = 'Kalah (0)';
              outcomeColorClass = 'bg-rose-500/10 border-rose-500/20 text-rose-300';
              lossesCount++;
            } else if (match.result === '0.5-0.5') {
              pointsEarned = 0.5;
              outcomeText = 'Remis (0.5)';
              outcomeColorClass = 'bg-indigo-500/10 border-indigo-500/25 text-indigo-300';
              drawsCount++;
            } else {
              outcomeText = 'Tunda';
              outcomeColorClass = 'bg-white/5 border-white/10 text-slate-400';
            }
          } else {
            opponentName = match.whitePlayerName;
            colorPlayed = 'Hitam';
            
            if (opponentName === 'BYE') {
              colorPlayed = 'BYE';
              pointsEarned = 1.0;
              outcomeText = 'Bye (1)';
              outcomeColorClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 font-bold';
              winsCount++;
            } else if (match.result === '0-1' || match.result === '0-1F') {
              pointsEarned = 1.0;
              outcomeText = 'Menang (1)';
              outcomeColorClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 font-bold';
              winsCount++;
            } else if (match.result === '1-0' || match.result === '1-0F') {
              pointsEarned = 0.0;
              outcomeText = 'Kalah (0)';
              outcomeColorClass = 'bg-rose-500/10 border-rose-500/20 text-rose-300';
              lossesCount++;
            } else if (match.result === '0.5-0.5') {
              pointsEarned = 0.5;
              outcomeText = 'Remis (0.5)';
              outcomeColorClass = 'bg-indigo-500/10 border-indigo-500/25 text-indigo-300';
              drawsCount++;
            } else {
              outcomeText = 'Tunda';
              outcomeColorClass = 'bg-white/5 border-white/10 text-slate-400';
            }
          }
          
          return {
            round: match.round,
            opponentName,
            colorPlayed,
            pointsEarned,
            outcomeText,
            outcomeColorClass,
            isPending: match.result === 'pending'
          };
        });

        return (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[99999]">
            <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative overflow-hidden animate-fade-in animate-scale-in">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
                    <Award className="w-6 h-6 animate-pulse text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-100 font-sans tracking-tight">{selectedPlayer.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Rating: {selectedPlayer.rating || 1200} • Total Poin: {selectedPlayer.score.toFixed(1)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Match List Section */}
              <div className="mb-5">
                <h4 className="text-xs font-mono font-bold text-slate-400/80 uppercase tracking-wider mb-2 flex items-center gap-1.5 text-left">
                  <Swords className="w-3.5 h-3.5 text-indigo-400" /> Riwayat Pertandingan di Turnamen Ini
                </h4>
                
                <div className="max-h-72 overflow-y-auto rounded-2xl border border-white/5 bg-white/[0.015] divide-y divide-white/5">
                  {preparedMatches.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs font-mono">
                      Belum melakukan pertandingan di turnamen ini.
                    </div>
                  ) : (
                    preparedMatches.map((m, index) => (
                      <div key={index} className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors gap-4">
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-xs font-mono font-semibold bg-white/5 border border-white/10 text-slate-300 px-2.5 py-0.5 rounded-md">
                            R {m.round}
                          </span>
                          
                          {m.colorPlayed === 'BYE' ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 font-bold">
                              BYE
                            </span>
                          ) : m.colorPlayed === 'Putih' ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-slate-900 border border-slate-200 font-semibold">
                              Putih
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-250 border border-slate-700 font-semibold">
                              Hitam
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-semibold text-slate-200 truncate pr-2">
                            {m.opponentName === 'BYE' ? 'Mendapat BYE (Free Win 1 Poin)' : m.opponentName}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className={`text-xs px-2.5 py-1 rounded-lg border font-mono ${m.outcomeColorClass}`}>
                            {m.outcomeText}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Stats Summary Panel */}
              {preparedMatches.length > 0 && (
                <div className="grid grid-cols-4 gap-2 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="text-center">
                    <p className="text-[10px] font-mono text-slate-400/80 uppercase">Main</p>
                    <p className="text-lg font-bold text-slate-200 font-mono mt-0.5">{preparedMatches.length}</p>
                  </div>
                  <div className="text-center border-l border-white/5">
                    <p className="text-[10px] font-mono text-emerald-400/80 uppercase">Menang</p>
                    <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{winsCount}</p>
                  </div>
                  <div className="text-center border-l border-white/5">
                    <p className="text-[10px] font-mono text-rose-450 text-rose-400/80 uppercase">Kalah</p>
                    <p className="text-lg font-bold text-rose-450 text-rose-400 font-mono mt-0.5">{lossesCount}</p>
                  </div>
                  <div className="text-center border-l border-white/5">
                    <p className="text-[10px] font-mono text-indigo-400/80 uppercase">Remis</p>
                    <p className="text-lg font-bold text-indigo-400 font-mono mt-0.5">{drawsCount}</p>
                  </div>
                </div>
              )}

              {/* Close Button Footer */}
              <div className="flex justify-end mt-4 border-t border-white/5 pt-4">
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-lg shadow-indigo-600/20 font-sans"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
