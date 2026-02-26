import * as podmanDesktopApi from '@podman-desktop/api';
import type { PodmanFleetApi } from '/@shared/src/PodmanFleetApi';
import type { Cluster, FleetMetrics, ManagementClusterStatus } from '/@shared/src/types/cluster';
import { ManagementCluster } from './capi/management-cluster';
import { ClusterOperations } from './capi/cluster-operations';
import { FleetStore } from './storage/fleet-store';

/**
 * PodmanFleetApi implementation
 * Provides all backend operations for fleet management
 */
export class podmanFleetApi implements PodmanFleetApi {
  private managementCluster: ManagementCluster;
  private clusterOps: ClusterOperations;
  private fleetStore: FleetStore;

  constructor(private readonly extensionContext: podmanDesktopApi.ExtensionContext) {
    this.managementCluster = new ManagementCluster(extensionContext);
    this.clusterOps = new ClusterOperations();
    this.fleetStore = new FleetStore(extensionContext);
  }

  /**
   * Get management cluster status
   */
  async getManagementClusterStatus(): Promise<ManagementClusterStatus> {
    return this.managementCluster.getStatus();
  }

  /**
   * Initialize management cluster
   */
  async initializeManagementCluster(): Promise<void> {
    const status = await this.managementCluster.getStatus();
    if (status.exists) {
      await podmanDesktopApi.window.showInformationMessage('Management cluster already exists');
      return;
    }

    await this.managementCluster.create();
  }

  /**
   * Delete management cluster
   */
  async deleteManagementCluster(): Promise<void> {
    const result = await podmanDesktopApi.window.showWarningMessage(
      'Delete management cluster? This will remove all CAPI-managed clusters.',
      'Delete',
      'Cancel',
    );

    if (result === 'Delete') {
      await this.managementCluster.delete();
    }
  }

  /**
   * List all clusters (CAPI-managed + imported)
   */
  async listClusters(): Promise<Cluster[]> {
    const clusters: Cluster[] = [];

    // Get CAPI-managed clusters
    try {
      const capiClusters = await this.clusterOps.listCAPIClusters();
      clusters.push(...capiClusters);
    } catch (error) {
      console.error('Error listing CAPI clusters:', error);
    }

    // Get imported clusters
    const importedClusters = this.fleetStore.getImportedClusters();
    clusters.push(...importedClusters);

    return clusters;
  }

  /**
   * Get fleet metrics
   */
  async getFleetMetrics(): Promise<FleetMetrics> {
    const clusters = await this.listClusters();

    const metrics: FleetMetrics = {
      totalClusters: clusters.length,
      readyClusters: 0,
      provisioningClusters: 0,
      failedClusters: 0,
      providerDistribution: {
        docker: 0,
        aws: 0,
        azure: 0,
        vsphere: 0,
        imported: 0,
      },
      versionDistribution: {},
    };

    for (const cluster of clusters) {
      // Count by status
      switch (cluster.status) {
        case 'ready':
          metrics.readyClusters++;
          break;
        case 'provisioning':
          metrics.provisioningClusters++;
          break;
        case 'failed':
          metrics.failedClusters++;
          break;
      }

      // Count by provider
      metrics.providerDistribution[cluster.provider]++;

      // Count by version
      const version = cluster.version || 'unknown';
      metrics.versionDistribution[version] = (metrics.versionDistribution[version] || 0) + 1;
    }

    return metrics;
  }

  /**
   * Get a specific cluster
   */
  async getCluster(name: string): Promise<Cluster | undefined> {
    // Try CAPI clusters first
    const capiCluster = await this.clusterOps.getCluster(name);
    if (capiCluster) {
      return capiCluster;
    }

    // Try imported clusters
    return this.fleetStore.getImportedCluster(name);
  }

  /**
   * Refresh cluster data
   */
  async refreshCluster(name: string): Promise<void> {
    const cluster = await this.getCluster(name);
    if (!cluster) {
      throw new Error(`Cluster ${name} not found`);
    }

    // For now, just re-fetch the cluster data
    // In the future, we could update health status by querying the cluster
    console.log('Refreshing cluster:', name);
  }

  /**
   * Delete a cluster
   */
  async deleteCluster(name: string): Promise<void> {
    const cluster = await this.getCluster(name);
    if (!cluster) {
      throw new Error(`Cluster ${name} not found`);
    }

    const result = await podmanDesktopApi.window.showWarningMessage(
      `Delete cluster "${name}"?`,
      'Delete',
      'Cancel',
    );

    if (result !== 'Delete') {
      return;
    }

    if (cluster.managed) {
      // Delete CAPI cluster
      await this.clusterOps.deleteCluster(name, cluster.namespace);
      await podmanDesktopApi.window.showInformationMessage(`Cluster "${name}" is being deleted`);
    } else {
      // Remove imported cluster
      this.fleetStore.removeImportedCluster(name);
      await podmanDesktopApi.window.showInformationMessage(`Cluster "${name}" removed from fleet`);
    }
  }

  /**
   * Import a cluster via kubeconfig
   */
  async importCluster(kubeconfigPath: string): Promise<void> {
    // For now, this is a placeholder
    // In Phase 3, we'll implement full kubeconfig parsing
    await podmanDesktopApi.window.showInformationMessage(
      'Cluster import will be implemented in Phase 3',
    );
  }
}
