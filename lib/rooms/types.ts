import type { CustomListGame, SteamListGame } from "./filters";

export type LibraryErrorKind = "rate_limit" | "network" | "unconfigured";

export type RoomPlayer = {
  steamId: string;
  personaName: string;
  avatarUrl: string;
  libraryStatus: "ok" | "private" | "error";
  libraryError: LibraryErrorKind | null;
  canVote: boolean;
  gameCount: number | null;
};

export type RoomCustomGame = {
  id: string;
  name: string;
  genreIds: number[];
  addedBy: string;
};

export type RoomRecord = {
  code: string;
  hostSteamId: string;
  createdAt: number;
  players: RoomPlayer[];
  customGames: RoomCustomGame[];
  votes: Record<string, Record<string, "yes" | "no">>;
};

export type MissingLibraryView = {
  steamId: string;
  personaName: string;
  libraryStatus: "private" | "error";
  libraryError: LibraryErrorKind | null;
};

export type GamesPayload = {
  visibleCount: number;
  playerCount: number;
  minOwners: number;
  missingLibraries: MissingLibraryView[];
  games: SteamListGame[];
  customGames: CustomListGame[];
  pendingAppIds: number[];
};

export type Viewer = {
  steamId: string | null;
  isHost: boolean;
  isMember: boolean;
  canVote: boolean;
};
