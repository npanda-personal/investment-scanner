/**
 * Engine-level constants for Earnings-Intelligence.
 *
 * Kept in a dependency-free module so both the service (which produces snapshots)
 * and the repository (which stamps the version on every persisted row) can import
 * it without creating a service↔repository import cycle.
 */

/** Version stamped on every materialised snapshot row; bump on scoring changes. */
export const CALCULATION_VERSION = 'earnings-intelligence-v1';
