export type GameType = 'Blitz' | 'Rapid' | 'Classical';
export type TournamentStatus = 'registration' | 'active' | 'completed';
export type MatchResult = 'pending' | '1-0' | '0-1' | '0.5-0.5' | '1-0F' | '0-1F';
export type NotificationType = 'match_result' | 'round_started' | 'info';

export interface Tournament {
  id: string;
  name: string;
  gameType: GameType;
  status: TournamentStatus;
  currentRound: number;
  totalRounds: number;
  createdAt: string;
  createdBy: string;
  system: 'swiss' | 'knockout'; // Added for tournament layout: Swiss (Klasemen) or Knockout (Gugur)
  regStartDate?: string;
  regEndDate?: string;
}

export interface GlobalPlayer {
  id: string;
  name: string;
  rating: number;
  createdAt: string;
  phone?: string;
  address?: string;
  photoUrl?: string;
}

export interface Player {
  id: string;
  name: string;
  rating: number;
  score: number;
  tiebreaks: number; // Buchholz score
  opponentIds: string[];
  colorHistory: ('white' | 'black')[];
  active: boolean;
  byes: number;
  phone?: string;
  address?: string;
  photoUrl?: string;
}

export interface Match {
  id: string; // Typically tournamentId_round_tableNumber
  round: number;
  tableNumber: number;
  whitePlayerId: string; // "BYE" if white gets a bye
  whitePlayerName: string;
  blackPlayerId: string; // "BYE" if black gets a bye, or empty
  blackPlayerName: string;
  result: MatchResult;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
}
