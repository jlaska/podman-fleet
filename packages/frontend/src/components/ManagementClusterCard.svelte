<script lang="ts">
import { Button } from '@podman-desktop/ui-svelte';
import { faCheckCircle, faTimesCircle, faTrash } from '@fortawesome/free-solid-svg-icons';
import type { ManagementClusterStatus } from '/@shared/src/types/cluster';
import { podmanFleetClient } from '../api/client';

interface Props {
  status: ManagementClusterStatus;
  onRefresh: () => void;
}

let { status, onRefresh }: Props = $props();

async function handleDelete() {
  try {
    await podmanFleetClient.deleteManagementCluster();
    onRefresh();
  } catch (err) {
    console.error('Error deleting management cluster:', err);
  }
}
</script>

<div class="mb-5 p-4 bg-charcoal-800 rounded-lg border border-charcoal-600">
  <div class="flex items-center justify-between mb-3">
    <h2 class="text-lg font-semibold">Management Cluster</h2>
    {#if status.exists}
      <Button on:click={handleDelete} icon={faTrash} type="secondary">Delete</Button>
    {/if}
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <div class="text-sm text-gray-400 mb-1">Name</div>
      <div class="font-mono">{status.name}</div>
    </div>

    <div>
      <div class="text-sm text-gray-400 mb-1">Status</div>
      <div class="flex items-center gap-2">
        {#if status.healthy}
          <span class="text-green-400" title="Healthy">
            <i class="fas fa-check-circle"></i>
          </span>
          <span>Healthy</span>
        {:else}
          <span class="text-red-400" title="Unhealthy">
            <i class="fas fa-times-circle"></i>
          </span>
          <span>Unhealthy</span>
        {/if}
      </div>
    </div>

    <div>
      <div class="text-sm text-gray-400 mb-1">CAPI Providers</div>
      <div class="flex gap-2 flex-wrap">
        {#if status.providers.length > 0}
          {#each status.providers as provider}
            <span class="px-2 py-1 bg-purple-600 rounded text-xs">{provider}</span>
          {/each}
        {:else}
          <span class="text-gray-400 text-sm">None installed</span>
        {/if}
      </div>
    </div>

    {#if status.message}
      <div>
        <div class="text-sm text-gray-400 mb-1">Message</div>
        <div class="text-sm text-yellow-400">{status.message}</div>
      </div>
    {/if}
  </div>
</div>
