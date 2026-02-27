<script lang="ts">
import type { ClusterMetrics } from '/@shared/src/types/cluster';

interface Props {
  metrics: ClusterMetrics;
}

let { metrics }: Props = $props();

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

const providerEntries = $derived(
  metrics?.providerDistribution ? Object.entries(metrics.providerDistribution).filter(([_, count]) => count > 0) : []
);

const versionEntries = $derived(
  metrics?.versionDistribution ? Object.entries(metrics.versionDistribution)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]) : [] // Sort by count descending
);

const totalClusters = $derived(metrics?.totalClusters || 1); // Avoid division by zero
</script>

<div class="grid grid-cols-2 gap-4 mb-5">
  <!-- Provider Distribution Chart -->
  <div class="p-4 bg-[var(--pd-invert-content-card-bg)] rounded-lg border border-[var(--pd-content-card-border)]">
    <h3 class="text-sm font-semibold mb-3 text-[var(--pd-content-header)]">Provider Distribution</h3>

    {#if providerEntries.length === 0}
      <div class="text-sm text-[var(--pd-content-sub-header)]">No clusters</div>
    {:else}
      <div class="space-y-3">
        {#each providerEntries as [provider, count]}
          {@const percentage = Math.round((count / totalClusters) * 100)}
          <div>
            <div class="flex justify-between items-center mb-1">
              <span class="text-sm text-[var(--pd-content-text)] capitalize">{provider}</span>
              <span class="text-sm font-semibold text-[var(--pd-content-header)]">{count} ({percentage}%)</span>
            </div>
            <div class="h-2 bg-[var(--pd-content-card-bg)] rounded-full overflow-hidden">
              <div
                class="{getProviderColor(provider)} h-full transition-all duration-300"
                style="width: {percentage}%"
              ></div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Version Distribution Chart -->
  <div class="p-4 bg-[var(--pd-invert-content-card-bg)] rounded-lg border border-[var(--pd-content-card-border)]">
    <h3 class="text-sm font-semibold mb-3 text-[var(--pd-content-header)]">Version Distribution</h3>

    {#if versionEntries.length === 0}
      <div class="text-sm text-[var(--pd-content-sub-header)]">No clusters</div>
    {:else}
      <div class="space-y-3">
        {#each versionEntries.slice(0, 5) as [version, count]}
          {@const percentage = Math.round((count / totalClusters) * 100)}
          <div>
            <div class="flex justify-between items-center mb-1">
              <span class="text-sm text-[var(--pd-content-text)] font-mono">{version}</span>
              <span class="text-sm font-semibold text-[var(--pd-content-header)]">{count} ({percentage}%)</span>
            </div>
            <div class="h-2 bg-[var(--pd-content-card-bg)] rounded-full overflow-hidden">
              <div
                class="bg-[var(--pd-button-primary-bg)] h-full transition-all duration-300"
                style="width: {percentage}%"
              ></div>
            </div>
          </div>
        {/each}
        {#if versionEntries.length > 5}
          <div class="text-xs text-[var(--pd-content-sub-header)] text-center">
            +{versionEntries.length - 5} more versions
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
