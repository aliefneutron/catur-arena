import React, { useEffect, useState } from 'react';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { Tournament, GameType, GlobalPlayer } from './types';
import { collection, onSnapshot, setDoc, doc, writeBatch, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import {
  Trophy,
  Plus,
  Flame,
  Globe,
  RefreshCw,
  Search,
  Calendar,
  HelpCircle,
  Clock,
  Swords,
  ChevronRight,
  Info,
  Users,
  UserPlus,
  Trash2,
  Sparkles,
  Lock,
  Unlock,
  Phone,
  MapPin,
  Camera,
  Image
} from 'lucide-react';
import CreateTournamentModal from './components/CreateTournamentModal';
import TournamentDetail from './components/TournamentDetail';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [globalPlayers, setGlobalPlayers] = useState<GlobalPlayer[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [uuid, setUuid] = useState<string>(() => {
    const fallback = localStorage.getItem('arena_hub_guest_uuid');
    if (fallback) return fallback;
    const fresh = 'guest_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem('arena_hub_guest_uuid', fresh);
    return fresh;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [lobbyAlert, setLobbyAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const triggerLobbyAlert = (message: string, type: 'success' | 'error' = 'error') => {
    setLobbyAlert({ message, type });
    setTimeout(() => {
      setLobbyAlert(null);
    }, 4500);
  };

  // Administration Permissions and Login Flow States
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('chess_admin_logged_in') === 'true';
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrorState, setLoginErrorState] = useState('');

  const handleAdminLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loginPassword === 'admin123' || loginPassword === 'panitia123') {
      localStorage.setItem('chess_admin_logged_in', 'true');
      setIsAdmin(true);
      setShowLoginModal(false);
      setLoginPassword('');
      setLoginErrorState('');
      triggerLobbyAlert('Berhasil masuk sebagai Panitia/Admin!', 'success');
    } else {
      setLoginErrorState('Kata sandi salah! Silakan coba lagi.');
    }
  };

  // Self Player registration state helpers
  const [newRegName, setNewRegName] = useState('');
  const [newRegRating, setNewRegRating] = useState(1200);
  const [newRegPhone, setNewRegPhone] = useState('');
  const [newRegAddress, setNewRegAddress] = useState('');
  const [newRegPhoto, setNewRegPhoto] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regError, setRegError] = useState('');
  const [searchPlayerQuery, setSearchPlayerQuery] = useState('');
  const [selectedLobbyPlayer, setSelectedLobbyPlayer] = useState<GlobalPlayer | null>(null);

  const handlePhotoUploadBase64 = (file: File, callback: (base64: string) => void) => {
    if (!file) return;
    if (file.size > 800000) { // Limit to ~800KB for Firestore constraints
      alert('Ukuran berkas foto terlalu besar! Harap gunakan gambar di bawah 800KB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      callback(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 1. Monitor Authentication State of the client
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUuid(user.uid);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. Real-time Subscription to the general Chess Tournaments catalog
  useEffect(() => {
    const unsubscribeTourneys = onSnapshot(
      collection(db, 'tournaments'),
      (snapshot) => {
        const list: Tournament[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Tournament);
        });
        // Sort: newest first
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTournaments(list);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'tournaments');
      }
    );

    return () => {
      unsubscribeTourneys();
    };
  }, []);

  // 3. Subscription to Global Registered Player Pool
  useEffect(() => {
    const unsubscribePlayers = onSnapshot(
      collection(db, 'players'),
      (snapshot) => {
        const list: GlobalPlayer[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as GlobalPlayer);
        });
        // Sort: newest registered first
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setGlobalPlayers(list);
        setLoadingPlayers(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'players');
      }
    );

    return () => {
      unsubscribePlayers();
    };
  }, []);

  // Public Online Player self-registration handler
  const handleRegisterPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegName.trim()) {
      setRegError('Nama lengkap pecatur harus diisi.');
      return;
    }
    const playerId = 'player_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    try {
      await setDoc(doc(db, 'players', playerId), {
        id: playerId,
        name: newRegName.trim(),
        rating: Math.max(100, Math.min(3500, newRegRating)),
        createdAt: new Date().toISOString(),
        phone: newRegPhone.trim() || '',
        address: newRegAddress.trim() || '',
        photoUrl: newRegPhoto || '',
      });
      setRegSuccess(`Sukses! Pecatur "${newRegName.trim()}" telah terdaftar di pool utama.`);
      setNewRegName('');
      setNewRegRating(1200);
      setNewRegPhone('');
      setNewRegAddress('');
      setNewRegPhoto('');
      setRegError('');
      setTimeout(() => setRegSuccess(''), 3000);
    } catch (err: any) {
      setRegError(`Gagal melakukan pendaftaran: ${err?.message || err}`);
    }
  };

  // Helper to remove any player entry from global pool
  const handleDeleteGlobalPlayer = async (playerId: string) => {
    try {
      await deleteDoc(doc(db, 'players', playerId));
    } catch (err: any) {
      alert(`Gagal menghapus: ${err?.message || err}`);
    }
  };

  // Creation Handler
  const handleCreateTournament = async (
    name: string,
    gameType: GameType,
    totalRounds: number,
    system: 'swiss' | 'knockout',
    selectedPlayerIds: string[],
    regStartDate?: string,
    regEndDate?: string
  ) => {
    const tourneyId = 'tourney_' + Math.random().toString(36).substr(2, 9);
    const newTourneyDoc = doc(db, 'tournaments', tourneyId);
    
    let rootCreated = false;
    try {
      await setDoc(newTourneyDoc, {
        id: tourneyId,
        name,
        gameType,
        status: 'registration',
        currentRound: 0,
        totalRounds,
        system,
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser?.uid || uuid,
        regStartDate: regStartDate || '',
        regEndDate: regEndDate || '',
      });
      rootCreated = true;

      // Write selected players from lobby pool into the subcollection
      if (selectedPlayerIds.length > 0) {
        const batch = writeBatch(db);
        selectedPlayerIds.forEach((pId) => {
          const found = globalPlayers.find(gp => gp.id === pId);
          if (found) {
            const subPlayerDoc = doc(db, 'tournaments', tourneyId, 'players', pId);
            batch.set(subPlayerDoc, {
              id: pId,
              name: found.name,
              rating: found.rating,
              score: 0,
              tiebreaks: 0,
              opponentIds: [],
              colorHistory: [],
              active: true,
              byes: 0,
            });
          }
        });
        await batch.commit();
      }

      // Create initial notification log
      const notifRef = doc(collection(db, 'tournaments', tourneyId, 'notifications'));
      await setDoc(notifRef, {
        id: notifRef.id,
        title: 'Turnamen Dibuat',
        message: `Turnamen catur "${name}" menggunakan ${system === 'swiss' ? 'Sistem Swiss' : 'Sistem Gugur (Knockout)'} sukses diaktivasi dengan ${selectedPlayerIds.length} pecatur terpilih!`,
        type: 'info',
        createdAt: new Date().toISOString(),
      });

    } catch (err) {
      console.error('Error creating tournament sub-collections:', err);
      if (!rootCreated) {
        handleFirestoreError(err, OperationType.WRITE, `tournaments/${tourneyId}`);
      }
    } finally {
      if (rootCreated) {
        setIsCreateOpen(false);
        setSelectedTournamentId(tourneyId);
      }
    }
  };

  // Deletion Handler
  const handleDeleteTournament = async (tourneyId: string) => {
    setDeleteConfirmId(tourneyId);
  };

  const filteredTournaments = tournaments.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white relative">
      {/* Custom Confirmation Modal for Deleting Tournament in Lobby */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden animate-fade-in animate-scale-in">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start gap-4 mb-5">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100 font-sans">Hapus Turnamen Permanen?</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Semua data pertandingan, pencatatan pemain, skor, dan riwayat di dalam turnamen ini akan dihapus secara permanen dari server Cloud. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-white/5 border border-white/10 text-slate-350 hover:bg-white/10 hover:text-white rounded-xl text-xs transition-all cursor-pointer font-sans"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  const targetId = deleteConfirmId;
                  setDeleteConfirmId(null);
                  try {
                    await deleteDoc(doc(db, 'tournaments', targetId));
                    if (selectedTournamentId === targetId) {
                      setSelectedTournamentId(null);
                    }
                    triggerLobbyAlert('Turnamen berhasil dihapus dari database Cloud.', 'success');
                  } catch (err: any) {
                    triggerLobbyAlert(`Gagal menghapus turnamen: ${err?.message || err}`, 'error');
                  }
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-lg shadow-rose-600/15 font-sans"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Lobby Status Alert */}
      {lobbyAlert && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 p-4 rounded-2xl border flex items-center justify-between gap-3 text-sm z-[9999] shadow-2xl animate-fade-in ${
          lobbyAlert.type === 'error'
            ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
        }`}>
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-indigo-400 shrink-0" />
            <span>{lobbyAlert.message}</span>
          </div>
          <button onClick={() => setLobbyAlert(null)} className="text-xs text-slate-400 hover:text-white hover:underline transition-colors cursor-pointer ml-4">
            Tutup
          </button>
        </div>
      )}

      {/* Mesh Gradient Background Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Top Navigation Frame */}
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="w-full mx-auto px-4 sm:px-6 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer z-10" onClick={() => setSelectedTournamentId(null)}>
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold font-sans tracking-tight text-slate-100 block">
                Catur Arena
              </span>
              <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block font-bold font-sans">
                Real Time Chess Pairing System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 z-10">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-full bg-white/5 text-slate-300 border border-white/10 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Firebase
            </span>

            {isAdmin ? (
              <button
                onClick={() => {
                  localStorage.removeItem('chess_admin_logged_in');
                  setIsAdmin(false);
                  triggerLobbyAlert('Berhasil keluar dari sesi Admin.', 'success');
                }}
                className="px-3.5 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-xl active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-500/5 focus:outline-none focus:ring-1 focus:ring-rose-505"
                title="Keluar dari mode admin"
              >
                <Lock className="w-3.5 h-3.5 text-rose-450" /> Keluar Admin
              </button>
            ) : (
              <button
                onClick={() => {
                  setLoginErrorState('');
                  setLoginPassword('');
                  setShowLoginModal(true);
                }}
                className="px-3.5 py-1.5 bg-indigo-605 bg-indigo-600/20 hover:bg-indigo-605 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/5 focus:outline-none"
                title="Masuk sebagai admin/panitia"
              >
                <Unlock className="w-3.5 h-3.5 text-indigo-400" /> Login Admin
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Core Body */}
      <main className="flex-grow relative z-10">
        <AnimatePresence mode="wait">
          {selectedTournamentId ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <TournamentDetail
                tournamentId={selectedTournamentId}
                onBack={() => setSelectedTournamentId(null)}
                userUuid={uuid}
                isAdmin={isAdmin}
                onTriggerLogin={() => {
                  setLoginErrorState('Akses panitia membutuhkan login. Silakan masukkan kata sandi panitia.');
                  setLoginPassword('');
                  setShowLoginModal(true);
                }}
                onTriggerLogout={() => {
                  localStorage.removeItem('chess_admin_logged_in');
                  setIsAdmin(false);
                  triggerLobbyAlert('Berhasil keluar dari sesi Admin.', 'success');
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full mx-auto px-4 sm:px-6 md:px-8 py-8"
            >
              {/* Hero Banner Section */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 mb-10 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

                <div className="relative z-10 max-w-3xl space-y-4">
                  <span className="px-3 py-1 bg-indigo-500/10 text-indigo-300 font-mono text-[11px] rounded-full uppercase tracking-wider border border-indigo-500/15 inline-block">
                    ♟️ Turnamen Catur Real Time
                  </span>
                  <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight text-white leading-tight">
                    Percasi Kabupaten Sumenep
                  </h1>
                  <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl font-sans">
                    Sistem pairing otomatis, leaderboard real-time, dan log pengumuman hasil pertandingan instan yang terintegrasi penuh dengan Firebase Cloud Database.
                  </p>
                  
                  {isAdmin && (
                    <div className="pt-2 animate-fade-in">
                      <button
                        onClick={() => setIsCreateOpen(true)}
                        className="px-6 py-3 bg-indigo-600 text-white font-bold hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 active:scale-95 transition-all text-sm flex items-center gap-2 cursor-pointer"
                        id="launch-create-tournament-btn"
                      >
                        <Plus className="w-5 h-5 text-white stroke-[3]" /> Mulai Turnamen Baru
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Tournament Grid Header & Search tools */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-200 font-sans">
                    Daftar Turnamen Aktif
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 font-sans">
                    Pilih turnamen di bawah ini untuk melihat hasil papan main, klasemen, dan detail pertandingan.
                  </p>
                </div>

                <div className="relative flex-shrink-0">
                  <input
                    type="text"
                    placeholder="Cari turnamen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full md:w-80 bg-white/5 border border-white/10 text-slate-100 placeholder-slate-400 text-sm font-sans px-4 py-2.5 pl-10 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all font-sans"
                    id="search-tournaments"
                  />
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Tournament Cards Grid */}
              {loading ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mb-3" />
                  <p className="text-xs font-sans">Sedang melacak daftar turnamen di Firestore...</p>
                </div>
              ) : filteredTournaments.length === 0 ? (
                <div className="border border-white/10 bg-white/5 backdrop-blur-xl rounded-3xl p-12 text-center text-slate-400 max-w-xl mx-auto flex flex-col items-center justify-center shadow-lg">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-full mb-3 text-indigo-400">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <h3 className="font-semibold text-slate-200 text-sm font-sans mb-1">
                    Tidak Ada Turnamen Catur
                  </h3>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed mb-4">
                    Belum terdapat turnamen terdaftar di database atau tidak sesuai pencarian kata kunci Anda.
                  </p>
                  {isAdmin && (
                    <button
                      onClick={() => setIsCreateOpen(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white border border-white/10 text-xs font-sans font-semibold rounded-xl active:scale-95 transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer"
                    >
                      Mulai Turnamen
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="tournament-cards-grid">
                  {filteredTournaments.map((t) => {
                    const statusConfig = {
                      registration: {
                        label: 'Pendaftaran',
                        colorClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
                      },
                      active: {
                        label: 'Berlangsung',
                        colorClass: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 animate-pulse',
                      },
                      completed: {
                        label: 'Selesai',
                        colorClass: 'bg-white/5 text-slate-400 border-white/10',
                      },
                    };
                    const status = statusConfig[t.status] || statusConfig.registration;

                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTournamentId(t.id)}
                        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group flex flex-col justify-between hover:shadow-2xl relative overflow-hidden"
                        id={`tournament-card-${t.id}`}
                      >
                        <div>
                          {/* Banner Info Top Row */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex gap-1.5 items-center">
                              <span className={`px-2.5 py-0.5 text-[10px] font-mono rounded-full border uppercase tracking-wider ${status.colorClass}`}>
                                {status.label}
                              </span>
                              <span className="px-2 py-0.5 text-[9px] font-sans font-semibold rounded-full bg-indigo-550/15 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 uppercase">
                                {t.system === 'knockout' ? 'Gugur' : 'Swiss'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-slate-300 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">
                                {t.gameType}
                              </span>
                              {isAdmin && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTournament(t.id);
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus Turnamen"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <h3 className="text-lg font-bold text-slate-100 font-sans tracking-tight group-hover:text-indigo-400 transition-colors line-clamp-1 mb-2">
                            {t.name}
                          </h3>

                          {/* Quick details */}
                          <div className="space-y-2 mt-4 text-xs font-sans text-slate-300 border-t border-white/5 pt-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                              <span>{t.system === 'knockout' ? 'Sistem Gugur' : `Ronde Target: ${t.totalRounds} Ronde`}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-indigo-400" />
                              <span>
                                {t.status === 'registration'
                                  ? 'Menunggu registrasi pemain'
                                  : `Selesai Babak ${t.currentRound} ${t.system === 'swiss' ? `dari ${t.totalRounds}` : ''}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-300 group-hover:text-white transition-colors font-sans font-semibold">
                          <span>Buka Dashboard Turnamen</span>
                          <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Persistent Info Card Footer */}
      <footer className="border-t border-white/10 bg-white/5 backdrop-blur-md py-4 text-center text-xs text-slate-400 font-sans leading-relaxed relative z-10 mt-12">
        <div className="w-full mx-auto px-4 sm:px-6 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="max-w-md md:text-left">
            Sistem Manajemen Turnamen Catur Secara Real Time
          </p>
          <div className="text-sky-400 font-semibold font-mono text-[10px] uppercase tracking-wider">
            Created by Alief Neutron 2026
          </div>
        </div>
      </footer>

      {/* Creation Modal Element */}
      <AnimatePresence>
        {isCreateOpen && (
          <CreateTournamentModal
            onClose={() => setIsCreateOpen(false)}
            onCreate={handleCreateTournament}
            globalPlayers={globalPlayers}
          />
        )}
      </AnimatePresence>

      {/* Admin Login Modal Overlay */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[99999]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-900 border border-white/10 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                    <Unlock className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100 font-sans tracking-tight">Login Panitia (Admin)</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Otorisasi Manajemen Turnamen</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="p-1 px-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer font-sans"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs text-slate-350 leading-relaxed font-sans mb-4 border-b border-white/5 pb-4 text-left">
                <p>Silakan masuk ke mode panitia untuk mengaktifkan pengaturan pemasangan meja (Pairing Swiss), pendaftaran pecatur, dan entri hasil pertandingan.</p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="text-left">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Kata Sandi</label>
                  <input
                    type="password"
                    required
                    autoFocus
                    placeholder="Masukkan sandi..."
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setLoginErrorState('');
                    }}
                    className="w-full bg-white/5 border border-white/10 text-slate-100 placeholder-slate-500 text-sm font-sans px-3 py-2.5 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all"
                  />
                  {loginErrorState && (
                    <p className="text-[11px] text-rose-450 text-rose-400 font-mono font-medium mt-1.5 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded-lg">
                      {loginErrorState}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(false)}
                    className="px-4 py-2 hover:bg-white/5 border border-transparent hover:border-white/5 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-indigo-600/25 cursor-pointer"
                  >
                    Masuk Sesi
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Player Detail Card Modal Overlay */}
      <AnimatePresence>
        {selectedLobbyPlayer && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[99999]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-900 border border-white/10 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden text-left"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex justify-between items-start mb-4 shrink-0">
                <h3 className="text-base font-bold text-slate-100 font-sans tracking-tight">Detail Profil Pendaftaran</h3>
                <button
                  type="button"
                  onClick={() => setSelectedLobbyPlayer(null)}
                  className="p-1 px-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer font-sans"
                >
                  ✕
                </button>
              </div>

              {/* Profile Photo Display */}
              <div className="flex flex-col items-center text-center gap-2 border-b border-white/5 pb-4 mb-4 select-none">
                <div className="w-20 h-20 rounded-full border border-white/15 bg-white/5 overflow-hidden flex items-center justify-center shadow-md">
                  {selectedLobbyPlayer.photoUrl ? (
                    <img src={selectedLobbyPlayer.photoUrl} alt={selectedLobbyPlayer.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-2xl font-bold text-slate-300 font-sans uppercase">
                      {selectedLobbyPlayer.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-100 mt-1 font-sans">{selectedLobbyPlayer.name}</h4>
                  <span className="inline-block mt-1 text-[11px] font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-0.5 rounded-full">
                    Rating: {selectedLobbyPlayer.rating} ELO
                  </span>
                </div>
              </div>

              {/* Personal details fields: Alamat & WhatsApp */}
              <div className="space-y-4 font-sans text-xs">
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 font-bold">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    No. Handphone / WhatsApp
                  </div>
                  <div className="bg-white/5 border border-white/5 px-3 py-2.5 rounded-xl text-slate-200 font-mono font-medium flex justify-between items-center">
                    <span>{selectedLobbyPlayer.phone || 'Tidak dicantumkan'}</span>
                    {selectedLobbyPlayer.phone && (
                      <a
                        href={`https://wa.me/${selectedLobbyPlayer.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded transition-all font-sans font-bold"
                      >
                        Hubungi via WA
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 font-bold">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    Alamat Domisili Lengkap
                  </div>
                  <div className="bg-white/5 border border-white/5 px-3 py-2.5 rounded-xl text-slate-200 leading-relaxed max-h-32 overflow-y-auto">
                    {selectedLobbyPlayer.address || 'Tidak dicantumkan'}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-5">
                <button
                  type="button"
                  onClick={() => setSelectedLobbyPlayer(null)}
                  className="w-full px-5 py-2.5 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer text-center border border-white/5"
                >
                  Tutup Detail
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
