// Structured, scope-prefixed logger for diagnostics. No-op unless a debug flag
// is on, so it can be left in place and removed later without noise.
// Usage: dlog("Analytics", "message", { data })  →  [Analytics] message { data }
export function dlog(scope, ...args) {
    if (
        process.env.NEXT_PUBLIC_DEBUG_ANALYTICS !== "true" &&
        process.env.DEBUG_ANALYTICS !== "true"
    ) {
        return;
    }
    console.log(`[${scope}]`, ...args);
}
