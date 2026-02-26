<script lang="ts">
import { onMount } from 'svelte';
import { Button, EmptyScreen } from '@podman-desktop/ui-svelte';
import { faServer, faPlus, faRefresh } from '@fortawesome/free-solid-svg-icons';
import { podmanFleetClient } from '../api/client';
import type { ManagementClusterStatus, FleetMetrics, Cluster } from '/@shared/src/types/cluster';
import ManagementClusterCard from '../components/ManagementClusterCard.svelte';
import MetricsCards from '../components/MetricsCards.svelte';
import ClusterList from '../components/ClusterList.svelte';
import CreateClusterDialog from '../components/CreateClusterDialog.svelte';

let managementStatus: ManagementClusterStatus | undefined = $state();
let metrics: FleetMetrics | undefined = $state();
let clusters: Cluster[] = $state([]);
let loading = $state(true);
let error = $state('');
let showCreateDialog = $state(false);

onMount(() => {
  loadData();
});

async function loadData() {
  loading = true;
  error = '';

  try {
    const [statusResult, metricsResult, clustersResult] = await Promise.all([
      podmanFleetClient.getManagementClusterStatus(),
      podmanFleetClient.getFleetMetrics(),
      podmanFleetClient.listClusters(),
    ]);

    managementStatus = statusResult;
    metrics = metricsResult;
    clusters = clustersResult;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load fleet data';
    console.error('Error loading fleet data:', err);
  } finally {
    loading = false;
  }
}

async function handleInitialize() {
  loading = true;
  error = '';

  try {
    await podmanFleetClient.initializeManagementCluster();
    await loadData();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to initialize management cluster';
    console.error('Error initializing management cluster:', err);
  } finally {
    loading = false;
  }
}

async function handleRefresh() {
  await loadData();
}
</script>

<div class="flex flex-col w-full h-full">
  <!-- Header -->
  <div class="flex items-center justify-between px-5 py-4 border-b border-[var(--pd-content-divider)]">
    <div class="flex items-center gap-2">
      <div class="text-xl font-bold text-[var(--pd-content-header)]">Fleet</div>
      <div class="text-sm text-[var(--pd-content-sub-header)]">Kubernetes Fleet Management</div>
    </div>
    <Button on:click={handleRefresh} icon={faRefresh}>Refresh</Button>
  </div>

  {#if loading}
    <div class="flex items-center justify-center flex-1">
      <div class="text-[var(--pd-content-sub-header)]">Loading fleet data...</div>
    </div>
  {:else if error}
    <div class="flex items-center justify-center flex-1">
      <EmptyScreen title="Error" message={error} icon={faServer}>
        <Button on:click={loadData}>Retry</Button>
      </EmptyScreen>
    </div>
  {:else if !managementStatus?.exists}
    <!-- Management cluster not initialized -->
    <div class="flex items-center justify-center flex-1">
      <EmptyScreen
        title="Welcome to Fleet"
        message="Create a management cluster to start managing your Kubernetes fleet. Requires: kind, kubectl, clusterctl CLIs"
        icon={faServer}>
        <Button on:click={handleInitialize} icon={faPlus}>Initialize Management Cluster</Button>
      </EmptyScreen>
    </div>
  {:else}
    <!-- Main content -->
    <div class="flex flex-col flex-1 p-5 overflow-auto">
      <!-- Management cluster status -->
      {#if managementStatus}
        <ManagementClusterCard status={managementStatus} onRefresh={loadData} />
      {/if}

      <!-- Fleet metrics -->
      {#if metrics}
        <MetricsCards {metrics} />
      {/if}

      <!-- Actions bar -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-[var(--pd-content-header)]">Clusters</h2>
        <div class="flex gap-2">
          <Button on:click={() => showCreateDialog = true} icon={faServer}>Create Cluster</Button>
          <Button on:click={() => alert('Import cluster - Coming in Phase 3')} icon={faPlus} type="secondary">Import Cluster</Button>
        </div>
      </div>

      <!-- Cluster list -->
      <ClusterList {clusters} onRefresh={loadData} />
    </div>
  {/if}
</div>

{#if showCreateDialog}
  <CreateClusterDialog
    onClose={() => showCreateDialog = false}
    onSuccess={loadData}
  />
{/if}

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>
