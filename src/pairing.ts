import { Player, Match } from './types';

/**
 * Generates Swiss-system pairings for the next round of a chess tournament.
 * 
 * Rules applied:
 * 1. Sort active players by score (descending), then rating (descending).
 * 2. If odd number of active players, assign a BYE (1.0 point free-win) to the lowest active player who has not had a bye yet.
 * 3. Pair players in score groups, starting from highest to lowest.
 * 4. Ensure players haven't played each other before in this tournament.
 * 5. Balance white and black colors based on their color history.
 * 6. Fallback gracefully if no perfect pairing is possible (avoids locking in small field sizes by letting players play again if absolutely necessary).
 */
export function generateSwissPairings(
  allPlayers: Player[],
  roundNumber: number
): { pairings: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>[]; updatedPlayersWithBye: string | null } {
  const activePlayers = allPlayers.filter((p) => p.active);
  const pairings: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  let updatedPlayersWithBye: string | null = null;

  if (activePlayers.length === 0) return { pairings, updatedPlayersWithBye };

  let playersToPair = [...activePlayers];

  // 1. Handle odd number of players with a Bye
  if (playersToPair.length % 2 !== 0) {
    // Sort ascending: lowest score and lowest rating first, to find the worst off who hasn't had a bye
    const playersSortedForBye = [...playersToPair].sort((a, b) => {
      if (a.byes !== b.byes) return a.byes - b.byes; // priority to 0 byes
      if (a.score !== b.score) return a.score - b.score;
      return a.rating - b.rating;
    });

    // Find the first active player with minimum byes
    const byePlayer = playersSortedForBye[0];
    if (byePlayer) {
      updatedPlayersWithBye = byePlayer.id;
      // create bye match (1-0 for white, since bye player plays white)
      pairings.push({
        round: roundNumber,
        tableNumber: 1, // Will be remapped
        whitePlayerId: byePlayer.id,
        whitePlayerName: byePlayer.name,
        blackPlayerId: 'BYE',
        blackPlayerName: 'BYE (Special)',
        result: '1-0', // Automatic win for the bye player
      });

      // Remove bye player from pairing pool
      playersToPair = playersToPair.filter((p) => p.id !== byePlayer.id);
    }
  }

  // Sort remaining players descending: highest score first, then rating
  playersToPair.sort((a, b) => {
    if (Math.abs(a.score - b.score) > 0.01) {
      return b.score - a.score;
    }
    return b.rating - a.rating;
  });

  const pairedIds = new Set<string>();

  // Helper to calculate color preference coefficient
  // positive means played black more (wants white)
  // negative means played white more (wants black)
  const getColorPreference = (p: Player) => {
    const whiteCount = p.colorHistory.filter((c) => c === 'white').length;
    const blackCount = p.colorHistory.filter((c) => c === 'black').length;
    
    // Check direct consecutive history (chess rules forbid 3 in a row of the same color)
    const consecutiveCount = 0;
    if (p.colorHistory.length >= 2) {
      const last = p.colorHistory[p.colorHistory.length - 1];
      const secondLast = p.colorHistory[p.colorHistory.length - 2];
      if (last === secondLast) {
        return last === 'white' ? -10 : 10; // Strong preference for opposite
      }
    }
    return blackCount - whiteCount;
  };

  // Safe pairing finder (iterative with back-offs)
  let tableIdx = pairings.length > 0 ? 2 : 1;

  while (playersToPair.length > 0) {
    const playerA = playersToPair.shift()!;
    if (pairedIds.has(playerA.id)) continue;

    let partnerIdx = -1;
    let fallbackIdx = -1;

    // Search for suitable opponent (ideally someone they haven't faced)
    for (let i = 0; i < playersToPair.length; i++) {
      const candidate = playersToPair[i];
      if (pairedIds.has(candidate.id)) continue;

      const alreadyPlayed = playerA.opponentIds.includes(candidate.id);

      if (!alreadyPlayed) {
        partnerIdx = i;
        break;
      } else if (fallbackIdx === -1) {
        // Fallback option in case we cannot find anyone they haven't faced
        fallbackIdx = i;
      }
    }

    // Determine final matching index
    const matchIdx = partnerIdx !== -1 ? partnerIdx : fallbackIdx;

    if (matchIdx !== -1) {
      const playerB = playersToPair.splice(matchIdx, 1)[0];

      // Determine colors based on history
      const prefA = getColorPreference(playerA);
      const prefB = getColorPreference(playerB);

      let whiteChoice: Player;
      let blackChoice: Player;

      // Decide who gets White
      if (prefA > prefB) {
        // Player A wants white more or Player B wants black more
        whiteChoice = playerA;
        blackChoice = playerB;
      } else if (prefB > prefA) {
        whiteChoice = playerB;
        blackChoice = playerA;
      } else {
        // Tie break colors by rating or random
        if (playerA.rating > playerB.rating) {
          whiteChoice = playerA;
          blackChoice = playerB;
        } else {
          whiteChoice = playerB;
          blackChoice = playerA;
        }
      }

      pairings.push({
        round: roundNumber,
        tableNumber: tableIdx++,
        whitePlayerId: whiteChoice.id,
        whitePlayerName: whiteChoice.name,
        blackPlayerId: blackChoice.id,
        blackPlayerName: blackChoice.name,
        result: 'pending',
      });
    } else {
      // If a single player is left unpaired after all splice matching,
      // and we cannot find any other match, give them a late Bye
      pairings.push({
        round: roundNumber,
        tableNumber: tableIdx++,
        whitePlayerId: playerA.id,
        whitePlayerName: playerA.name,
        blackPlayerId: 'BYE',
        blackPlayerName: 'BYE (Special)',
        result: '1-0',
      });
      updatedPlayersWithBye = playerA.id;
    }
  }

  // Re-adjust table numbers so they look perfectly clean (1, 2, 3...)
  const finalPairings = pairings.map((p, idx) => ({
    ...p,
    tableNumber: idx + 1,
  }));

  return { pairings: finalPairings, updatedPlayersWithBye };
}

/**
 * Generates single elimination (Knockout / Sistem Gugur) pairings.
 * Losers are eliminated, and only winners move on to the next round.
 */
export function generateKnockoutPairings(
  allPlayers: Player[],
  roundNumber: number
): { pairings: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>[]; updatedPlayersWithBye: string | null } {
  const activePlayers = allPlayers.filter((p) => p.active);
  const pairings: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  let updatedPlayersWithBye: string | null = null;

  if (activePlayers.length < 2) return { pairings, updatedPlayersWithBye };

  // Sort by rating descending so top seeds are protected
  let playersToPair = [...activePlayers].sort((a, b) => b.rating - a.rating);

  // If odd count of players, give a bye to the lowest rated active player
  if (playersToPair.length % 2 !== 0) {
    const byePlayer = playersToPair.pop()!;
    updatedPlayersWithBye = byePlayer.id;
    pairings.push({
      round: roundNumber,
      tableNumber: 1,
      whitePlayerId: byePlayer.id,
      whitePlayerName: byePlayer.name,
      blackPlayerId: 'BYE',
      blackPlayerName: 'BYE (Sistem Gugur)',
      result: '1-0', // Bye player automatically advances
    });
  }

  let tableIdx = pairings.length > 0 ? 2 : 1;
  const n = playersToPair.length;

  // Protect top seeds by pairing highest with lowest (1 vs N, 2 vs N-1)
  for (let i = 0; i < n / 2; i++) {
    const whiteChoice = playersToPair[i];
    const blackChoice = playersToPair[n - 1 - i];

    pairings.push({
      round: roundNumber,
      tableNumber: tableIdx++,
      whitePlayerId: whiteChoice.id,
      whitePlayerName: whiteChoice.name,
      blackPlayerId: blackChoice.id,
      blackPlayerName: blackChoice.name,
      result: 'pending',
    });
  }

  // Remap table numbers for a clean consecutive sequence
  const finalPairings = pairings.map((p, idx) => ({
    ...p,
    tableNumber: idx + 1,
  }));

  return { pairings: finalPairings, updatedPlayersWithBye };
}

