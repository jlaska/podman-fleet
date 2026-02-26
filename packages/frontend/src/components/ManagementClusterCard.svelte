<script lang="ts">
import { Button } from '@podman-desktop/ui-svelte';
import { faCheckCircle, faTimesCircle, faTrash } from '@fortawesome/free-solid-svg-icons';
import type { ManagementClusterStatus } from '/@shared/src/types/cluster';
import { openShiftManagementClient } from '../api/client';

interface Props {
  status: ManagementClusterStatus;
  onRefresh: () => void;
}

let { status, onRefresh }: Props = $props();

async function handleDelete() {
  try {
    await openShiftManagementClient.deleteManagementCluster();
    onRefresh();
  } catch (err) {
    console.error('Error deleting management cluster:', err);
  }
}
</script>

<div class="mb-5 p-4 bg-[var(--pd-invert-content-card-bg)] rounded-lg border border-[var(--pd-content-card-border)]">
  <div class="flex items-center justify-between mb-3">
    <h2 class="text-lg font-semibold text-[var(--pd-content-header)]">Management Cluster</h2>
    {#if status.exists}
      <Button on:click={handleDelete} icon={faTrash} type="secondary">Delete</Button>
    {/if}
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <div class="text-sm text-[var(--pd-content-sub-header)] mb-1">Name</div>
      <div class="font-mono text-[var(--pd-content-text)]">{status.name}</div>
    </div>

    <div>
      <div class="text-sm text-[var(--pd-content-sub-header)] mb-1">Status</div>
      <div class="flex items-center gap-2 text-[var(--pd-content-text)]">
        {#if status.healthy}
          <span class="text-green-600" title="Healthy">
            <i class="fas fa-check-circle"></i>
          </span>
          <span>Healthy</span>
        {:else}
          <span class="text-red-600" title="Unhealthy">
            <i class="fas fa-times-circle"></i>
          </span>
          <span>Unhealthy</span>
        {/if}
      </div>
    </div>

    <div>
      <div class="text-sm text-[var(--pd-content-sub-header)] mb-1">CAPI Providers</div>
      <div class="flex gap-2 flex-wrap">
        {#if status.providers.length > 0}
          {#each status.providers as provider}
            <span class="px-2 py-1 bg-purple-600 text-white rounded text-xs">{provider}</span>
          {/each}
        {:else}
          <span class="text-[var(--pd-content-sub-header)] text-sm">None installed</span>
        {/if}
      </div>
    </div>

    {#if status.message}
      <div>
        <div class="text-sm text-[var(--pd-content-sub-header)] mb-1">Message</div>
        <div class="text-sm text-amber-600">{status.message}</div>
      </div>
    {/if}
  </div>
</div>
