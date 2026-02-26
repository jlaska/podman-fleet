<script lang="ts">
import { Button, EmptyScreen } from '@podman-desktop/ui-svelte';
import { faServer, faTrash, faSync } from '@fortawesome/free-solid-svg-icons';
import type { Cluster } from '/@shared/src/types/cluster';
import { podmanFleetClient } from '../api/client';

interface Props {
  clusters: Cluster[];
  onRefresh: () => void;
}

let { clusters, onRefresh }: Props = $props();

async function handleDelete(cluster: Cluster) {
  try {
    await podmanFleetClient.deleteCluster(cluster.name);
    onRefresh();
  } catch (err) {
    console.error('Error deleting cluster:', err);
  }
}

async function handleRefreshCluster(cluster: Cluster) {
  try {
    await podmanFleetClient.refreshCluster(cluster.name);
    onRefresh();
  } catch (err) {
    console.error('Error refreshing cluster:', err);
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'ready':
      return 'text-green-400';
    case 'provisioning':
      return 'text-yellow-400';
    case 'failed':
      return 'text-red-400';
    case 'deleting':
      return 'text-orange-400';
    default:
      return 'text-gray-400';
  }
}

function getProviderColor(provider: string): string {
  switch (provider) {
    case 'docker':
      return 'bg-blue-600';
    case 'aws':
      return 'bg-orange-600';
    case 'azure':
      return 'bg-cyan-600';
    case 'vsphere':
      return 'bg-purple-600';
    case 'imported':
      return 'bg-gray-600';
    default:
      return 'bg-gray-600';
  }
}
</script>

<div class="flex flex-col flex-1">
  <div class="flex items-center justify-between mb-3">
    <h2 class="text-lg font-semibold">Clusters</h2>
  </div>

  {#if clusters.length === 0}
    <EmptyScreen
      title="No Clusters"
      message="Create a cluster or import an existing one to get started"
      icon={faServer}
    />
  {:else}
    <div class="bg-charcoal-800 rounded-lg border border-charcoal-600 overflow-hidden">
      <table class="w-full">
        <thead class="bg-charcoal-700">
          <tr>
            <th class="px-4 py-3 text-left text-sm font-semibold">Name</th>
            <th class="px-4 py-3 text-left text-sm font-semibold">Provider</th>
            <th class="px-4 py-3 text-left text-sm font-semibold">Status</th>
            <th class="px-4 py-3 text-left text-sm font-semibold">Version</th>
            <th class="px-4 py-3 text-left text-sm font-semibold">Type</th>
            <th class="px-4 py-3 text-left text-sm font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each clusters as cluster}
            <tr class="border-t border-charcoal-600 hover:bg-charcoal-700">
              <td class="px-4 py-3 font-mono text-sm">{cluster.name}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 {getProviderColor(cluster.provider)} rounded text-xs">
                  {cluster.provider}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="{getStatusColor(cluster.status)} capitalize text-sm">
                  {cluster.status}
                </span>
              </td>
              <td class="px-4 py-3 text-sm">{cluster.version}</td>
              <td class="px-4 py-3">
                {#if cluster.managed}
                  <span class="px-2 py-1 bg-green-600 rounded text-xs">CAPI</span>
                {:else}
                  <span class="px-2 py-1 bg-gray-600 rounded text-xs">Imported</span>
                {/if}
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <button
                    class="text-blue-400 hover:text-blue-300"
                    onclick={() => handleRefreshCluster(cluster)}
                    title="Refresh">
                    <i class="fas fa-sync"></i>
                  </button>
                  <button
                    class="text-red-400 hover:text-red-300"
                    onclick={() => handleDelete(cluster)}
                    title="Delete">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
