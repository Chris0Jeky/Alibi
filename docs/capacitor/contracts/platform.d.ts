/** Design contract only: no implementation or plugin registration is supplied here.
 * Runtime implementations must validate all bridge inputs; TypeScript brands are not security checks.
 * Shared reducers must not import Capacitor or depend on these device operations.
 */
export type Target = 'web' | 'android';
export type DomainId = 'cabinet' | 'club' | 'quiet-wing' | 'challenges' | 'castle';
export type Sha256 = string & { readonly __sha256: unique symbol };
export type DocumentToken = string & { readonly __documentToken: unique symbol };
export type ReviewToken = string & { readonly __reviewToken: unique symbol };
export type OperationId = string & { readonly __operationId: unique symbol };
export type FailureCode =
  | 'unavailable'
  | 'cancelled'
  | 'denied'
  | 'timeout'
  | 'quota'
  | 'conflict'
  | 'invalid'
  | 'unsupported'
  | 'protected';
export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: FailureCode; readonly message: string };
export interface Lease {
  /** Idempotent; removes only resources/listeners owned by this lease. */
  dispose(): void | Promise<void>;
}
export interface OperationOptions {
  readonly operationId: OperationId;
  readonly timeoutMs: number;
  readonly signal?: AbortSignal;
}
export interface BuildIdentity {
  readonly target: Target;
  readonly sourceSha: string;
  readonly payloadSha256: Sha256;
  readonly appVersion: string;
  readonly versionCode?: number;
  readonly contentManifestRevision: string;
  readonly rulesCompatibility: Readonly<Record<string, number>>;
}
export interface Capabilities {
  readonly target: Target;
  readonly nativeFeedback: boolean;
  readonly userDocuments: boolean;
  readonly recoveryVault: boolean;
  readonly remoteTelemetry: false; // MVP decision; changing this requires a new consent/security review.
}
export type LifecycleEvent =
  | { readonly kind: 'pause' | 'resume' | 'back' }
  | { readonly kind: 'external-result'; readonly operationId: OperationId; readonly document: DocumentToken }
  | { readonly kind: 'renderer-recreated' };
export interface FeedbackPort {
  /** Best effort and non-blocking. Implementations catch native rejection internally. */
  emit(kind: 'select' | 'invalid' | 'place' | 'clear' | 'complete'): void;
  setPreferences(value: { sound: boolean; haptics: boolean; reducedMotion: boolean }): void;
  suspend(): void;
  dispose(): void;
}
export interface DocumentsPort {
  /** Opaque token scoped to a user selection; caller cannot supply arbitrary native paths. */
  pickBackup(options: OperationOptions): Promise<Result<DocumentToken>>;
  readLimited(token: DocumentToken, maxUtf8Bytes: number, options: OperationOptions): Promise<Result<string>>;
  /** Resolves after the provider stream is closed, not merely after opening a share sheet. */
  writeBackup(
    request: { suggestedName: string; utf8Payload: string; digest: Sha256 },
    options: OperationOptions,
  ): Promise<Result<{ verifiedReadback: boolean; bytes: number }>>;
  release(token: DocumentToken): Promise<void>;
}
export interface CommittedSnapshot {
  readonly domain: DomainId;
  readonly sourceRevisionVector: Readonly<Record<string, number>>;
  readonly sourceDigest: Sha256;
  readonly envelopeVersions: Readonly<Record<string, number>>;
  readonly rulesCompatibility: Readonly<Record<string, number>>;
  readonly utf8Payload: string;
  readonly payloadLength: number;
  readonly payloadSha256: Sha256;
}
export interface CheckpointReceipt {
  readonly domain: DomainId;
  readonly generation: number;
  readonly sourceDigest: Sha256;
  readonly payloadSha256: Sha256;
  readonly operationId: OperationId;
}
export interface RecoveryPort {
  checkpoint(
    snapshot: CommittedSnapshot,
    expectedGeneration: number,
    options: OperationOptions,
  ): Promise<Result<CheckpointReceipt>>;
  /** Reading is not restoring. Unknown/corrupt generations stay protected. */
  read(domain: DomainId, generation: number, options: OperationOptions): Promise<Result<CommittedSnapshot>>;
  list(domain: DomainId, options: OperationOptions): Promise<Result<readonly CheckpointReceipt[]>>;
}
export interface AssetPort {
  /** IDs/revisions are resolved against a trusted manifest; arbitrary paths are not accepted. */
  resolve(
    id: string,
    revision: string,
    options: OperationOptions,
  ): Promise<Result<{
    status: 'bundled' | 'verified-local' | 'compact-fallback';
    url: string;
    digest: Sha256;
    bytes: number;
  }>>;
}
export interface DomainStatus {
  readonly domain: DomainId;
  readonly mode: 'indexeddb' | 'local-fallback' | 'session' | 'protected';
  readonly dirty: boolean;
  readonly checkpointCurrent: boolean;
  readonly sourceRevisionVector: Readonly<Record<string, number>>;
  readonly problemCode?: FailureCode;
}
export interface SaveDomain {
  readonly id: DomainId;
  inspect(options: OperationOptions): Promise<Result<DomainStatus>>;
  flush(options: OperationOptions): Promise<Result<DomainStatus>>;
  exportCommitted(options: OperationOptions): Promise<Result<CommittedSnapshot>>;
  /** Runtime schema/rules checks and bounded worker validation precede preview creation. */
  previewRestore(
    utf8Payload: string,
    options: OperationOptions,
  ): Promise<Result<{ token: ReviewToken; expectedDigest: Sha256; warnings: readonly string[] }>>;
  /** Explicit UI approval, rechecked revisions and recovery-before-write are required. */
  commitRestore(
    token: ReviewToken,
    expectedDigest: Sha256,
    options: OperationOptions,
  ): Promise<Result<DomainStatus>>;
  subscribeCommitted(listener: (status: DomainStatus) => void): Lease;
}
export interface Platform {
  readonly build: BuildIdentity;
  capabilities(): Readonly<Capabilities>;
  readonly feedback: FeedbackPort;
  readonly documents: DocumentsPort;
  readonly recovery: RecoveryPort;
  readonly assets: AssetPort;
  subscribeLifecycle(listener: (event: LifecycleEvent) => void): Promise<Lease>;
  /** Opens only approved support/credit/privacy purposes outside the privileged WebView. */
  openExternal(purposeId: string, options: OperationOptions): Promise<Result<void>>;
}
