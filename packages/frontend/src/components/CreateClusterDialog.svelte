<script lang="ts">
import { Button } from '@podman-desktop/ui-svelte';
import { openShiftManagementClient } from '../api/client';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

let { onClose, onSuccess }: Props = $props();

let clusterName = $state('my-cluster');
let openshiftVersion = $state('latest');
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
    await openShiftManagementClient.createCluster({
      name: clusterName.trim(),
      kubernetesVersion: openshiftVersion,
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
  <div class="bg-[var(--pd-content-bg)] rounded-lg border border-[var(--pd-content-card-border)] shadow-2xl p-6 w-full max-w-md">
    <h2 class="text-xl font-bold mb-4 text-[var(--pd-content-header)]">Create Local Cluster</h2>

    <div class="space-y-4">
      <!-- Cluster Name -->
      <div>
        <label for="cluster-name" class="block text-sm font-medium mb-1 text-[var(--pd-content-header)]">Cluster Name</label>
        <input
          id="cluster-name"
          type="text"
          bind:value={clusterName}
          placeholder="my-cluster"
          class="w-full px-3 py-2 bg-[var(--pd-input-field-bg)] border border-[var(--pd-input-field-stroke)] rounded text-[var(--pd-input-field-focused-text)]"
          disabled={creating}
        />
      </div>

      <!-- Red Hat OpenShift Version -->
      <div>
        <label for="openshift-version" class="block text-sm font-medium mb-1 text-[var(--pd-content-header)]">Red Hat OpenShift</label>
        <select
          id="openshift-version"
          bind:value={openshiftVersion}
          class="w-full px-3 py-2 bg-[var(--pd-input-field-bg)] border border-[var(--pd-input-field-stroke)] rounded text-[var(--pd-input-field-focused-text)]"
          disabled={creating}
        >
          <option value="latest">Latest</option>
          <option value="4.17">4.17</option>
          <option value="4.16">4.16</option>
          <option value="4.15">4.15</option>
          <option value="4.14">4.14</option>
        </select>
      </div>

      <!-- Worker Nodes -->
      <div>
        <label for="worker-nodes" class="block text-sm font-medium mb-1 text-[var(--pd-content-header)]">
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
        <div class="flex justify-between text-xs text-[var(--pd-content-sub-header)]">
          <span>0</span>
          <span>5</span>
        </div>
      </div>

      <!-- Info Box -->
      <div class="bg-[var(--pd-invert-content-card-bg)] border border-[var(--pd-content-card-border)] rounded p-3 text-sm text-[var(--pd-content-text)]">
        <strong>Note:</strong> This creates a local Docker-based cluster using CAPI.
        Cluster creation takes 2-5 minutes.
      </div>

      {#if error}
        <div class="bg-red-100 dark:bg-red-900 dark:bg-opacity-30 border border-red-600 rounded p-3 text-sm text-red-600">
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
