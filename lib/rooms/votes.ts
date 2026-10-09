export type VoteValue = "yes" | "no";
export type VoteMap = Record<string, Record<string, VoteValue>>;

export type VoteTally = {
  yes: number;
  no: number;
  pending: number;
  unanimous: boolean;
  majority: boolean;
};

export function tallyVote(voterIds: string[], votes: VoteMap, gameId: string): VoteTally {
  let yes = 0;
  let no = 0;
  for (const voterId of voterIds) {
    const value = votes[voterId]?.[gameId];
    if (value === "yes") yes += 1;
    else if (value === "no") no += 1;
  }
  const pending = voterIds.length - yes - no;
  return {
    yes,
    no,
    pending,
    unanimous: voterIds.length > 0 && yes === voterIds.length,
    majority: yes > voterIds.length / 2,
  };
}
