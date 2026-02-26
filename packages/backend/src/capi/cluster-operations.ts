/**
 * Cluster operations using CAPI
 */

import type { Cluster, ClusterStatus } from '/@shared/src/types/cluster';
import { spawn } from 'node:child_process';
import { MGMT_CLUSTER_NAME } from './management-cluster';

export class ClusterOperations {
  /**
   * List all CAPI-managed clusters
   */
  async listCAPIClusters(): Promise<Cluster[]> {
    try {
      const context = `kind-${MGMT_CLUSTER_NAME}`;

      // Get all clusters from CAPI
      const output = await this.execKubectl([
        'get', 'clusters.cluster.x-k8s.io',
        '-A',
        '-o', 'json',
        '--context', context,
      ]);

      const result = JSON.parse(output);
      const clusters: Cluster[] = [];

      for (const item of result.items || []) {
        const cluster = this.parseClusterFromCAPI(item);
        if (cluster) {
          clusters.push(cluster);
        }
      }

      return clusters;
    } catch (error) {
      console.error('Error listing CAPI clusters:', error);
      return [];
    }
  }

  /**
   * Get a specific cluster by name
   */
  async getCluster(name: string, namespace: string = 'default'): Promise<Cluster | undefined> {
    try {
      const context = `kind-${MGMT_CLUSTER_NAME}`;

      const output = await this.execKubectl([
        'get', 'cluster.cluster.x-k8s.io', name,
        '-n', namespace,
        '-o', 'json',
        '--context', context,
      ]);

      const item = JSON.parse(output);
      return this.parseClusterFromCAPI(item);
    } catch (error) {
      console.error(`Error getting cluster ${name}:`, error);
      return undefined;
    }
  }

  /**
   * Delete a CAPI-managed cluster
   */
  async deleteCluster(name: string, namespace: string = 'default'): Promise<void> {
    const context = `kind-${MGMT_CLUSTER_NAME}`;

    await this.execKubectl([
      'delete', 'cluster.cluster.x-k8s.io', name,
      '-n', namespace,
      '--context', context,
    ]);

    console.log(`Cluster ${name} deleted`);
  }

  /**
   * Parse CAPI cluster resource into our Cluster type
   */
  private parseClusterFromCAPI(item: any): Cluster | undefined {
    try {
      const metadata = item.metadata;
      const spec = item.spec;
      const status = item.status;

      // Determine provider from infrastructure ref
      let provider: 'docker' | 'aws' | 'azure' | 'vsphere' | 'imported' = 'docker';
      if (spec.infrastructureRef?.kind) {
        const kind = spec.infrastructureRef.kind.toLowerCase();
        if (kind.includes('docker')) provider = 'docker';
        else if (kind.includes('aws') || kind.includes('rosa')) provider = 'aws';
        else if (kind.includes('azure') || kind.includes('aro')) provider = 'azure';
        else if (kind.includes('vsphere')) provider = 'vsphere';
      }

      // Map CAPI phase to our status
      const phase = status?.phase || 'Unknown';
      let clusterStatus: ClusterStatus = 'unknown';
      switch (phase) {
        case 'Provisioned':
          clusterStatus = 'ready';
          break;
        case 'Provisioning':
          clusterStatus = 'provisioning';
          break;
        case 'Failed':
          clusterStatus = 'failed';
          break;
        case 'Deleting':
          clusterStatus = 'deleting';
          break;
      }

      // Get conditions
      const conditions = (status?.conditions || []).map((c: any) => ({
        type: c.type,
        status: c.status,
        severity: c.severity,
        lastTransitionTime: c.lastTransitionTime,
        reason: c.reason,
        message: c.message,
      }));

      const cluster: Cluster = {
        id: `${metadata.namespace}/${metadata.name}`,
        name: metadata.name,
        namespace: metadata.namespace,
        status: clusterStatus,
        version: spec.topology?.version || 'unknown',
        provider,
        managed: true,
        capiMetadata: {
          infrastructureRef: `${spec.infrastructureRef?.kind}/${spec.infrastructureRef?.name}`,
          controlPlaneRef: `${spec.controlPlaneRef?.kind}/${spec.controlPlaneRef?.name}`,
          phase,
          conditions,
        },
        apiEndpoint: status?.controlPlaneEndpoint?.host || '',
        nodes: 0, // Would need to query machines
        lastSeen: new Date().toISOString(),
        labels: metadata.labels || {},
      };

      return cluster;
    } catch (error) {
      console.error('Error parsing CAPI cluster:', error);
      return undefined;
    }
  }

  /**
   * Execute kubectl command
   */
  private async execKubectl(args: string[]): Promise<string> {
    return this.execCommand('kubectl', args);
  }

  /**
   * Execute a command and return stdout
   */
  private async execCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      // Ensure PATH includes common locations for Homebrew and system binaries
      const enhancedPath = [
        '/opt/homebrew/bin',
        '/usr/local/bin',
        '/usr/bin',
        '/bin',
        process.env.PATH || '',
      ].join(':');

      const proc = spawn(command, args, {
        env: {
          ...process.env,
          PATH: enhancedPath,
        },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', data => {
        stdout += data.toString();
      });

      proc.stderr.on('data', data => {
        stderr += data.toString();
      });

      proc.on('close', code => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
        }
      });

      proc.on('error', error => {
        reject(error);
      });
    });
  }
}
