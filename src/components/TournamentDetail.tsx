import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Tournament, Player, Match, Notification, GameType, MatchResult } from '../types';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  query,
  orderBy,
  limit,
  deleteDoc,
} from 'firebase/firestore';
import {
  Users,
  Play,
  ArrowRight,
  UserPlus,
  Compass,
  CheckCircle,
  Volume2,
  Trash2,
  ChevronRight,
  Lock,
  Unlock,
  AlertTriangle,
  Award,
  RefreshCw,
  Phone,
  MapPin,
  Camera,
  Image,
  Eye,
  Calendar

} from 'lucide-react';
import Leaderboard from './Leaderboard';
import ActiveMatches from './ActiveMatches';
import NotificationsFeed from './NotificationsFeed';
import { generateSwissPairings, generateKnockoutPairings } from '../pairing';

// Synthesizer beep for real-time announcements
function playChime() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Play dual notes for an elegant chord effect
    const playNote = (freq: number, start: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      
      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    const now = audioCtx.currentTime;
    playNote(523.25, now, 0.45); // C5
    playNote(659.25, now + 0.1, 0.4); // E5
  } catch (error) {
    console.warn('Audio Context is not allowed before user interaction:', error);
  }
}

interface TournamentDetailProps {
  tournamentId: string;
  onBack: () => void;
  userUuid: string;
  isAdmin: boolean;
  onTriggerLogin: () => void;
  onTriggerLogout: () => void;
}

export default function TournamentDetail({
  tournamentId,
  onBack,
  userUuid,
  isAdmin,
  onTriggerLogin,
  onTriggerLogout
}: TournamentDetailProps) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'matches' | 'leaderboard' | 'players' | 'notifications'>('matches');
  
  // Registration States
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRating, setNewPlayerRating] = useState(1200);
  const [newPlayerPhone, setNewPlayerPhone] = useState('');
  const [newPlayerAddress, setNewPlayerAddress] = useState('');
  const [newPlayerPhoto, setNewPlayerPhoto] = useState('');
  const [selectedSubPlayer, setSelectedSubPlayer] = useState<Player | null>(null);
  const [selectedSubPlayerTab, setSelectedSubPlayerTab] = useState<'matches' | 'info'>('matches');
  
  // Registration Period States
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [updateDateError, setUpdateDateError] = useState('');

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (tournament) {
      setNewStartDate(tournament.regStartDate || '');
      setNewEndDate(tournament.regEndDate || '');
    }
  }, [tournament?.regStartDate, tournament?.regEndDate]);
  
  const todayStr = getLocalDateString();
  const regStartDate = tournament?.regStartDate || '';
  const regEndDate = tournament?.regEndDate || '';
  const isRegNotStartedYet = regStartDate && todayStr < regStartDate;
  const isRegEnded = regEndDate && todayStr > regEndDate;
  const isRegistrationAllowed = !isRegNotStartedYet && !isRegEnded;
  
  // Custom Modals / Overlays/ Banners instead of blocking window.confirm / window.alert
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [alertBanner, setAlertBanner] = useState<{ type: 'error' | 'success' | 'info' | 'warning'; message: string } | null>(null);

  const triggerAlert = (message: string, type: 'error' | 'success' | 'info' | 'warning' = 'error') => {
    setAlertBanner({ type, message });
    setTimeout(() => {
      setAlertBanner(null);
    }, 4000);
  };
  
  // Notification logs state for play notifications
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);

  // Firestore Real-time listener
  useEffect(() => {
    // 1. Listen to Tournament Header
    const unsubTournament = onSnapshot(
      doc(db, 'tournaments', tournamentId),
      (snapshot) => {
        if (snapshot.exists()) {
          setTournament({ id: snapshot.id, ...snapshot.data() } as Tournament);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `tournaments/${tournamentId}`);
      }
    );

    // 2. Listen to registered Players
    const unsubPlayers = onSnapshot(
      collection(db, 'tournaments', tournamentId, 'players'),
      (snapshot) => {
        const playerList: Player[] = [];
        snapshot.forEach((doc) => {
          playerList.push({ id: doc.id, ...doc.data() } as Player);
        });
        setPlayers(playerList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `tournaments/${tournamentId}/players`);
      }
    );

    // 3. Listen to Matches
    const unsubMatches = onSnapshot(
      collection(db, 'tournaments', tournamentId, 'matches'),
      (snapshot) => {
        const matchList: Match[] = [];
        snapshot.forEach((doc) => {
          matchList.push({ id: doc.id, ...doc.data() } as Match);
        });
        setMatches(matchList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `tournaments/${tournamentId}/matches`);
      }
    );

    // 4. Listen to Notifications sorted chronologically descending
    const unsubNotifs = onSnapshot(
      collection(db, 'tournaments', tournamentId, 'notifications'),
      (snapshot) => {
        const notifList: Notification[] = [];
        snapshot.forEach((doc) => {
          notifList.push({ id: doc.id, ...doc.data() } as Notification);
        });
        notifList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        setNotifications(notifList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `tournaments/${tournamentId}/notifications`);
      }
    );

    return () => {
      unsubTournament();
      unsubPlayers();
      unsubMatches();
      unsubNotifs();
    };
  }, [tournamentId]);

  // Chime trigger on new notification
  useEffect(() => {
    if (notifications.length > 0) {
      const newestNotif = notifications[0];
      if (lastNotificationId && newestNotif.id !== lastNotificationId) {
        playChime();
      }
      setLastNotificationId(newestNotif.id);
    }
  }, [notifications]);

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] text-slate-350">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
        <p className="font-sans text-sm">Menghubungkan ke database panitia...</p>
      </div>
    );
  }

  const handlePhotoUploadBase64 = (file: File, callback: (base64: string) => void) => {
    if (!file) return;
    if (file.size > 800 * 1024) {
      triggerAlert('Ukuran foto terlalu besar! Maksimal 800 KB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      callback(reader.result as string);
    };
    reader.onerror = () => {
      triggerAlert('Gagal membaca gambar.', 'error');
    };
    reader.readAsDataURL(file);
  };

  // Update registration dates
  const handleUpdateRegistrationDates = async () => {
    if (newStartDate && newEndDate && newEndDate < newStartDate) {
      setUpdateDateError('Batas akhir pendaftaran tidak boleh sebelum tanggal mulai.');
      return;
    }
    try {
      await updateDoc(doc(db, 'tournaments', tournamentId), {
        regStartDate: newStartDate,
        regEndDate: newEndDate,
      });
      setIsEditingDates(false);
      setUpdateDateError('');
      triggerAlert('Periode pendaftaran berhasil diperbarui!', 'success');
    } catch (err: any) {
      triggerAlert(`Gagal memperbarui periode pendaftaran: ${err?.message || err}`);
    }
  };

  // Add a single custom player
  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    const pId = 'player_' + Math.random().toString(36).substr(2, 9);
    await setDoc(doc(db, 'tournaments', tournamentId, 'players', pId), {
      id: pId,
      name: newPlayerName.trim(),
      rating: newPlayerRating || 1200,
      score: 0.0,
      tiebreaks: 0.0,
      opponentIds: [],
      colorHistory: [],
      active: true,
      byes: 0,
      phone: newPlayerPhone.trim() || undefined,
      address: newPlayerAddress.trim() || undefined,
      photoUrl: newPlayerPhoto || undefined,
    });

    // Log notification
    const notifRef = doc(collection(db, 'tournaments', tournamentId, 'notifications'));
    await setDoc(notifRef, {
      id: notifRef.id,
      title: 'Pemain Terdaftar',
      message: `${newPlayerName.trim()} (${newPlayerRating || 1200}) resmi didaftarkan.`,
      type: 'info',
      createdAt: new Date().toISOString(),
    });

    setNewPlayerName('');
    setNewPlayerRating(1200);
    setNewPlayerPhone('');
    setNewPlayerAddress('');
    setNewPlayerPhoto('');
  };

  // Remove player during registration
  const handleDeletePlayer = async (playerId: string, name: string) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'tournaments', tournamentId, 'players', playerId));
    
    // Log deletion notifier
    const notifRef = doc(collection(db, 'tournaments', tournamentId, 'notifications'));
    batch.set(notifRef, {
      id: notifRef.id,
      title: 'Pecatur Undur Diri',
      message: `${name} dihapus dari daftar registrasi.`,
      type: 'info',
      createdAt: new Date().toISOString(),
    });

    await batch.commit();
  };

  // Withdraw player during active tournament (mark as inactive)
  const handleTogglePlayerStatus = async (playerId: string, name: string, currentlyActive: boolean) => {
    await updateDoc(doc(db, 'tournaments', tournamentId, 'players', playerId), {
      active: !currentlyActive,
    });

    const notifRef = doc(collection(db, 'tournaments', tournamentId, 'notifications'));
    await setDoc(notifRef, {
      id: notifRef.id,
      title: currentlyActive ? 'Pecatur Absen/Mundur' : 'Pecatur Kembali Aktif',
      message: `${name} telah ${currentlyActive ? 'mengundurkan diri/absen' : 'bergabung kembali'} dari sisa ronde turnamen.`,
      type: 'info',
      createdAt: new Date().toISOString(),
    });
  };

  // Start the tournament, generating pairings for Round 1
  const handleStartTournament = async () => {
    if (players.length < 2) {
      triggerAlert('Dibutuhkan minimal 2 pemain untuk memulai turnamen.', 'error');
      return;
    }

    try {
      const isKnockout = tournament.system === 'knockout';
      const { pairings, updatedPlayersWithBye } = isKnockout
        ? generateKnockoutPairings(players, 1)
        : generateSwissPairings(players, 1);
      const batch = writeBatch(db);

      // Save matches
      pairings.forEach((match) => {
        const matchId = `${tournamentId}_round1_table${match.tableNumber}`;
        const matchDocRef = doc(db, 'tournaments', tournamentId, 'matches', matchId);
        batch.set(matchDocRef, {
          ...match,
          id: matchId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // For non-bye matches, append opponents to player color/history profile
        if (match.blackPlayerId !== 'BYE' && match.whitePlayerId !== 'BYE') {
          const whiteRef = doc(db, 'tournaments', tournamentId, 'players', match.whitePlayerId);
          const blackRef = doc(db, 'tournaments', tournamentId, 'players', match.blackPlayerId);
          
          const whitePlayer = players.find((p) => p.id === match.whitePlayerId);
          const blackPlayer = players.find((p) => p.id === match.blackPlayerId);

          if (whitePlayer && blackPlayer) {
            batch.update(whiteRef, {
              opponentIds: [...(whitePlayer.opponentIds || []), blackPlayer.id],
              colorHistory: [...(whitePlayer.colorHistory || []), 'white'],
            });
            batch.update(blackRef, {
              opponentIds: [...(blackPlayer.opponentIds || []), whitePlayer.id],
              colorHistory: [...(blackPlayer.colorHistory || []), 'black'],
            });
          }
        }
      });

      // Award automatic 1 point to bye player if any
      if (updatedPlayersWithBye) {
        const byePlayer = players.find((p) => p.id === updatedPlayersWithBye);
        if (byePlayer) {
          const byePlayerRef = doc(db, 'tournaments', tournamentId, 'players', updatedPlayersWithBye);
          batch.update(byePlayerRef, {
            byes: (byePlayer.byes || 0) + 1,
            score: byePlayer.score + 1.0,
            opponentIds: [...(byePlayer.opponentIds || []), 'BYE'],
          });
        }
      }

      // Progress tournament status
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      const updatePayload: any = {
        status: 'active',
        currentRound: 1,
      };
      if (isKnockout) {
        updatePayload.totalRounds = Math.max(1, Math.ceil(Math.log2(players.length)));
      }
      batch.update(tournamentRef, updatePayload);

      // Create notification log
      const notifRef = doc(collection(db, 'tournaments', tournamentId, 'notifications'));
      batch.set(notifRef, {
        id: notifRef.id,
        title: 'Turnamen Dimulai! Babak 1',
        message: isKnockout
          ? `Babak 1 sistem Gugur (Knockout) resmi dimulai untuk ${players.length} pecatur handal!`
          : `Ronde 1 sistem Swiss resmi dimulai untuk ${players.length} pecatur handal!`,
        type: 'round_started',
        createdAt: new Date().toISOString(),
      });

      await batch.commit();
      setActiveTab('matches');
    } catch (err: any) {
      console.error(err);
      triggerAlert(`Terjadi kesalahan saat mengacak pairing: ${err?.message || err}`, 'error');
    }
  };

  // Recalculates all player scores and tiebreaks dynamically from match documents
  const recalculateAndSyncScores = async (updatedMatches: Match[]) => {
    try {
      const isKnockout = tournament.system === 'knockout';
      const updatedPlayers = players.map((player) => {
        let score = 0;
        let byes = 0;
        let active = player.active !== undefined ? player.active : true;

        if (isKnockout) {
          active = true; // evaluate fresh based on losses
        }

        // Cumulative point aggregations
        updatedMatches.forEach((m) => {
          if (m.whitePlayerId === player.id) {
            if (m.blackPlayerId === 'BYE') {
              score += 1.0;
              byes += 1;
            } else if (m.result === '1-0' || m.result === '1-0F') {
              score += 1.0;
            } else if (m.result === '0.5-0.5') {
              score += 0.5;
            } else if (isKnockout && (m.result === '0-1' || m.result === '0-1F')) {
              active = false;
            }
          } else if (m.blackPlayerId === player.id) {
            if (m.result === '0-1' || m.result === '0-1F') {
              score += 1.0;
            } else if (m.result === '0.5-0.5') {
              score += 0.5;
            } else if (isKnockout && (m.result === '1-0' || m.result === '1-0F')) {
              active = false;
            }
          }
        });

        return { ...player, score, byes, active };
      });

      // Bulk update player scores in Firestore to sync to everyone instantly
      const batch = writeBatch(db);
      updatedPlayers.forEach((p) => {
        const ref = doc(db, 'tournaments', tournamentId, 'players', p.id);
        batch.update(ref, {
          score: p.score,
          byes: p.byes,
          active: p.active,
        });
      });
      await batch.commit();
    } catch (err) {
      console.error('Error during score syncing calculation:', err);
    }
  };

  // Record a score on a match
  const handleRecordMatchResult = async (matchId: string, result: MatchResult) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    // Update match document
    const matchRef = doc(db, 'tournaments', tournamentId, 'matches', matchId);
    await updateDoc(matchRef, {
      result,
      updatedAt: new Date().toISOString(),
    });

    const refreshedMatches = matches.map((m) => (m.id === matchId ? { ...m, result } : m));
    await recalculateAndSyncScores(refreshedMatches);

    // Create a real-time global notification
    let resultMessage = '';
    if (result === '1-0') {
      resultMessage = `Kemenangan Putih (${match.whitePlayerName}) melawan Hitam (${match.blackPlayerName}).`;
    } else if (result === '0-1') {
      resultMessage = `Kemenangan Hitam (${match.blackPlayerName}) melawan Putih (${match.whitePlayerName}).`;
    } else if (result === '0.5-0.5') {
      resultMessage = `Hasil Remis (½-½) antara ${match.whitePlayerName} vs ${match.blackPlayerName}.`;
    }

    const notifRef = doc(collection(db, 'tournaments', tournamentId, 'notifications'));
    await setDoc(notifRef, {
      id: notifRef.id,
      title: `Hasil Meja Papan: ${match.whitePlayerName} vs ${match.blackPlayerName}`,
      message: `${resultMessage}`,
      type: 'match_result',
      createdAt: new Date().toISOString(),
    });
  };

  // Clear/Reset a match score back to pending
  const handleClearMatchResult = async (matchId: string) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    const matchRef = doc(db, 'tournaments', tournamentId, 'matches', matchId);
    await updateDoc(matchRef, {
      result: 'pending',
      updatedAt: new Date().toISOString(),
    });

    const refreshedMatches = matches.map((m) => (m.id === matchId ? { ...m, result: 'pending' as MatchResult } : m));
    await recalculateAndSyncScores(refreshedMatches);

    const notifRef = doc(collection(db, 'tournaments', tournamentId, 'notifications'));
    await setDoc(notifRef, {
      id: notifRef.id,
      title: 'Skor Direvisi',
      message: `Panitia merevisi hasil skor meja pertandingan antara ${match.whitePlayerName} vs ${match.blackPlayerName}.`,
      type: 'info',
      createdAt: new Date().toISOString(),
    });
  };

  // Advance to the next round of Swiss pairings
  const handleNextRound = async () => {
    // 1. Verify all active matches in the current round are completed (no pending)
    const currentRoundMatches = matches.filter((m) => m.round === tournament.currentRound);
    const incomplete = currentRoundMatches.some((m) => m.result === 'pending');

    if (incomplete) {
      triggerAlert('Maju ronde ditolak. Tolong catat seluruh hasil tanding babak aktif terlebih dahulu.', 'error');
      return;
    }

    const isKnockout = tournament.system === 'knockout';
    const activePlayersCount = players.filter((p) => p.active).length;

    if (isKnockout && activePlayersCount <= 1) {
      triggerAlert('Maju babak ditolak. Sistem Gugur telah melahirkan juara tunggal! Silakan klik "Selesaikan Turnamen".', 'warning');
      return;
    }

    if (!isKnockout && tournament.currentRound >= tournament.totalRounds) {
      triggerAlert('Batas ronde tercapai. Silakan pilih "Selesaikan Turnamen".', 'warning');
      return;
    }

    const nextRoundNumber = tournament.currentRound + 1;

    try {
      // Re-fetch latest from local state
      const { pairings, updatedPlayersWithBye } = isKnockout
        ? generateKnockoutPairings(players, nextRoundNumber)
        : generateSwissPairings(players, nextRoundNumber);
      const batch = writeBatch(db);

      // Save matches
      pairings.forEach((match) => {
        const matchId = `${tournamentId}_round${nextRoundNumber}_table${match.tableNumber}`;
        const matchDocRef = doc(db, 'tournaments', tournamentId, 'matches', matchId);
        batch.set(matchDocRef, {
          ...match,
          id: matchId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // Update opponents lists immediately
        if (match.blackPlayerId !== 'BYE' && match.whitePlayerId !== 'BYE') {
          const whiteRef = doc(db, 'tournaments', tournamentId, 'players', match.whitePlayerId);
          const blackRef = doc(db, 'tournaments', tournamentId, 'players', match.blackPlayerId);

          const whitePlayer = players.find((p) => p.id === match.whitePlayerId);
          const blackPlayer = players.find((p) => p.id === match.blackPlayerId);

          if (whitePlayer && blackPlayer) {
            batch.update(whiteRef, {
              opponentIds: [...(whitePlayer.opponentIds || []), blackPlayer.id],
              colorHistory: [...(whitePlayer.colorHistory || []), 'white'],
            });
            batch.update(blackRef, {
              opponentIds: [...(blackPlayer.opponentIds || []), whitePlayer.id],
              colorHistory: [...(blackPlayer.colorHistory || []), 'black'],
            });
          }
        }
      });

      // Award bye to player
      if (updatedPlayersWithBye) {
        const byePlayer = players.find((p) => p.id === updatedPlayersWithBye);
        if (byePlayer) {
          const byePlayerRef = doc(db, 'tournaments', tournamentId, 'players', updatedPlayersWithBye);
          batch.update(byePlayerRef, {
            byes: (byePlayer.byes || 0) + 1,
            score: byePlayer.score + 1.0,
            opponentIds: [...(byePlayer.opponentIds || []), 'BYE'],
          });
        }
      }

      // Update tournament configuration
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      batch.update(tournamentRef, {
        currentRound: nextRoundNumber,
      });

      // Create round notification Log
      const notifRef = doc(collection(db, 'tournaments', tournamentId, 'notifications'));
      batch.set(notifRef, {
        id: notifRef.id,
        title: `Babak ${nextRoundNumber} Dimulai`,
        message: isKnockout
          ? `Sistem Gugur (Knockout) berhasil merilis pairing tanding untuk Babak ${nextRoundNumber}. Silakan tempati meja masing-masing!`
          : `Sistem Swiss berhasil merilis pairing tanding untuk Babak ${nextRoundNumber}. Silakan tempati meja masing-masing!`,
        type: 'round_started',
        createdAt: new Date().toISOString(),
      });

      await batch.commit();
      setActiveTab('matches');
    } catch (err: any) {
      console.error(err);
      triggerAlert(`Gagal menghasilkan pairing ronde berikutnya: ${err?.message || err}`, 'error');
    }
  };

  // Complete and conclude the entire tournament
  const handleFinishTournament = async () => {
    const currentRoundMatches = matches.filter((m) => m.round === tournament.currentRound);
    const incomplete = currentRoundMatches.some((m) => m.result === 'pending');

    if (incomplete) {
      triggerAlert('Tutup turnamen ditolak. Tolong catat seluruh hasil tanding babak aktif terlebih dahulu.', 'error');
      return;
    }

    setShowFinishConfirm(true);
  };

  // Clear all notifications
  const handleClearNotifications = async () => {
    // Clear notifications collection or simple local clear
    const batch = writeBatch(db);
    notifications.forEach((notif) => {
      batch.delete(doc(db, 'tournaments', tournamentId, 'notifications', notif.id));
    });
    await batch.commit();
  };

  // Delete the tournament and go back
  const handleDeleteTournament = async () => {
    setShowDeleteConfirm(true);
  };

  // Filter matches based on the current round number
  const activeRoundMatches = matches.filter((m) => m.round === tournament.currentRound);

  // Sorting for Podiums
  const getBuchholz = (player: Player) => {
    return player.opponentIds.reduce((sum, oppId) => {
      if (oppId === 'BYE') return sum;
      const opp = players.find((p) => p.id === oppId);
      return sum + (opp ? opp.score : 0);
    }, 0);
  };
  const podiumWinners = [...players]
    .map((p) => ({ ...p, bZ: getBuchholz(p) }))
    .sort((a, b) => {
      if (Math.abs(b.score - a.score) > 0.01) return b.score - a.score;
      if (Math.abs(b.bZ - a.bZ) > 0.01) return b.bZ - a.bZ;
      return b.rating - a.rating;
    });

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 py-6 mx-auto" id="tournament-detail-container">
      {/* Custom Confirmation Modal for Deleting Tournament */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden animate-fade-in">
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
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-white/5 border border-white/10 text-slate-350 hover:bg-white/10 hover:text-white rounded-xl text-xs transition-all cursor-pointer font-sans"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  setShowDeleteConfirm(false);
                  try {
                    await deleteDoc(doc(db, 'tournaments', tournamentId));
                    onBack();
                  } catch (err: any) {
                    triggerAlert(`Gagal menghapus turnamen: ${err?.message || err}`);
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

      {/* Custom Confirmation Modal for Concluding Tournament */}
      {showFinishConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start gap-4 mb-5">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100 font-sans">Selesaikan Turnamen?</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Tindakan ini akan mengunci turnamen secara permanen, membukukan klasemen akhir, dan merayakan pemenang podium utama.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
              <button
                onClick={() => setShowFinishConfirm(false)}
                className="px-4 py-2 bg-white/5 border border-white/10 text-slate-350 hover:bg-white/10 hover:text-white rounded-xl text-xs transition-all cursor-pointer font-sans"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  setShowFinishConfirm(false);
                  try {
                    const tournamentRef = doc(db, 'tournaments', tournamentId);
                    await updateDoc(tournamentRef, {
                      status: 'completed',
                    });

                    const notifRef = doc(collection(db, 'tournaments', tournamentId, 'notifications'));
                    await setDoc(notifRef, {
                      id: notifRef.id,
                      title: '🏆 TURNAMEN SELESAI!',
                      message: `Seluruh ronde pertandingan telah selesai diselenggarakan. Buka Tab Klasemen untuk menyimak pemenang podium utama!`,
                      type: 'info',
                      createdAt: new Date().toISOString(),
                    });

                    setActiveTab('leaderboard');
                    triggerAlert('Turnamen berhasil diselesaikan dan dikunci!', 'success');
                  } catch (err: any) {
                    triggerAlert(`Gagal menyelesaikan turnamen: ${err?.message || err}`);
                  }
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-lg shadow-emerald-600/15 font-sans"
              >
                Selesaikan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Status Warning/Info Banner */}
      {alertBanner && (
        <div className={`mb-6 p-4 rounded-2xl border flex items-center justify-between gap-3 text-sm animate-fade-in ${
          alertBanner.type === 'error'
            ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            : alertBanner.type === 'success'
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
            : alertBanner.type === 'warning'
            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 font-bold'
            : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
        }`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-indigo-400 shrink-0" />
            <span>{alertBanner.message}</span>
          </div>
          <button onClick={() => setAlertBanner(null)} className="text-xs text-slate-400 hover:text-white hover:underline transition-colors cursor-pointer">
            Tutup
          </button>
        </div>
      )}

      {/* Top action details, back and toggle credentials */}
      <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-350 hover:text-slate-105 font-sans text-sm self-start hover:underline"
        >
          &larr; Kembali ke Daftar Turnamen
        </button>

        {/* Dynamic Authority Simulation Switch (Allows developers/users to test both perspectives) */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-1.5 flex items-center gap-2 self-start md:self-end shadow-xl backdrop-blur-md">
          <span className="text-[11px] font-mono text-slate-400 px-2 uppercase tracking-wide font-bold">
            Mode Akses:
          </span>
          <button
            onClick={() => {
              if (!isAdmin) {
                onTriggerLogin();
              }
            }}
            className={`px-3 py-1.5 text-xs font-sans font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
              isAdmin
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" /> Panitia (Admin)
          </button>
          <button
            onClick={() => {
              if (isAdmin) {
                onTriggerLogout();
              }
            }}
            className={`px-3 py-1.5 text-xs font-sans font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
              !isAdmin
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> Penonton / Pemain
          </button>
        </div>
      </div>

      {/* Main Banner Hero */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 mb-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className={`px-2.5 py-0.5 text-xs font-mono rounded-full uppercase tracking-wider border ${
                tournament.status === 'registration'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  : tournament.status === 'active'
                  ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 animate-pulse'
                  : 'bg-white/5 text-slate-400 border-white/10'
              }`}>
                {tournament.status === 'registration'
                  ? 'Pendaftaran'
                  : tournament.status === 'active'
                  ? 'Berlangsung'
                  : 'Selesai'}
              </span>
              <span className="text-indigo-400 font-mono text-xs font-bold">
                Format: {tournament.gameType}
              </span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight text-white mb-1">
              {tournament.name}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl font-sans">
              {tournament.system === 'knockout' ? 'Sistem Eliminasi Pairing' : 'Turnamen Catur dengan Sistem Swiss Pairing'}
            </p>
          </div>

          {/* Quick stats panel */}
          <div className="flex gap-4 md:items-center">
            <div className="px-5 py-3.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-center min-w-[90px] shadow-sm">
              <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Babak</span>
              <span className="block text-xl font-bold font-mono text-white mt-1">
                {tournament.status === 'registration' ? '-' : `${tournament.currentRound}/${tournament.totalRounds}`}
              </span>
            </div>
            <div className="px-5 py-3.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-center min-w-[90px] shadow-sm">
              <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Pemain</span>
              <span className="block text-xl font-bold font-mono text-white mt-1">
                {players.length}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Admin Actions Bar inside header */}
        {isAdmin && (
          <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap gap-3 items-center relative z-10 animate-fade-in w-full">
            {tournament.status === 'registration' && (
              <button
                onClick={handleStartTournament}
                disabled={players.length < 2}
                className="px-5 py-2.5 bg-indigo-600 font-bold hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 disabled:opacity-45 disabled:pointer-events-none text-xs flex items-center gap-2 active:scale-95 transition-all border border-indigo-500"
                id="organizer-start-tournament"
              >
                <Play className="w-4 h-4 fill-current text-white" /> Mulai Turnamen Ronde 1
              </button>
            )}

            {tournament.status === 'active' && (
              <>
                <button
                  onClick={handleNextRound}
                  className="px-5 py-2.5 bg-indigo-600 font-bold hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 text-xs flex items-center gap-2 active:scale-95 transition-all border border-indigo-500"
                  id="organizer-next-round"
                >
                  Paering Ronde Berikutnya <ArrowRight className="w-4 h-4" />
                </button>
                
                <button
                  onClick={handleFinishTournament}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-100 rounded-xl text-xs flex items-center gap-2 active:scale-95 transition-all"
                  id="organizer-conclude-brackets"
                >
                  <Award className="w-4 h-4 text-emerald-400" /> Selesaikan & Kunci Turnamen
                </button>
              </>
            )}

            {tournament.status === 'completed' && (
              <div className="flex items-center gap-2 text-emerald-355 text-emerald-300 font-sans text-xs bg-emerald-500/10 border border-emerald-500/25 px-3.5 py-2 rounded-xl">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Turnamen telah resmi berakhir dan dikunci oleh panitia.
              </div>
            )}

            <button
              onClick={handleDeleteTournament}
              className="px-5 py-2.5 bg-rose-550/10 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 hover:text-rose-200 rounded-xl text-xs flex items-center gap-2 active:scale-95 transition-all ml-auto"
              id="organizer-delete-tournament"
            >
              <Trash2 className="w-4 h-4 text-rose-450" /> Hapus Turnamen
            </button>
          </div>
        )}
      </div>

      {/* Podium Display if Completed */}
      {tournament.status === 'completed' && podiumWinners.length >= 1 && (
        <div className="mb-8 animate-fade-in" id="podium-section">
          <h2 className="text-xl font-bold font-sans text-slate-100 mb-4 flex items-center gap-2">
            🏆 Pemenang Podium Utama
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1st Place */}
            {podiumWinners[0] && (
              <div className="bg-white/10 backdrop-blur-xl border border-indigo-500/30 rounded-3xl p-5 shadow-2xl flex flex-col items-end justify-center text-right relative overflow-hidden min-h-[160px] gap-1.5">
                {podiumWinners[0].photoUrl && (
                  <div className="absolute top-0 left-0 h-full aspect-square z-0 pointer-events-none" style={{ WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)', maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)' }}>
                    <img src={podiumWinners[0].photoUrl} alt="" className="w-full h-full object-cover object-top opacity-90" />
                  </div>
                )}
                <div className="absolute top-0 right-0 bg-indigo-600 text-white font-bold px-3 py-1 rounded-bl-xl text-xs font-mono border-l border-b border-indigo-500/30 z-10 shadow-sm">
                  CHAMPION
                </div>
                <div className="text-4xl mt-3 z-10 drop-shadow-md">🥇</div>
                <div className="z-10">
                  <h4 className="font-bold text-xl text-white font-sans truncate pl-4 drop-shadow-md">{podiumWinners[0].name}</h4>
                  <span className="text-xs text-slate-200 font-mono drop-shadow-md">Rating: {podiumWinners[0].rating}</span>
                </div>
                <div className="text-xs font-mono mt-2 text-slate-100 font-bold bg-indigo-500/20 backdrop-blur-md border border-indigo-500/30 py-1.5 px-3 rounded-xl z-10 shadow-lg">
                  Poin: {podiumWinners[0].score.toFixed(1)} | BZ: {podiumWinners[0].bZ.toFixed(1)}
                </div>
              </div>
            )}

            {/* 2nd Place */}
            {podiumWinners[1] && (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-xl flex flex-col items-end justify-center text-right relative overflow-hidden min-h-[160px] gap-1.5">
                {podiumWinners[1].photoUrl && (
                  <div className="absolute top-0 left-0 h-full aspect-square z-0 pointer-events-none" style={{ WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)', maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)' }}>
                    <img src={podiumWinners[1].photoUrl} alt="" className="w-full h-full object-cover object-top opacity-80" />
                  </div>
                )}
                <div className="text-3xl mt-2 z-10 drop-shadow-md">🥈</div>
                <div className="z-10">
                  <h4 className="font-bold text-lg text-white font-sans truncate pl-4 drop-shadow-md">{podiumWinners[1].name}</h4>
                  <span className="text-xs text-slate-300 font-mono drop-shadow-md">Rating: {podiumWinners[1].rating}</span>
                </div>
                <div className="text-xs font-mono mt-1 text-slate-200 font-bold bg-white/10 backdrop-blur-md border border-white/20 py-1 px-2.5 rounded-xl z-10 shadow-lg">
                  Poin: {podiumWinners[1].score.toFixed(1)} | BZ: {podiumWinners[1].bZ.toFixed(1)}
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {podiumWinners[2] && (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-xl flex flex-col items-end justify-center text-right relative overflow-hidden min-h-[160px] gap-1.5">
                {podiumWinners[2].photoUrl && (
                  <div className="absolute top-0 left-0 h-full aspect-square z-0 pointer-events-none" style={{ WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)', maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)' }}>
                    <img src={podiumWinners[2].photoUrl} alt="" className="w-full h-full object-cover object-top opacity-80" />
                  </div>
                )}
                <div className="text-3xl mt-2 z-10 drop-shadow-md">🥉</div>
                <div className="z-10">
                  <h4 className="font-bold text-lg text-white font-sans truncate pl-4 drop-shadow-md">{podiumWinners[2].name}</h4>
                  <span className="text-xs text-slate-300 font-mono drop-shadow-md">Rating: {podiumWinners[2].rating}</span>
                </div>
                <div className="text-xs font-mono mt-1 text-slate-200 font-bold bg-white/10 backdrop-blur-md border border-white/20 py-1 px-2.5 rounded-xl z-10 shadow-lg">
                  Poin: {podiumWinners[2].score.toFixed(1)} | BZ: {podiumWinners[2].bZ.toFixed(1)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Tabs Selection Row */}
      <div className="border-b border-white/10 mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('matches')}
          className={`pb-3 px-4 text-sm font-bold font-sans transition-all border-b-2 -mb-px ${
            activeTab === 'matches'
              ? 'border-indigo-400 text-indigo-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Meja Pertandingan ({matches.length})
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`pb-3 px-4 text-sm font-bold font-sans transition-all border-b-2 -mb-px ${
            activeTab === 'leaderboard'
              ? 'border-indigo-400 text-indigo-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Klasemen (Leaderboard)
        </button>
        <button
          onClick={() => setActiveTab('players')}
          className={`pb-3 px-4 text-sm font-bold font-sans transition-all border-b-2 -mb-px ${
            activeTab === 'players'
              ? 'border-indigo-400 text-indigo-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Daftar Pemain ({players.length})
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 px-4 text-sm font-bold font-sans transition-all border-b-2 -mb-px ${
            activeTab === 'notifications'
              ? 'border-indigo-400 text-indigo-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Log Notifikasi ({notifications.length})
        </button>
      </div>

      {/* Tab Panels Contents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - Large Main View */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'matches' && (
            <ActiveMatches
              matches={activeRoundMatches}
              onRecordResult={handleRecordMatchResult}
              onClearResult={handleClearMatchResult}
              isAdmin={isAdmin}
              currentRound={tournament.currentRound}
              system={tournament.system}
            />
          )}

          {activeTab === 'leaderboard' && <Leaderboard players={players} matches={matches} system={tournament.system} />}

          {activeTab === 'players' && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col h-full" id="players-profile-registry">
              {/* Registration Period Info Card */}
              <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-indigo-500/10 text-indigo-300 rounded-xl border border-indigo-500/15">
                    <Calendar className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                      Masa Pendaftaran Turnamen
                    </h4>
                    <p className="text-sm font-bold text-slate-200 mt-1">
                      {regStartDate ? regStartDate : 'Mulai Segera'} &mdash; {regEndDate ? regEndDate : 'Selesai Tanpa Batas'}
                    </p>
                    
                    {/* Current Status Badge */}
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {isRegNotStartedYet ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
                          ● Pendaftaran Belum Dibuka
                        </span>
                      ) : isRegEnded ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold">
                          ● Pendaftaran Ditutup / Berakhir
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                          ● Pendaftaran Aktif / Terbuka
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => setIsEditingDates(!isEditingDates)}
                    className="w-full md:w-auto px-4 py-2 hover:bg-white/10 bg-white/5 text-slate-200 border border-white/10 rounded-xl text-xs font-semibold hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 font-sans"
                  >
                    Atur Waktu Pendaftaran
                  </button>
                )}
              </div>

              {/* Date Editing Form (Admin Only) */}
              {isAdmin && isEditingDates && (
                <div className="mb-6 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 font-sans space-y-4">
                  <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider font-mono">
                    Ubah Batas Waktu Pendaftaran
                  </h5>
                  
                  {updateDateError && (
                    <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                      {updateDateError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">
                        Tanggal Mulai Pendaftaran
                      </label>
                      <input
                        type="date"
                        value={newStartDate}
                        onClick={(e) => 'showPicker' in HTMLInputElement.prototype && (e.target as HTMLInputElement).showPicker()}
                        onChange={(e) => {
                          setNewStartDate(e.target.value);
                          setUpdateDateError('');
                        }}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">
                        Tanggal Selesai Pendaftaran
                      </label>
                      <input
                        type="date"
                        value={newEndDate}
                        onClick={(e) => 'showPicker' in HTMLInputElement.prototype && (e.target as HTMLInputElement).showPicker()}
                        onChange={(e) => {
                          setNewEndDate(e.target.value);
                          setUpdateDateError('');
                        }}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      onClick={() => {
                        setIsEditingDates(false);
                        setUpdateDateError('');
                      }}
                      className="px-3 py-1.5 bg-transparent text-slate-400 hover:text-slate-200 text-xs font-medium cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleUpdateRegistrationDates}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
                    >
                      Simpan Perubahan
                    </button>
                  </div>
                </div>
              )}

              {/* Registration Form (Active for both Admin and public player during registration phase) */}
              {tournament.status === 'registration' ? (
                !isRegistrationAllowed && !isAdmin ? (
                  <div className="mb-6 p-6 rounded-2xl border border-slate-500/10 bg-slate-500/5 text-center font-sans">
                    <Lock className="w-8 h-8 text-rose-400 mx-auto mb-3 animate-pulse" />
                    <h4 className="text-sm font-bold text-slate-200">Registrasi Pemain Ditutup</h4>
                    <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                      {isRegNotStartedYet 
                        ? `Mohon maaf, pendaftaran untuk kompetisi ini baru akan dibuka mulai tanggal ${regStartDate}.`
                        : `Mohon maaf, batas akhir pendaftaran yaitu ${regEndDate} telah terlewati.`}
                    </p>
                  </div>
                ) : (
                  <div className="border-b border-white/10 pb-5 mb-5 select-none font-sans">
                    {!isRegistrationAllowed && isAdmin && (
                      <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/25 text-amber-300 rounded-xl text-[11px] flex gap-2 items-center leading-relaxed font-sans">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Masa pendaftaran reguler saat ini tidak aktif (Tutup), namun sebagai Panitia (Admin) Anda dapat mengabaikan batas ini dengan mendaftarkan pemain manual.</span>
                      </div>
                    )}
                    <h4 className="font-semibold text-slate-100 text-sm flex items-center gap-1.5 mb-2">
                      <UserPlus className="w-4 h-4 text-emerald-400" /> 
                      {isAdmin ? "Registrasi Pemain Baru (Panel Panitia)" : "Formulir Registrasi Online (Pemain Mandiri)"}
                    </h4>
                    <p className="text-xs text-slate-350 mb-4 leading-relaxed font-sans">
                      {isAdmin 
                        ? "Tambahkan pemain secara manual ke daftar peserta turnamen di bawah ini."
                        : "Daftarkan diri Anda atau kontestan lain secara online untuk berpartisipasi dalam ajang kejuaraan catur Swiss ini!"}
                    </p>
                    <form onSubmit={handleAddPlayer} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Name input */}
                      <div>
                        <label className="block text-[10px] font-mono font-medium text-slate-400 uppercase tracking-widest mb-1.5">
                          Nama Lengkap
                        </label>
                        <input
                          type="text"
                          placeholder="Masukkan nama pemain..."
                          value={newPlayerName}
                          onChange={(e) => setNewPlayerName(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 text-sm rounded-xl px-4 py-2.5 text-slate-100 font-sans focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
                          required
                        />
                      </div>

                      {/* ELO rating input */}
                      <div>
                        <label className="block text-[10px] font-mono font-medium text-slate-400 uppercase tracking-widest mb-1.5">
                          Rating ELO (Estimasi)
                        </label>
                        <input
                          type="number"
                          min={100}
                          max={3500}
                          value={newPlayerRating}
                          onChange={(e) => setNewPlayerRating(parseInt(e.target.value) || 1200)}
                          className="w-full bg-white/5 border border-white/10 text-sm rounded-xl px-4 py-2.5 text-slate-100 font-mono focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Phone/WhatsApp input */}
                      <div>
                        <label className="block text-[10px] font-mono font-medium text-slate-400 uppercase tracking-widest mb-1.5">
                          Nomor HP / WhatsApp
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                          <input
                            type="tel"
                            placeholder="Contoh: 081234567890"
                            value={newPlayerPhone}
                            onChange={(e) => setNewPlayerPhone(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-xs rounded-xl pl-9 pr-4 py-2.5 text-slate-100 font-sans focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
                            required
                          />
                        </div>
                      </div>

                      {/* Photo/Avatar Upload */}
                      <div>
                        <label className="block text-[10px] font-mono font-medium text-slate-400 uppercase tracking-widest mb-1.5">
                          Foto Profil (Opsional)
                        </label>
                        <div className="flex items-center gap-3">
                          <div className="relative group/avatar w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                            {newPlayerPhoto ? (
                              <>
                                <img src={newPlayerPhoto} alt="Upload Preview" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => setNewPlayerPhoto('')}
                                  className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-rose-400 text-[9px] font-bold font-sans cursor-pointer"
                                >
                                  Batal
                                </button>
                              </>
                            ) : (
                              <Camera className="w-3.5 h-3.5 text-slate-400 group-hover/avatar:scale-110 transition-transform" />
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              id="tour-new-player-photo"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handlePhotoUploadBase64(file, setNewPlayerPhoto);
                                }
                              }}
                              className="hidden"
                            />
                            <label
                              htmlFor="tour-new-player-photo"
                              className="inline-flex px-2.5 py-1.5 bg-white/5 border border-white/10 text-slate-200 text-[10px] font-sans font-semibold rounded-lg hover:bg-white/10 transition-colors cursor-pointer select-none"
                            >
                              Pilih File Foto
                            </label>
                            <span className="text-[9px] text-slate-500 ml-2">
                              Maksimal 800 KB
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Address Field */}
                    <div>
                      <label className="block text-[10px] font-mono font-medium text-slate-400 uppercase tracking-widest mb-1.5">
                        Alamat Domisili
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                        <textarea
                          placeholder="Masukkan alamat domisili lengkap..."
                          value={newPlayerAddress}
                          onChange={(e) => setNewPlayerAddress(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 text-xs rounded-xl pl-9 pr-4 py-2.5 text-slate-100 font-sans focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all min-h-[44px] max-h-[80px]"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 border border-emerald-500 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
                      >
                        {isAdmin ? "Daftarkan Pemain" : "Daftar Sekarang"}
                      </button>
                    </div>
                  </form>
                </div>
              ) ) : null}

              {/* Participant tables */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 text-xs font-mono tracking-wider uppercase">
                      <th className="py-2.5 px-4 font-bold">Nama</th>
                      <th className="py-2.5 px-4 text-center font-bold">Rating</th>
                      <th className="py-2.5 px-4 text-center font-bold">Keaktifan</th>
                      {isAdmin && <th className="py-2.5 px-4 text-right font-bold">Kelola</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans text-sm">
                    {players.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          Belum ada pemain yang terdaftar.
                        </td>
                      </tr>
                    ) : (
                      players.map((p) => (
                        <tr key={p.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-200">
                            <div className="flex items-center gap-2.5">
                              {/* Avatar display of player */}
                              <div className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                                {p.photoUrl ? (
                                  <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <span className="text-xs font-bold text-slate-300 font-sans uppercase">
                                    {p.name.charAt(0)}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col text-left">
                                <span 
                                  className="hover:text-emerald-400 transition-colors duration-150 cursor-pointer flex items-center gap-1 font-sans text-xs" 
                                  onClick={() => setSelectedSubPlayer(p)}
                                  title="Klik untuk detail data diri"
                                >
                                  {p.name} <Eye className="w-3 h-3 text-slate-400 shrink-0 opacity-40 hover:opacity-100 transition-opacity" />
                                </span>
                                {p.phone && (
                                  <span className="text-[9px] text-slate-450 text-slate-400 select-all font-mono font-normal flex items-center gap-0.5 mt-0.5">
                                    <Phone className="w-2.5 h-2.5 text-emerald-400 shrink-0" /> {p.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-350">
                            {p.rating}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {p.active ? (
                              <span className="inline-flex px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                Berpartisipasi
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 text-[10px] font-mono rounded bg-white/5 text-slate-450 border border-white/10">
                                Absen/Mundur
                              </span>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="py-3 px-4 text-right">
                              {tournament.status === 'registration' ? (
                                <button
                                  onClick={() => handleDeletePlayer(p.id, p.name)}
                                  className="p-1 px-2.5 border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl text-xs font-sans transition-all cursor-pointer"
                                  title="Hapus Pemain"
                                >
                                  Hapus
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleTogglePlayerStatus(p.id, p.name, p.active)}
                                  className={`p-1 px-2.5 border transition-all text-xs rounded-xl font-sans cursor-pointer ${
                                    p.active
                                      ? 'border-orange-500/20 bg-orange-500/5 text-orange-400 hover:bg-orange-500 hover:text-white'
                                      : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-350 hover:bg-emerald-500 hover:text-white'
                                  }`}
                                >
                                  {p.active ? 'Undurkan Diri' : 'Masukan Kembali'}
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <NotificationsFeed
              notifications={notifications}
              clearNotifications={isAdmin ? handleClearNotifications : undefined}
            />
          )}
        </div>

        {/* Right Column Sidebar - Compact Auxiliary panel (Notifications) */}
        <div className="lg:col-span-1">
          {activeTab !== 'notifications' ? (
            <NotificationsFeed
              notifications={notifications}
              clearNotifications={isAdmin ? handleClearNotifications : undefined}
            />
          ) : (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-slate-300">
              <h3 className="font-sans font-semibold text-lg text-slate-100 flex items-center gap-1.5 border-b border-white/10 pb-3">
                <Compass className="w-5 h-5 text-indigo-400" /> Informasi Swiss
              </h3>
              <div className="space-y-3 text-xs leading-relaxed font-sans text-slate-300">
                <p>
                  Sistem pairing Swiss dihitung dengan mencocokkan pecatur dengan skor yang sebanding (misal: pecatur 2.0 poin vs 2.0 poin), serta menghindari tanding ulang (rematch) terhadap lawan yang telah ditemui di ronde-ronde sebelumnya.
                </p>
                <p>
                  <strong>Aturan Warna Putih/Hitam:</strong> Sistem secara otomatis memantau riwayat kubu bidak catur para pemain dan berusaha adil menyeimbangkan jatah warna pemain agar tidak bergeser ekstrim.
                </p>
                <p>
                  <strong>Bye Otomatis:</strong> Apabila total peserta aktif ganjil, satu pemain dengan akumulasi poin paling sedikit yang belum pernah memperoleh jatah libur (bye), dibebastugaskan s.d. ronde depan dengan kompensasi mendapatkan +1.0 poin utuh.
                </p>
              </div>
            </div>
          )}
        </div>
        
      </div>

      {/* Participant profile details modal */}
      {selectedSubPlayer && (() => {
        const playerMatches = matches
          .filter((m) => m.whitePlayerId === selectedSubPlayer.id || m.blackPlayerId === selectedSubPlayer.id)
          .sort((a, b) => a.round - b.round);

        const getMatchResultText = (m: Match, playerId: string) => {
          if (m.result === 'pending') return '—';
          
          const isWhite = m.whitePlayerId === playerId;
          const isBlack = m.blackPlayerId === playerId;
          
          if (isWhite) {
            if (m.result === '1-0' || m.result === '1-0F') return '1';
            if (m.result === '0-1' || m.result === '0-1F') return '0';
            if (m.result === '0.5-0.5') return '½';
          } else if (isBlack) {
            if (m.result === '0-1' || m.result === '0-1F') return '1';
            if (m.result === '1-0' || m.result === '1-0F') return '0';
            if (m.result === '0.5-0.5') return '½';
          }
          
          if (m.whitePlayerId === playerId && m.blackPlayerId === 'BYE') return '1';
          if (m.blackPlayerId === playerId && m.whitePlayerId === 'BYE') return '1';
          
          return '—';
        };

        const totalRoundsPlayed = playerMatches.length;

        // ELO rating title
        let subPlayerTitle = 'PE';
        if (selectedSubPlayer.rating >= 2400) subPlayerTitle = 'GM';
        else if (selectedSubPlayer.rating >= 2200) subPlayerTitle = 'IM';
        else if (selectedSubPlayer.rating >= 2000) subPlayerTitle = 'FM';
        else if (selectedSubPlayer.rating >= 1800) subPlayerTitle = 'CM';

        return (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[99999]">
            <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-md w-full shadow-2xl relative overflow-hidden text-left font-sans animate-fade-in text-slate-200">
              {/* Highlight blur background decoration */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

              {/* Close Button top-right */}
              <button
                type="button"
                onClick={() => setSelectedSubPlayer(null)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all cursor-pointer z-10 font-bold"
              >
                ✕
              </button>

              {/* Header Box (Chess.com layout) */}
              <div className="p-6 pb-4 border-b border-white/5 flex gap-5 items-start">
                {/* Square Profile Photo */}
                <div className="relative w-20 h-20 shrink-0">
                  <div className="w-full h-full rounded-2xl border-2 border-white/10 bg-slate-800 overflow-hidden shadow-lg select-none">
                    {selectedSubPlayer.photoUrl ? (
                      <img src={selectedSubPlayer.photoUrl} alt={selectedSubPlayer.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 font-sans font-extrabold text-3xl uppercase bg-gradient-to-br from-slate-800 to-slate-950">
                        {selectedSubPlayer.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  {/* Floating badge labeled Title e.g "GM" */}
                  <div className="absolute -bottom-1.5 -right-1.5 bg-rose-600 text-[9px] font-extrabold font-mono text-white px-2 py-0.5 rounded-md uppercase tracking-wider shadow-lg">
                    {subPlayerTitle}
                  </div>
                </div>

                {/* Identity info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xl font-extrabold text-white font-sans tracking-tight leading-snug truncate">
                    {selectedSubPlayer.name}
                  </h4>
                  
                  {/* Flag & ELO Container */}
                  <div className="flex items-center gap-2 mt-1.5 font-sans">
                    <span className="text-lg select-none">🇮🇩</span>
                    <span className="text-xs font-mono font-bold text-slate-300">
                      {selectedSubPlayer.rating} ELO
                    </span>
                    
                    <span className={`text-[9px] font-mono font-extrabold px-2 py-0.5 rounded-full ${
                      selectedSubPlayer.active
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                        : "bg-white/5 text-slate-400 border border-white/10"
                    }`}>
                      {selectedSubPlayer.active ? "Aktif" : "Mundur"}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-4 text-xs font-mono font-semibold">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Skor Total</span>
                      <span className="text-sm font-extrabold text-emerald-400 block mt-0.5">
                        {selectedSubPlayer.score} / {totalRoundsPlayed} Poin
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Tiebreaks</span>
                      <span className="text-sm font-extrabold text-indigo-400 block mt-0.5">
                        {selectedSubPlayer.tiebreaks.toFixed(1)} BH
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub Navigation Tabs */}
              <div className="flex border-b border-white/5 px-2 bg-slate-950/20 font-sans">
                <button
                  type="button"
                  onClick={() => setSelectedSubPlayerTab('matches')}
                  className={`flex-1 py-3 text-xs font-bold text-center tracking-wide border-b-2 font-sans transition-all cursor-pointer ${
                    selectedSubPlayerTab === 'matches'
                      ? 'border-emerald-500 text-emerald-400 font-extrabold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Riwayat Tanding
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSubPlayerTab('info')}
                  className={`flex-1 py-3 text-xs font-bold text-center tracking-wide border-b-2 font-sans transition-all cursor-pointer ${
                    selectedSubPlayerTab === 'info'
                      ? 'border-emerald-500 text-emerald-400 font-extrabold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Kontak &amp; Alamat
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-5 font-sans min-h-[220px]">
                {selectedSubPlayerTab === 'matches' && (
                  <div>
                    {playerMatches.length === 0 ? (
                      <div className="text-center py-10 text-slate-500 text-xs italic">
                        Belum ada pertandingan terdaftar untuk pemain ini.
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1">
                        {playerMatches.map((m) => {
                          const isWhite = m.whitePlayerId === selectedSubPlayer.id;
                          const oppId = isWhite ? m.blackPlayerId : m.whitePlayerId;
                          const oppName = isWhite ? m.blackPlayerName : m.whitePlayerName;
                          const opponent = players.find((p) => p.id === oppId);
                          const oppRating = opponent ? opponent.rating : (oppId === 'BYE' ? '-' : 1200);
                          
                          let oppTitle = 'PE';
                          if (oppId !== 'BYE' && opponent) {
                            if (oppRating >= 2400) oppTitle = 'GM';
                            else if (oppRating >= 2200) oppTitle = 'IM';
                            else if (oppRating >= 2000) oppTitle = 'FM';
                            else if (oppRating >= 1800) oppTitle = 'CM';
                          }

                          const result = getMatchResultText(m, selectedSubPlayer.id);

                          return (
                            <div
                              key={m.id}
                              className="flex items-center justify-between py-2 border-b border-white/5 hover:bg-white/5 px-2 rounded-xl transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {/* Round circle */}
                                <span className="text-[10px] font-mono font-bold text-slate-500 w-4 text-center shrink-0">
                                  {m.round}
                                </span>

                                <div className="flex items-center gap-2 min-w-0">
                                  {oppId !== 'BYE' ? (
                                    <>
                                      <span className={`text-[8px] font-extrabold font-mono px-1 py-0.5 rounded-md tracking-wider shrink-0 select-none ${
                                        oppTitle === 'GM' ? 'bg-red-600 text-white' :
                                        oppTitle === 'IM' ? 'bg-orange-600 text-white' :
                                        oppTitle === 'FM' ? 'bg-indigo-600 text-white' :
                                        'bg-slate-700 text-slate-300'
                                      }`}>
                                        {oppTitle}
                                      </span>
                                      <span
                                        onClick={() => {
                                          if (opponent) {
                                            setSelectedSubPlayer(opponent);
                                            setSelectedSubPlayerTab('matches');
                                          }
                                        }}
                                        className={`text-xs font-sans font-semibold text-slate-200 truncate ${
                                          opponent ? 'hover:text-emerald-400 cursor-pointer' : ''
                                        }`}
                                        title={opponent ? `Klik untuk melihat profil ${oppName}` : oppName}
                                      >
                                        {oppName}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-xs font-sans font-normal text-slate-400 italic">
                                      {oppName}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 ml-2 font-mono">
                                <span className="text-[10px] font-bold text-slate-400 w-10 text-right">
                                  {oppId !== 'BYE' ? oppRating : ''}
                                </span>

                                <span className="text-xs select-none">
                                  {oppId !== 'BYE' ? '🇮🇩' : ''}
                                </span>

                                {oppId !== 'BYE' ? (
                                  <div
                                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                      isWhite
                                        ? 'bg-slate-100 border-slate-300 text-slate-900 shadow'
                                        : 'bg-slate-950 border-slate-800 text-white'
                                    }`}
                                    title={isWhite ? 'Main Putih' : 'Main Hitam'}
                                  >
                                    <span className="text-[8px] font-extrabold font-mono">
                                      {isWhite ? 'W' : 'B'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="w-4 h-4" />
                                )}

                                <span className={`text-xs font-mono font-extrabold w-6 text-right select-none ${
                                  result === '1' ? 'text-emerald-400' :
                                  result === '½' ? 'text-amber-400 font-sans' :
                                  result === '0' ? 'text-rose-450 text-rose-400' :
                                  'text-slate-400'
                                }`}>
                                  {result}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {selectedSubPlayerTab === 'info' && (
                  <div className="space-y-4 text-xs font-sans">
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 font-bold">
                        <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        No. Handphone / WhatsApp
                      </div>
                      <div className="bg-white/5 border border-white/5 px-3.5 py-3 rounded-2xl text-slate-250 font-mono font-medium flex justify-between items-center text-xs">
                        <span>{selectedSubPlayer.phone || 'Tidak dicantumkan'}</span>
                        {selectedSubPlayer.phone && (
                          <a
                            href={`https://wa.me/${selectedSubPlayer.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl transition-all font-sans font-bold shadow"
                          >
                            Hubungi via WA
                          </a>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 font-bold">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        Alamat Domisili Lengkap
                      </div>
                      <div className="bg-white/5 border border-white/5 px-3.5 py-3 rounded-2xl text-slate-200 leading-relaxed max-h-32 overflow-y-auto text-xs font-medium">
                        {selectedSubPlayer.address || 'Tidak dicantumkan'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Close buttons */}
              <div className="p-5 pt-0">
                <button
                  type="button"
                  onClick={() => setSelectedSubPlayer(null)}
                  className="w-full px-5 py-3 bg-white/5 hover:bg-white/10 text-slate-200 rounded-2xl text-xs font-extrabold transition-all cursor-pointer text-center border border-white/5 active:scale-[0.98]"
                >
                  Tutup Detail Profil
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
