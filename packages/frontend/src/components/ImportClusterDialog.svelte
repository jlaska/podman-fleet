<script lang="ts">
import { Button } from '@podman-desktop/ui-svelte';
import { openShiftManagementClient } from '../api/client';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

let { onClose, onSuccess }: Props = $props();

let importMethod = $state<'kubeconfig' | 'api'>('kubeconfig');
let kubeconfigPath = $state('');
let apiUrl = $state('');
let apiToken = $state('');
let clusterName = $state('');
let importing = $state(false);
let error = $state('');

async function handleImport() {
  importing = true;
  error = '';

  try {
    if (importMethod === 'kubeconfig') {
      if (!kubeconfigPath.trim()) {
        error = 'Kubeconfig path is required';
        return;
      }

      await openShiftManagementClient.importFromKubeconfig(kubeconfigPath.trim());
    } else {
      if (!apiUrl.trim()) {
        error = 'API URL is required';
        return;
      }
      if (!apiToken.trim()) {
        error = 'API token is required';
        return;
      }

      await openShiftManagementClient.importFromAPI(
        apiUrl.trim(),
        apiToken.trim(),
        clusterName.trim() || undefined,
      );
    }

    onSuccess();
    onClose();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to import cluster';
    console.error('Error importing cluster:', err);
  } finally {
    importing = false;
  }
}

function handleBrowse() {
  // Trigger file picker - for now, just show message
  // In a real implementation, you'd use Podman Desktop API to show file picker
  alert('File picker would open here. For now, enter the full path to your kubeconfig file (e.g., ~/.kube/config)');
}
</script>

<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div class="bg-[var(--pd-content-bg)] rounded-lg border border-[var(--pd-content-card-border)] shadow-2xl p-6 w-full max-w-md">
    <h2 class="text-xl font-bold mb-4 text-[var(--pd-content-header)]">Import Cluster</h2>

    <div class="space-y-4">
      <!-- Import Method -->
      <div>
        <label class="block text-sm font-medium mb-2 text-[var(--pd-content-header)]">Import Method</label>
        <div class="flex gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              bind:group={importMethod}
              value="kubeconfig"
              disabled={importing}
            />
            <span class="text-sm text-[var(--pd-content-text)]">Kubeconfig File</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              bind:group={importMethod}
              value="api"
              disabled={importing}
            />
            <span class="text-sm text-[var(--pd-content-text)]">API URL + Token</span>
          </label>
        </div>
      </div>

      {#if importMethod === 'kubeconfig'}
        <!-- Kubeconfig Path -->
        <div>
          <label for="kubeconfig-path" class="block text-sm font-medium mb-1 text-[var(--pd-content-header)]">
            Kubeconfig Path
          </label>
          <div class="flex gap-2">
            <input
              id="kubeconfig-path"
              type="text"
              bind:value={kubeconfigPath}
              placeholder="~/.kube/config"
              class="flex-1 px-3 py-2 bg-[var(--pd-input-field-bg)] border border-[var(--pd-input-field-stroke)] rounded text-[var(--pd-input-field-focused-text)]"
              disabled={importing}
            />
            <Button on:click={handleBrowse} type="secondary" disabled={importing}>Browse</Button>
          </div>
          <p class="text-xs text-[var(--pd-content-sub-header)] mt-1">
            Default: ~/.kube/config
          </p>
        </div>

        <!-- Info Box -->
        <div class="bg-[var(--pd-invert-content-card-bg)] border border-[var(--pd-content-card-border)] rounded p-3 text-sm text-[var(--pd-content-text)]">
          <strong>Note:</strong> This will import all contexts from the kubeconfig file.
          Existing clusters with the same name will be updated.
        </div>
      {:else}
        <!-- API URL -->
        <div>
          <label for="api-url" class="block text-sm font-medium mb-1 text-[var(--pd-content-header)]">
            API URL
          </label>
          <input
            id="api-url"
            type="text"
            bind:value={apiUrl}
            placeholder="https://api.example.com:6443"
            class="w-full px-3 py-2 bg-[var(--pd-input-field-bg)] border border-[var(--pd-input-field-stroke)] rounded text-[var(--pd-input-field-focused-text)]"
            disabled={importing}
          />
        </div>

        <!-- API Token -->
        <div>
          <label for="api-token" class="block text-sm font-medium mb-1 text-[var(--pd-content-header)]">
            API Token
          </label>
          <input
            id="api-token"
            type="password"
            bind:value={apiToken}
            placeholder="Bearer token or service account token"
            class="w-full px-3 py-2 bg-[var(--pd-input-field-bg)] border border-[var(--pd-input-field-stroke)] rounded text-[var(--pd-input-field-focused-text)]"
            disabled={importing}
          />
        </div>

        <!-- Cluster Name (Optional) -->
        <div>
          <label for="cluster-name" class="block text-sm font-medium mb-1 text-[var(--pd-content-header)]">
            Cluster Name (optional)
          </label>
          <input
            id="cluster-name"
            type="text"
            bind:value={clusterName}
            placeholder="Auto-detected from API URL"
            class="w-full px-3 py-2 bg-[var(--pd-input-field-bg)] border border-[var(--pd-input-field-stroke)] rounded text-[var(--pd-input-field-focused-text)]"
            disabled={importing}
          />
        </div>

        <!-- Info Box -->
        <div class="bg-[var(--pd-invert-content-card-bg)] border border-[var(--pd-content-card-border)] rounded p-3 text-sm text-[var(--pd-content-text)]">
          <strong>Note:</strong> Direct API access. The cluster will be monitored but not managed by CAPI.
        </div>
      {/if}

      {#if error}
        <div class="bg-red-100 dark:bg-red-900 dark:bg-opacity-30 border border-red-600 rounded p-3 text-sm text-red-600">
          {error}
        </div>
      {/if}
    </div>

    <div class="flex gap-2 justify-end mt-6">
      <Button on:click={onClose} type="secondary" disabled={importing}>Cancel</Button>
      <Button on:click={handleImport} disabled={importing}>
        {importing ? 'Importing...' : 'Import Cluster'}
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
