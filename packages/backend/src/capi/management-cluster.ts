/**
 * Management Cluster lifecycle management
 * Creates and manages the Kind cluster that hosts CAPI controllers
 */

import * as extensionApi from '@podman-desktop/api';
import { spawn } from 'node:child_process';
import type { ManagementClusterStatus } from '/@shared/src/types/cluster';

export const MGMT_CLUSTER_NAME = 'podman-fleet-mgmt';

export class ManagementCluster {
  constructor(private readonly extensionContext: extensionApi.ExtensionContext) {}

  /**
   * Check if the management cluster exists and is healthy
   */
  async getStatus(): Promise<ManagementClusterStatus> {
    try {
      // Check if kind CLI is available
      const kindExists = await this.checkCommandExists('kind');
      if (!kindExists) {
        return {
          exists: false,
          healthy: false,
          name: MGMT_CLUSTER_NAME,
          providers: [],
          message: 'kind CLI not found',
        };
      }

      // Check if cluster exists
      const clusters = await this.execCommand('kind', ['get', 'clusters']);
      const clusterExists = clusters.split('\n').includes(MGMT_CLUSTER_NAME);

      if (!clusterExists) {
        return {
          exists: false,
          healthy: false,
          name: MGMT_CLUSTER_NAME,
          providers: [],
        };
      }

      // Check if cluster is healthy by querying nodes
      try {
        await this.execKubectl(['get', 'nodes', '--context', `kind-${MGMT_CLUSTER_NAME}`]);
      } catch (error) {
        return {
          exists: true,
          healthy: false,
          name: MGMT_CLUSTER_NAME,
          providers: [],
          message: 'Cluster not responding',
        };
      }

      // Get installed CAPI providers
      const providers = await this.getInstalledProviders();

      return {
        exists: true,
        healthy: true,
        name: MGMT_CLUSTER_NAME,
        providers,
      };
    } catch (error) {
      console.error('Error getting management cluster status:', error);
      return {
        exists: false,
        healthy: false,
        name: MGMT_CLUSTER_NAME,
        providers: [],
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create the management cluster with Kind using Podman provider
   */
  async create(): Promise<void> {
    console.log('Creating management cluster:', MGMT_CLUSTER_NAME);

    // Ensure kind is installed
    await this.ensureKindInstalled();

    // Create cluster with Podman provider
    await extensionApi.window.withProgress(
      { location: extensionApi.ProgressLocation.TASK_WIDGET, title: 'Creating management cluster' },
      async progress => {
        progress.report({ increment: 10, message: 'Starting Kind cluster creation...' });

        try {
          await this.execCommand(
            'kind',
            ['create', 'cluster', '--name', MGMT_CLUSTER_NAME],
            {
              KIND_EXPERIMENTAL_PROVIDER: 'podman',
            },
          );

          progress.report({ increment: 50, message: 'Cluster created, waiting for nodes...' });

          // Wait for node to be ready
          await this.waitForNodeReady();

          progress.report({ increment: 20, message: 'Installing CAPI providers...' });

          // Install CAPI providers
          await this.installCAPIProviders();

          progress.report({ increment: 20, message: 'Management cluster ready' });
        } catch (error) {
          throw new Error(`Failed to create management cluster: ${error}`);
        }
      },
    );

    await extensionApi.window.showInformationMessage(
      `Management cluster "${MGMT_CLUSTER_NAME}" created successfully`,
    );
  }

  /**
   * Delete the management cluster
   */
  async delete(): Promise<void> {
    console.log('Deleting management cluster:', MGMT_CLUSTER_NAME);

    try {
      await this.execCommand('kind', ['delete', 'cluster', '--name', MGMT_CLUSTER_NAME]);
      await extensionApi.window.showInformationMessage(`Management cluster "${MGMT_CLUSTER_NAME}" deleted`);
    } catch (error) {
      throw new Error(`Failed to delete management cluster: ${error}`);
    }
  }

  /**
   * Install CAPI core and Docker provider
   */
  private async installCAPIProviders(): Promise<void> {
    // Ensure clusterctl is installed
    await this.ensureClusterctlInstalled();

    const context = `kind-${MGMT_CLUSTER_NAME}`;

    // Initialize CAPI with Docker provider
    await this.execCommand(
      'clusterctl',
      ['init', '--infrastructure', 'docker', '--wait-providers'],
      {
        KUBECONFIG_CONTEXT: context,
      },
    );

    console.log('CAPI providers installed successfully');
  }

  /**
   * Get list of installed CAPI providers
   */
  private async getInstalledProviders(): Promise<string[]> {
    try {
      const context = `kind-${MGMT_CLUSTER_NAME}`;

      // List all namespaces matching CAPI provider pattern
      const output = await this.execKubectl([
        'get', 'namespaces',
        '-o', 'jsonpath={.items[*].metadata.name}',
        '--context', context,
      ]);

      const namespaces = output.split(/\s+/).filter(Boolean);
      const providers: string[] = [];

      // Identify CAPI-related namespaces
      if (namespaces.includes('capi-system')) providers.push('core');
      if (namespaces.includes('capd-system')) providers.push('docker');
      if (namespaces.includes('capa-system')) providers.push('aws');
      if (namespaces.includes('capz-system')) providers.push('azure');

      return providers;
    } catch (error) {
      console.warn('Could not get installed providers:', error);
      return [];
    }
  }

  /**
   * Wait for node to be ready
   */
  private async waitForNodeReady(): Promise<void> {
    const context = `kind-${MGMT_CLUSTER_NAME}`;
    const maxAttempts = 30;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const output = await this.execKubectl([
          'get', 'nodes',
          '-o', 'jsonpath={.items[0].status.conditions[?(@.type=="Ready")].status}',
          '--context', context,
        ]);

        if (output.trim() === 'True') {
          console.log('Node is ready');
          return;
        }
      } catch (error) {
        // Node not ready yet
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Timeout waiting for node to be ready');
  }

  /**
   * Ensure kind CLI is installed
   */
  private async ensureKindInstalled(): Promise<void> {
    const exists = await this.checkCommandExists('kind');
    if (!exists) {
      throw new Error('kind CLI is not installed. Please install it from https://kind.sigs.k8s.io/');
    }
  }

  /**
   * Ensure clusterctl CLI is installed
   */
  private async ensureClusterctlInstalled(): Promise<void> {
    const exists = await this.checkCommandExists('clusterctl');
    if (!exists) {
      throw new Error(
        'clusterctl CLI is not installed. Please install it from https://cluster-api.sigs.k8s.io/',
      );
    }
  }

  /**
   * Check if a command exists in PATH
   */
  private async checkCommandExists(command: string): Promise<boolean> {
    try {
      await this.execCommand('which', [command]);
      return true;
    } catch (error) {
      return false;
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
  private async execCommand(
    command: string,
    args: string[],
    env: Record<string, string> = {},
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        env: { ...process.env, ...env },
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
