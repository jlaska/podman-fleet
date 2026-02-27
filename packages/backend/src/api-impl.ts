import * as podmanDesktopApi from '@podman-desktop/api';
import type { OpenShiftManagementApi, CreateClusterOptions } from '/@shared/src/OpenShiftManagementApi';
import type { Cluster, ClusterMetrics, ManagementClusterStatus } from '/@shared/src/types/cluster';
import { ManagementCluster } from './capi/management-cluster';
import { ClusterOperations } from './capi/cluster-operations';
import { ClusterCreator } from './capi/cluster-creator';
import { ClusterStore } from './storage/cluster-store';
import { KubeconfigImport } from './import/kubeconfig-import';

/**
 * OpenShiftManagementApi implementation
 * Provides all backend operations for cluster management
 */
export class openShiftManagementApi implements OpenShiftManagementApi {
  private managementCluster: ManagementCluster;
  private clusterOps: ClusterOperations;
  private clusterCreator: ClusterCreator;
  private clusterStore: ClusterStore;
  private kubeconfigImport: KubeconfigImport;

  constructor(private readonly extensionContext: podmanDesktopApi.ExtensionContext) {
    this.managementCluster = new ManagementCluster(extensionContext);
    this.clusterOps = new ClusterOperations();
    this.clusterCreator = new ClusterCreator();
    this.clusterStore = new ClusterStore(extensionContext);
    this.kubeconfigImport = new KubeconfigImport();
  }

  /**
   * Get management cluster status
   */
  async getManagementClusterStatus(): Promise<ManagementClusterStatus> {
    console.log('Getting management cluster status...');
    const status = await this.managementCluster.getStatus();
    console.log('Management cluster status:', status);
    return status;
  }

  /**
   * Initialize management cluster
   */
  async initializeManagementCluster(): Promise<void> {
    try {
      const status = await this.managementCluster.getStatus();

      if (status.exists && status.healthy) {
        await podmanDesktopApi.window.showInformationMessage('Management cluster already exists and is healthy');
        return;
      }

      if (status.exists && !status.healthy) {
        // Cluster exists but is unhealthy - offer to recreate
        const result = await podmanDesktopApi.window.showWarningMessage(
          `Management cluster "${status.name}" exists but is not healthy. Would you like to delete and recreate it?`,
          'Recreate',
          'Cancel',
        );

        if (result === 'Recreate') {
          await this.managementCluster.delete(true); // Silent delete
          await this.managementCluster.create();
        }
        return;
      }

      // Cluster doesn't exist - create it
      await this.managementCluster.create();
    } catch (error) {
      console.error('Error initializing management cluster:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await podmanDesktopApi.window.showErrorMessage(`Failed to initialize management cluster: ${errorMessage}`);
      throw error;
    }
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
    console.log('Listing all clusters...');
    const clusters: Cluster[] = [];

    // Get CAPI-managed clusters
    try {
      const capiClusters = await this.clusterOps.listCAPIClusters();
      console.log('CAPI clusters:', capiClusters.length);
      clusters.push(...capiClusters);
    } catch (error) {
      console.error('Error listing CAPI clusters:', error);
    }

    // Get imported clusters
    console.log('Getting imported clusters from store...');
    const importedClusters = this.clusterStore.getImportedClusters();
    console.log('Imported clusters:', importedClusters.length);
    clusters.push(...importedClusters);

    console.log('Total clusters to return:', clusters.length);
    return clusters;
  }

  /**
   * Get cluster metrics
   */
  async getClusterMetrics(): Promise<ClusterMetrics> {
    console.log('Getting cluster metrics...');
    const clusters = await this.listClusters();

    const metrics: ClusterMetrics = {
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

    console.log('Cluster metrics calculated:', metrics);
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
    return this.clusterStore.getImportedCluster(name);
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
   * Create a cluster
   */
  async createCluster(options: CreateClusterOptions): Promise<void> {
    try {
      // Check if management cluster is healthy
      const status = await this.managementCluster.getStatus();
      if (!status.exists || !status.healthy) {
        throw new Error('Management cluster is not healthy. Please initialize it first.');
      }

      await this.clusterCreator.createLocalCluster(options);
    } catch (error) {
      console.error('Error creating cluster:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await podmanDesktopApi.window.showErrorMessage(`Failed to create cluster: ${errorMessage}`);
      throw error;
    }
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
      this.clusterStore.removeImportedCluster(name);
      await podmanDesktopApi.window.showInformationMessage(`Cluster "${name}" removed from management`);
    }
  }

  /**
   * Import clusters from kubeconfig file
   */
  async importFromKubeconfig(kubeconfigPath: string): Promise<void> {
    try {
      console.log('Starting import from kubeconfig:', kubeconfigPath);

      // Skip health checks for faster import (we can refresh later)
      const clusters = await this.kubeconfigImport.importFromFile(kubeconfigPath, true);

      if (clusters.length === 0) {
        await podmanDesktopApi.window.showWarningMessage('No clusters found in kubeconfig file');
        return;
      }

      // Store all imported clusters
      for (const cluster of clusters) {
        this.clusterStore.addImportedCluster(cluster);
      }

      await podmanDesktopApi.window.showInformationMessage(
        `Successfully imported ${clusters.length} cluster${clusters.length > 1 ? 's' : ''}`,
      );
    } catch (error) {
      console.error('Error importing from kubeconfig:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await podmanDesktopApi.window.showErrorMessage(`Failed to import kubeconfig: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Import cluster from API URL and token
   */
  async importFromAPI(apiUrl: string, token: string, name?: string): Promise<void> {
    try {
      const cluster = await this.kubeconfigImport.importFromAPI(apiUrl, token, name);
      this.clusterStore.addImportedCluster(cluster);

      await podmanDesktopApi.window.showInformationMessage(`Cluster "${cluster.name}" imported successfully`);
    } catch (error) {
      console.error('Error importing from API:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await podmanDesktopApi.window.showErrorMessage(`Failed to import cluster: ${errorMessage}`);
      throw error;
    }
  }
}
