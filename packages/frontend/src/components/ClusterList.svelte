<script lang="ts">
import { Table, TableColumn, TableRow, EmptyScreen } from '@podman-desktop/ui-svelte';
import { faServer, faTrash, faSync } from '@fortawesome/free-solid-svg-icons';
import type { Cluster } from '/@shared/src/types/cluster';
import { openShiftManagementClient } from '../api/client';

interface Props {
  clusters: Cluster[];
  onRefresh: () => void;
}

let { clusters, onRefresh }: Props = $props();

async function handleDelete(cluster: Cluster) {
  try {
    await openShiftManagementClient.deleteCluster(cluster.name);
    onRefresh();
  } catch (err) {
    console.error('Error deleting cluster:', err);
  }
}

async function handleRefreshCluster(cluster: Cluster) {
  try {
    await openShiftManagementClient.refreshCluster(cluster.name);
    onRefresh();
  } catch (err) {
    console.error('Error refreshing cluster:', err);
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'ready':
      return 'text-green-600';
    case 'provisioning':
      return 'text-amber-600';
    case 'failed':
      return 'text-red-600';
    case 'deleting':
      return 'text-orange-600';
    default:
      return 'text-[var(--pd-content-sub-header)]';
  }
}

function getProviderColor(provider: string): string {
  switch (provider) {
    case 'docker':
      return 'bg-blue-600 text-white';
    case 'aws':
      return 'bg-orange-600 text-white';
    case 'azure':
      return 'bg-cyan-600 text-white';
    case 'vsphere':
      return 'bg-purple-600 text-white';
    case 'imported':
      return 'bg-gray-600 text-white';
    default:
      return 'bg-gray-600 text-white';
  }
}
</script>

<div class="flex flex-col flex-1">
  {#if clusters.length === 0}
    <EmptyScreen
      title="No Clusters"
      message="Create a cluster or import an existing one to get started"
      icon={faServer}
    />
  {:else}
    <Table>
      <TableRow>
        <TableColumn>Name</TableColumn>
        <TableColumn>Provider</TableColumn>
        <TableColumn>Status</TableColumn>
        <TableColumn>Version</TableColumn>
        <TableColumn>Type</TableColumn>
        <TableColumn>Actions</TableColumn>
      </TableRow>
      {#each clusters as cluster}
        <TableRow>
          <TableColumn>
            <span class="font-mono text-sm">{cluster.name}</span>
          </TableColumn>
          <TableColumn>
            <span class="px-2 py-1 {getProviderColor(cluster.provider)} rounded text-xs">
              {cluster.provider}
            </span>
          </TableColumn>
          <TableColumn>
            <span class="{getStatusColor(cluster.status)} capitalize text-sm">
              {cluster.status}
            </span>
          </TableColumn>
          <TableColumn>
            <span class="text-sm">{cluster.version}</span>
          </TableColumn>
          <TableColumn>
            {#if cluster.managed}
              <span class="px-2 py-1 bg-green-600 text-white rounded text-xs">CAPI</span>
            {:else}
              <span class="px-2 py-1 bg-gray-600 text-white rounded text-xs">Imported</span>
            {/if}
          </TableColumn>
          <TableColumn>
            <div class="flex gap-2">
              <button
                class="text-[var(--pd-button-primary-bg)] hover:opacity-80"
                onclick={() => handleRefreshCluster(cluster)}
                title="Refresh">
                <i class="fas fa-sync"></i>
              </button>
              <button
                class="text-red-600 hover:opacity-80"
                onclick={() => handleDelete(cluster)}
                title="Delete">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </TableColumn>
        </TableRow>
      {/each}
    </Table>
  {/if}
</div>
