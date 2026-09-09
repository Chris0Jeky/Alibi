/** Proposed integration contract. Not implemented or compiled against current Alibi. */
export type ContentIdentity = Readonly<{
  registry: 'official' | 'challenge' | 'estate';
  id: string;
  definitionRevision: number;
  semanticRewardId: string;
}>;
export type CommittedCompletion = Readonly<{
  content: ContentIdentity;
  receiptId: string;
  guided: boolean;
}>;
export type EstatePreferences = Readonly<{
  reducedMotion: boolean;
  sound: boolean;
  highContrast: boolean;
  textScale: number;
  followStory: boolean;
}>;
export interface EstateHost {
  /** Reconciles from authoritative saved records, not arbitrary DOM events. */
  readCommittedCompletions(signal: AbortSignal): Promise<readonly CommittedCompletion[]>;
  onProgressChanged(callback: () => void): () => void;
  openPuzzle(content: ContentIdentity, returnRoomId: string): Promise<void>;
  readPreferences(): EstatePreferences;
  onPreferencesChanged(callback: (value: EstatePreferences) => void): () => void;
  /** Storage implementation must validate, bound, and preserve unknown versions. */
  loadEstate(signal: AbortSignal): Promise<{ value: unknown; revision: string }>;
  saveEstate(value: unknown, expectedRevision: string, signal: AbortSignal): Promise<{ revision: string }>;
  announce(message: string): void;
}
export interface EstateActivity {
  route(roomId?: string): void;
  flush(): Promise<void>;
  dispose(): void;
}
