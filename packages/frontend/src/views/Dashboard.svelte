<script lang="ts">
import { onMount } from 'svelte';
import { Button, EmptyScreen } from '@podman-desktop/ui-svelte';
import { faServer, faPlus, faRefresh } from '@fortawesome/free-solid-svg-icons';
import { openShiftManagementClient } from '../api/client';
import type { ManagementClusterStatus, ClusterMetrics, Cluster } from '/@shared/src/types/cluster';
import ManagementClusterCard from '../components/ManagementClusterCard.svelte';
import MetricsCards from '../components/MetricsCards.svelte';
import DistributionCharts from '../components/DistributionCharts.svelte';
import ClusterList from '../components/ClusterList.svelte';
import CreateClusterDialog from '../components/CreateClusterDialog.svelte';
import ImportClusterDialog from '../components/ImportClusterDialog.svelte';

let managementStatus: ManagementClusterStatus | undefined = $state();
let metrics: ClusterMetrics | undefined = $state();
let clusters: Cluster[] = $state([]);
let loading = $state(true);
let error = $state('');
let showCreateDialog = $state(false);
let showImportDialog = $state(false);

onMount(() => {
  loadData();
});

async function loadData() {
  loading = true;
  error = '';

  try {
    const [statusResult, metricsResult, clustersResult] = await Promise.all([
      openShiftManagementClient.getManagementClusterStatus(),
      openShiftManagementClient.getClusterMetrics(),
      openShiftManagementClient.listClusters(),
    ]);

    managementStatus = statusResult;
    metrics = metricsResult;
    clusters = clustersResult;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load cluster data';
    console.error('Error loading cluster data:', err);
  } finally {
    loading = false;
  }
}

async function handleInitialize() {
  loading = true;
  error = '';

  try {
    await openShiftManagementClient.initializeManagementCluster();
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
      <div class="text-xl font-bold text-[var(--pd-content-header)]">OpenShift Management</div>
      <div class="text-sm text-[var(--pd-content-sub-header)]">Manage OpenShift & Kubernetes Clusters</div>
    </div>
    <Button on:click={handleRefresh} icon={faRefresh} type="link">Refresh</Button>
  </div>

  {#if loading}
    <div class="flex items-center justify-center flex-1">
      <div class="text-[var(--pd-content-sub-header)]">Loading cluster data...</div>
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
        title="Welcome to OpenShift Management"
        message="Create a management cluster to start managing your clusters. Requires: kind, kubectl, clusterctl CLIs"
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

      <!-- Cluster metrics -->
      {#if metrics}
        <MetricsCards {metrics} />
      {/if}

      <!-- Distribution Charts -->
      {#if metrics}
        <DistributionCharts {metrics} />
      {/if}

      <!-- Actions bar -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-[var(--pd-content-header)]">Clusters</h2>
        <div class="flex gap-2">
          <Button on:click={() => showCreateDialog = true} icon={faPlus} type="secondary">Create Cluster</Button>
          <Button on:click={() => showImportDialog = true} icon={faServer} type="secondary">Import Cluster</Button>
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

{#if showImportDialog}
  <ImportClusterDialog
    onClose={() => showImportDialog = false}
    onSuccess={loadData}
  />
{/if}

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>
