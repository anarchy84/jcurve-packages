/** Shared foreground, UMP and initialization policy. No ad is prefetched here. */
import type { AdsEnv } from './ads';
export type RequestPolicy = {
    test: boolean;
    testDevices?: string[];
    /** Conservative default: true. false still requires UMP personalization choices. */
    requestNonPersonalizedAdsOnly?: boolean;
};
export type RequestPrivacy = {
    requestNonPersonalizedAdsOnly: boolean;
};
export type FullscreenLease = {
    release: () => void;
};
export declare function isForeground(env: AdsEnv): boolean;
export declare function acquireFullscreen(env: AdsEnv, sdk: any): FullscreenLease | null;
export declare function bounded<T>(promise: Promise<T>, ms: number, message: string): Promise<T>;
/** Failed UMP refresh may use a still-valid previous consent, never a fabricated one. */
export declare function prepareRequest(env: AdsEnv, sdk: any, policy: RequestPolicy, stillNeeded?: () => boolean): Promise<RequestPrivacy>;
export declare function safeCall(fn: ((...args: any[]) => void) | undefined, ...args: any[]): void;
export declare function adError(error: any): string;
