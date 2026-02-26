/**
 * Kubeconfig import functionality
 * Parses kubeconfig files and imports clusters into the fleet
 */

import type { Cluster } from '/@shared/src/types/cluster';
import fs from 'node:fs';
import * as yaml from 'js-yaml';
import { spawn } from 'node:child_process';

interface KubeConfig {
  clusters?: Array<{
    name: string;
    cluster: {
      server: string;
      'certificate-authority-data'?: string;
      'insecure-skip-tls-verify'?: boolean;
    };
  }>;
  contexts?: Array<{
    name: string;
    context: {
      cluster: string;
      user: string;
      namespace?: string;
    };
  }>;
  users?: Array<{
    name: string;
    user: Record<string, any>;
  }>;
  'current-context'?: string;
}

export class KubeconfigImport {
  /**
   * Import clusters from a kubeconfig file
   */
  async importFromFile(kubeconfigPath: string, skipHealthCheck: boolean = false): Promise<Cluster[]> {
    console.log('Importing from kubeconfig:', kubeconfigPath);

    // Read and parse kubeconfig
    const content = await fs.promises.readFile(kubeconfigPath, 'utf-8');
    const kubeconfig = yaml.load(content) as KubeConfig;

    if (!kubeconfig.clusters || !kubeconfig.contexts) {
      throw new Error('Invalid kubeconfig file: missing clusters or contexts');
    }

    console.log(`Found ${kubeconfig.contexts.length} contexts in kubeconfig`);

    const importedClusters: Cluster[] = [];

    // Process each context (each context represents a cluster connection)
    for (const context of kubeconfig.contexts) {
      console.log(`Processing context: ${context.name}`);

      const clusterDef = kubeconfig.clusters.find(c => c.name === context.context.cluster);

      if (!clusterDef) {
        console.warn(`Cluster ${context.context.cluster} not found in kubeconfig`);
        continue;
      }

      try {
        // Try to get cluster info to verify it's accessible (skip if requested for speed)
        let clusterInfo = { reachable: false, version: undefined, nodeCount: undefined };

        if (!skipHealthCheck) {
          clusterInfo = await this.getClusterInfo(context.name, kubeconfigPath);
        }

        const cluster: Cluster = {
          id: `imported/${context.name}`,
          name: context.name,
          namespace: context.context.namespace || 'default',
          status: clusterInfo.reachable ? 'ready' : 'unknown',
          version: clusterInfo.version || 'unknown',
          provider: this.detectProvider(clusterDef.cluster.server),
          managed: false,
          apiEndpoint: clusterDef.cluster.server,
          kubeconfigContext: context.name,
          nodes: clusterInfo.nodeCount || 0,
          lastSeen: new Date().toISOString(),
          labels: {},
        };

        console.log(`Imported cluster: ${context.name} (${cluster.status})`);
        importedClusters.push(cluster);
      } catch (error) {
        console.error(`Failed to import context ${context.name}:`, error);

        // Still import it but mark as unknown status
        const cluster: Cluster = {
          id: `imported/${context.name}`,
          name: context.name,
          namespace: context.context.namespace || 'default',
          status: 'unknown',
          version: 'unknown',
          provider: this.detectProvider(clusterDef.cluster.server),
          managed: false,
          apiEndpoint: clusterDef.cluster.server,
          kubeconfigContext: context.name,
          nodes: 0,
          lastSeen: new Date().toISOString(),
          labels: {},
        };

        importedClusters.push(cluster);
      }
    }

    console.log(`Successfully imported ${importedClusters.length} clusters`);
    return importedClusters;
  }

  /**
   * Import a cluster from API URL and token
   */
  async importFromAPI(apiUrl: string, token: string, name?: string): Promise<Cluster> {
    // Verify connection by getting server version
    const version = await this.getServerVersion(apiUrl, token);

    const clusterName = name || this.extractNameFromUrl(apiUrl);

    const cluster: Cluster = {
      id: `imported/${clusterName}`,
      name: clusterName,
      namespace: 'default',
      status: 'ready',
      version,
      provider: this.detectProvider(apiUrl),
      managed: false,
      apiEndpoint: apiUrl,
      nodes: 0,
      lastSeen: new Date().toISOString(),
      labels: {},
    };

    return cluster;
  }

  /**
   * Get cluster information by querying the API
   */
  private async getClusterInfo(
    contextName: string,
    kubeconfigPath: string,
  ): Promise<{ reachable: boolean; version?: string; nodeCount?: number }> {
    try {
      // Get server version with timeout
      const versionOutput = await this.execKubectlWithTimeout(
        ['version', '--short', '--context', contextName, '--request-timeout=5s'],
        { KUBECONFIG: kubeconfigPath },
        10000, // 10 second timeout
      );

      // Extract server version
      const serverMatch = versionOutput.match(/Server Version: v?([\d.]+)/);
      const version = serverMatch ? `v${serverMatch[1]}` : undefined;

      // Get node count
      let nodeCount = 0;
      try {
        const nodesOutput = await this.execKubectlWithTimeout(
          ['get', 'nodes', '--no-headers', '--context', contextName, '--request-timeout=5s'],
          { KUBECONFIG: kubeconfigPath },
          10000,
        );
        nodeCount = nodesOutput.trim().split('\n').filter(Boolean).length;
      } catch (error) {
        // Node listing might fail, that's okay
        console.log(`Could not get node count for ${contextName}:`, error);
      }

      return {
        reachable: true,
        version,
        nodeCount,
      };
    } catch (error) {
      console.log(`Cluster ${contextName} not reachable:`, error);
      return {
        reachable: false,
      };
    }
  }

  /**
   * Get server version from API
   */
  private async getServerVersion(apiUrl: string, token: string): Promise<string> {
    // Use kubectl with direct API access
    try {
      const output = await this.execKubectl(
        ['version', '--short'],
        {
          KUBERNETES_SERVICE_HOST: new URL(apiUrl).hostname,
          KUBERNETES_SERVICE_PORT: new URL(apiUrl).port || '443',
        },
      );

      const serverMatch = output.match(/Server Version: v?([\d.]+)/);
      return serverMatch ? `v${serverMatch[1]}` : 'unknown';
    } catch (error) {
      throw new Error(`Failed to connect to cluster: ${error}`);
    }
  }

  /**
   * Detect provider from API URL
   */
  private detectProvider(apiUrl: string): 'docker' | 'aws' | 'azure' | 'vsphere' | 'imported' {
    const url = apiUrl.toLowerCase();

    if (url.includes('eks.amazonaws.com') || url.includes('rosa')) {
      return 'aws';
    } else if (url.includes('azmk8s.io') || url.includes('azure')) {
      return 'azure';
    } else if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('kind-')) {
      return 'docker';
    } else if (url.includes('vsphere')) {
      return 'vsphere';
    }

    return 'imported';
  }

  /**
   * Extract a cluster name from API URL
   */
  private extractNameFromUrl(apiUrl: string): string {
    try {
      const url = new URL(apiUrl);
      const hostname = url.hostname;

      // Extract first part of hostname as name
      const parts = hostname.split('.');
      return parts[0] || 'imported-cluster';
    } catch (error) {
      return 'imported-cluster';
    }
  }

  /**
   * Execute kubectl command with timeout
   */
  private async execKubectlWithTimeout(
    args: string[],
    env: Record<string, string> = {},
    timeoutMs: number = 10000,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Ensure PATH includes common locations for Homebrew and system binaries
      const enhancedPath = [
        '/opt/homebrew/bin',
        '/usr/local/bin',
        '/usr/bin',
        '/bin',
        process.env.PATH || '',
      ].join(':');

      const proc = spawn('kubectl', args, {
        env: {
          ...process.env,
          PATH: enhancedPath,
          ...env,
        },
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // Set timeout
      const timeout = setTimeout(() => {
        timedOut = true;
        proc.kill();
        reject(new Error(`kubectl command timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      proc.stdout.on('data', data => {
        stdout += data.toString();
      });

      proc.stderr.on('data', data => {
        stderr += data.toString();
      });

      proc.on('close', code => {
        clearTimeout(timeout);
        if (timedOut) return;

        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`kubectl failed with code ${code}: ${stderr || stdout}`));
        }
      });

      proc.on('error', error => {
        clearTimeout(timeout);
        if (!timedOut) {
          reject(error);
        }
      });
    });
  }
}
}
