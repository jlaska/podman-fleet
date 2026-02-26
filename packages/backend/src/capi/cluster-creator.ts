/**
 * Cluster creation using CAPI
 */

import * as extensionApi from '@podman-desktop/api';
import { spawn } from 'node:child_process';
import { MGMT_CLUSTER_NAME } from './management-cluster';

export interface CreateClusterOptions {
  name: string;
  kubernetesVersion?: string;
  controlPlaneNodes?: number;
  workerNodes?: number;
}

export class ClusterCreator {
  /**
   * Create a local cluster using CAPI Docker provider (CAPD)
   */
  async createLocalCluster(options: CreateClusterOptions): Promise<void> {
    const {
      name,
      kubernetesVersion = 'v1.28.0',
      controlPlaneNodes = 1,
      workerNodes = 1,
    } = options;

    console.log('Creating cluster:', name);

    await extensionApi.window.withProgress(
      { location: extensionApi.ProgressLocation.TASK_WIDGET, title: `Creating cluster ${name}` },
      async progress => {
        progress.report({ increment: 10, message: 'Generating cluster manifest...' });

        try {
          // Generate cluster manifest using clusterctl
          const manifest = await this.generateClusterManifest({
            name,
            kubernetesVersion,
            controlPlaneNodes,
            workerNodes,
          });

          progress.report({ increment: 30, message: 'Applying cluster manifest...' });

          // Apply the manifest to the management cluster
          await this.applyManifest(manifest);

          progress.report({ increment: 30, message: 'Waiting for cluster to provision...' });

          // Wait for cluster to be provisioned (this can take a while)
          await this.waitForClusterReady(name);

          progress.report({ increment: 30, message: 'Cluster created successfully' });
        } catch (error) {
          throw new Error(`Failed to create cluster: ${error}`);
        }
      },
    );

    await extensionApi.window.showInformationMessage(`Cluster "${name}" created successfully`);
  }

  /**
   * Generate CAPI cluster manifest using clusterctl
   */
  private async generateClusterManifest(options: {
    name: string;
    kubernetesVersion: string;
    controlPlaneNodes: number;
    workerNodes: number;
  }): Promise<string> {
    const { name, kubernetesVersion, controlPlaneNodes, workerNodes } = options;

    // Use clusterctl to generate the manifest
    const args = [
      'generate',
      'cluster',
      name,
      '--infrastructure',
      'docker',
      '--kubernetes-version',
      kubernetesVersion,
      '--control-plane-machine-count',
      controlPlaneNodes.toString(),
      '--worker-machine-count',
      workerNodes.toString(),
    ];

    const manifest = await this.execCommand('clusterctl', args, {
      KUBECONFIG_CONTEXT: `kind-${MGMT_CLUSTER_NAME}`,
    });

    return manifest;
  }

  /**
   * Apply manifest to management cluster
   */
  private async applyManifest(manifest: string): Promise<void> {
    const context = `kind-${MGMT_CLUSTER_NAME}`;

    await this.execCommand('kubectl', ['apply', '-f', '-', '--context', context], {}, manifest);
  }

  /**
   * Wait for cluster to be ready
   */
  private async waitForClusterReady(name: string, timeoutSeconds: number = 600): Promise<void> {
    const context = `kind-${MGMT_CLUSTER_NAME}`;
    const maxAttempts = timeoutSeconds / 5;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const output = await this.execCommand('kubectl', [
          'get',
          'cluster',
          name,
          '-o',
          'jsonpath={.status.phase}',
          '--context',
          context,
        ]);

        if (output.trim() === 'Provisioned') {
          console.log(`Cluster ${name} is provisioned`);
          return;
        }

        console.log(`Cluster ${name} status: ${output.trim()}, waiting...`);
      } catch (error) {
        // Cluster might not exist yet
        console.log(`Waiting for cluster ${name} to appear...`);
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    throw new Error(`Timeout waiting for cluster ${name} to be ready`);
  }

  /**
   * Execute a command and return stdout
   */
  private async execCommand(
    command: string,
    args: string[],
    env: Record<string, string> = {},
    stdin?: string,
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

      const proc = spawn(command, args, {
        env: {
          ...process.env,
          PATH: enhancedPath,
          ...env,
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

      // If stdin is provided, write it and close
      if (stdin) {
        proc.stdin.write(stdin);
        proc.stdin.end();
      }

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
