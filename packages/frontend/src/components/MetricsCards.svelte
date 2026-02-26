<script lang="ts">
import type { ClusterMetrics } from '/@shared/src/types/cluster';

interface Props {
  metrics: ClusterMetrics;
}

let { metrics }: Props = $props();
</script>

<div class="grid grid-cols-4 gap-4 mb-5">
  <!-- Total Clusters -->
  <div class="p-4 bg-[var(--pd-invert-content-card-bg)] rounded-lg border border-[var(--pd-content-card-border)]">
    <div class="text-sm text-[var(--pd-content-sub-header)] mb-1">Total Clusters</div>
    <div class="text-3xl font-bold text-[var(--pd-content-header)]">{metrics.totalClusters}</div>
  </div>

  <!-- Ready Clusters -->
  <div class="p-4 bg-[var(--pd-invert-content-card-bg)] rounded-lg border border-[var(--pd-content-card-border)]">
    <div class="text-sm text-[var(--pd-content-sub-header)] mb-1">Ready</div>
    <div class="text-3xl font-bold text-green-600">{metrics.readyClusters}</div>
  </div>

  <!-- Provisioning Clusters -->
  <div class="p-4 bg-[var(--pd-invert-content-card-bg)] rounded-lg border border-[var(--pd-content-card-border)]">
    <div class="text-sm text-[var(--pd-content-sub-header)] mb-1">Provisioning</div>
    <div class="text-3xl font-bold text-amber-600">{metrics.provisioningClusters}</div>
  </div>

  <!-- Failed Clusters -->
  <div class="p-4 bg-[var(--pd-invert-content-card-bg)] rounded-lg border border-[var(--pd-content-card-border)]">
    <div class="text-sm text-[var(--pd-content-sub-header)] mb-1">Failed</div>
    <div class="text-3xl font-bold text-red-600">{metrics.failedClusters}</div>
  </div>
</div>
