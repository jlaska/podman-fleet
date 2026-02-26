/**
 * Cluster metadata storage for imported clusters and extension state
 */

import type { Cluster } from '/@shared/src/types/cluster';
import * as extensionApi from '@podman-desktop/api';
import fs from 'node:fs';
import path from 'node:path';

interface ClusterData {
  importedClusters: Cluster[];
  version: string;
}

export class ClusterStore {
  private storageFile: string;
  private data: ClusterData = {
    importedClusters: [],
    version: '1.0.0',
  };

  constructor(private readonly extensionContext: extensionApi.ExtensionContext) {
    // Use extension storage directory
    const storagePath = extensionContext.storagePath;
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }
    this.storageFile = path.join(storagePath, 'cluster-data.json');
    this.load();
  }

  /**
   * Load cluster data from disk
   */
  private load(): void {
    try {
      if (fs.existsSync(this.storageFile)) {
        const content = fs.readFileSync(this.storageFile, 'utf-8');
        this.data = JSON.parse(content);
        console.log('Loaded cluster data:', this.data.importedClusters.length, 'imported clusters');
      }
    } catch (error) {
      console.error('Error loading cluster data:', error);
      // Start with empty data on error
    }
  }

  /**
   * Save cluster data to disk
   */
  private save(): void {
    try {
      fs.writeFileSync(this.storageFile, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving cluster data:', error);
    }
  }

  /**
   * Get all imported clusters
   */
  getImportedClusters(): Cluster[] {
    return [...this.data.importedClusters];
  }

  /**
   * Add an imported cluster
   */
  addImportedCluster(cluster: Cluster): void {
    // Remove existing cluster with same name if exists
    this.data.importedClusters = this.data.importedClusters.filter(c => c.name !== cluster.name);

    // Add new cluster
    this.data.importedClusters.push(cluster);
    this.save();
  }

  /**
   * Remove an imported cluster
   */
  removeImportedCluster(name: string): void {
    this.data.importedClusters = this.data.importedClusters.filter(c => c.name !== name);
    this.save();
  }

  /**
   * Get an imported cluster by name
   */
  getImportedCluster(name: string): Cluster | undefined {
    return this.data.importedClusters.find(c => c.name === name);
  }

  /**
   * Clear all imported clusters
   */
  clearImportedClusters(): void {
    this.data.importedClusters = [];
    this.save();
  }
}
