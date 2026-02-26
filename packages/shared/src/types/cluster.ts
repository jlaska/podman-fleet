/**
 * Cluster types and interfaces for Podman Fleet
 */

export type ClusterStatus = 'ready' | 'provisioning' | 'failed' | 'deleting' | 'unknown';
export type ClusterProvider = 'docker' | 'aws' | 'azure' | 'vsphere' | 'imported';

export interface Condition {
  type: string;
  status: string;
  severity?: string;
  lastTransitionTime: string;
  reason?: string;
  message?: string;
}

export interface CAPIMetadata {
  infrastructureRef: string;
  controlPlaneRef: string;
  phase: string;
  conditions: Condition[];
}

export interface Cluster {
  id: string;
  name: string;
  namespace: string;
  status: ClusterStatus;
  version: string;
  provider: ClusterProvider;
  managed: boolean;

  capiMetadata?: CAPIMetadata;

  apiEndpoint: string;
  kubeconfigContext?: string;
  nodes: number;
  lastSeen: string;
  region?: string;
  labels: Record<string, string>;
}

export interface ClusterMetrics {
  totalClusters: number;
  readyClusters: number;
  provisioningClusters: number;
  failedClusters: number;
  providerDistribution: Record<ClusterProvider, number>;
  versionDistribution: Record<string, number>;
}

export interface ManagementClusterStatus {
  exists: boolean;
  healthy: boolean;
  name: string;
  providers: string[];
  message?: string;
}
