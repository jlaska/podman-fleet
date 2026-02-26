/**
 * PodmanFleetApi is the interface that defines the RPC contract between frontend and backend.
 * Any changes here should also be made to backend/src/api-impl.ts
 */

import type { Cluster, FleetMetrics, ManagementClusterStatus } from './types/cluster';

export abstract class PodmanFleetApi {
  // Management Cluster operations
  abstract getManagementClusterStatus(): Promise<ManagementClusterStatus>;
  abstract initializeManagementCluster(): Promise<void>;
  abstract deleteManagementCluster(): Promise<void>;

  // Fleet operations
  abstract listClusters(): Promise<Cluster[]>;
  abstract getFleetMetrics(): Promise<FleetMetrics>;

  // Cluster operations
  abstract getCluster(name: string): Promise<Cluster | undefined>;
  abstract refreshCluster(name: string): Promise<void>;
  abstract deleteCluster(name: string): Promise<void>;

  // Import operations
  abstract importCluster(kubeconfigPath: string): Promise<void>;
}
