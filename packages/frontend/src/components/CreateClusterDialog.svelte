<script lang="ts">
import { Button } from '@podman-desktop/ui-svelte';
import { podmanFleetClient } from '../api/client';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

let { onClose, onSuccess }: Props = $props();

let clusterName = $state('my-cluster');
let kubernetesVersion = $state('v1.28.0');
let workerNodes = $state(1);
let creating = $state(false);
let error = $state('');

async function handleCreate() {
  if (!clusterName.trim()) {
    error = 'Cluster name is required';
    return;
  }

  creating = true;
  error = '';

  try {
    await podmanFleetClient.createCluster({
      name: clusterName.trim(),
      kubernetesVersion,
      controlPlaneNodes: 1,
      workerNodes,
    });

    onSuccess();
    onClose();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to create cluster';
    console.error('Error creating cluster:', err);
  } finally {
    creating = false;
  }
}
</script>

<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div class="bg-charcoal-800 rounded-lg border border-charcoal-600 p-6 w-full max-w-md">
    <h2 class="text-xl font-bold mb-4">Create Local Cluster</h2>

    <div class="space-y-4">
      <!-- Cluster Name -->
      <div>
        <label for="cluster-name" class="block text-sm font-medium mb-1">Cluster Name</label>
        <input
          id="cluster-name"
          type="text"
          bind:value={clusterName}
          placeholder="my-cluster"
          class="w-full px-3 py-2 bg-charcoal-900 border border-charcoal-600 rounded text-white"
          disabled={creating}
        />
      </div>

      <!-- Kubernetes Version -->
      <div>
        <label for="k8s-version" class="block text-sm font-medium mb-1">Kubernetes Version</label>
        <select
          id="k8s-version"
          bind:value={kubernetesVersion}
          class="w-full px-3 py-2 bg-charcoal-900 border border-charcoal-600 rounded text-white"
          disabled={creating}
        >
          <option value="v1.30.0">v1.30.0</option>
          <option value="v1.29.0">v1.29.0</option>
          <option value="v1.28.0">v1.28.0 (default)</option>
          <option value="v1.27.0">v1.27.0</option>
        </select>
      </div>

      <!-- Worker Nodes -->
      <div>
        <label for="worker-nodes" class="block text-sm font-medium mb-1">
          Worker Nodes: {workerNodes}
        </label>
        <input
          id="worker-nodes"
          type="range"
          bind:value={workerNodes}
          min="0"
          max="5"
          step="1"
          class="w-full"
          disabled={creating}
        />
        <div class="flex justify-between text-xs text-gray-400">
          <span>0</span>
          <span>5</span>
        </div>
      </div>

      <!-- Info Box -->
      <div class="bg-blue-900 bg-opacity-30 border border-blue-700 rounded p-3 text-sm">
        <strong>Note:</strong> This creates a local Docker-based cluster using CAPI.
        Cluster creation takes 2-5 minutes.
      </div>

      {#if error}
        <div class="bg-red-900 bg-opacity-30 border border-red-700 rounded p-3 text-sm text-red-400">
          {error}
        </div>
      {/if}
    </div>

    <div class="flex gap-2 justify-end mt-6">
      <Button on:click={onClose} type="secondary" disabled={creating}>Cancel</Button>
      <Button on:click={handleCreate} disabled={creating}>
        {creating ? 'Creating...' : 'Create Cluster'}
      </Button>
    </div>
  </div>
</div>

<style>
  /* Dark dialog overlay */
  :global(.fixed) {
    backdrop-filter: blur(2px);
  }
</style>
