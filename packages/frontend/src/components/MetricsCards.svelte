<script lang="ts">
import type { FleetMetrics } from '/@shared/src/types/cluster';

interface Props {
  metrics: FleetMetrics;
}

let { metrics }: Props = $props();
</script>

<div class="grid grid-cols-4 gap-4 mb-5">
  <!-- Total Clusters -->
  <div class="p-4 bg-charcoal-800 rounded-lg border border-charcoal-600">
    <div class="text-sm text-gray-400 mb-1">Total Clusters</div>
    <div class="text-3xl font-bold">{metrics.totalClusters}</div>
  </div>

  <!-- Ready Clusters -->
  <div class="p-4 bg-charcoal-800 rounded-lg border border-charcoal-600">
    <div class="text-sm text-gray-400 mb-1">Ready</div>
    <div class="text-3xl font-bold text-green-400">{metrics.readyClusters}</div>
  </div>

  <!-- Provisioning Clusters -->
  <div class="p-4 bg-charcoal-800 rounded-lg border border-charcoal-600">
    <div class="text-sm text-gray-400 mb-1">Provisioning</div>
    <div class="text-3xl font-bold text-yellow-400">{metrics.provisioningClusters}</div>
  </div>

  <!-- Failed Clusters -->
  <div class="p-4 bg-charcoal-800 rounded-lg border border-charcoal-600">
    <div class="text-sm text-gray-400 mb-1">Failed</div>
    <div class="text-3xl font-bold text-red-400">{metrics.failedClusters}</div>
  </div>
</div>

<!-- Provider Distribution -->
<div class="mb-5 p-4 bg-charcoal-800 rounded-lg border border-charcoal-600">
  <h3 class="text-sm font-semibold mb-3">Provider Distribution</h3>
  <div class="flex gap-4">
    {#each Object.entries(metrics.providerDistribution) as [provider, count]}
      {#if count > 0}
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 bg-blue-600 rounded text-xs">{provider}</span>
          <span class="text-lg font-semibold">{count}</span>
        </div>
      {/if}
    {/each}
  </div>
</div>
