import type { ExtensionContext } from '@podman-desktop/api';
import * as extensionApi from '@podman-desktop/api';
import fs from 'node:fs';
import { RpcExtension } from '/@shared/src/messages/MessageProxy';
import { openShiftManagementApi } from './api-impl';

/**
 * OpenShift Management Extension
 * OpenShift and Kubernetes cluster management using Cluster API
 */

let managementPanel: extensionApi.WebviewPanel | undefined;

export async function activate(extensionContext: ExtensionContext): Promise<void> {
  console.log('Starting OpenShift Management extension');

  // Create the API instance
  const managementApi = new openShiftManagementApi(extensionContext);

  // Create webview panel for the management dashboard
  managementPanel = extensionApi.window.createWebviewPanel('openshiftManagement', 'OpenShift Management', {
    localResourceRoots: [extensionApi.Uri.joinPath(extensionContext.extensionUri, 'media')],
    enableScripts: true,
  });
  extensionContext.subscriptions.push(managementPanel);

  console.log('Webview panel created with scripts enabled');

  // Set up the webview HTML
  await setupWebview(extensionContext, managementPanel);

  // Register the RPC API
  const rpcExtension = new RpcExtension(managementPanel.webview);
  rpcExtension.registerInstance<openShiftManagementApi>(openShiftManagementApi, managementApi);

  // Register provider (optional - for future Podman Desktop integration)
  const provider = extensionApi.provider.createProvider({
    name: 'OpenShift Management',
    id: 'openshift-management',
    status: 'ready',
    images: {
      icon: './icon.png',
    },
  });
  extensionContext.subscriptions.push(provider);

  console.log('OpenShift Management extension activated');

  // Check management cluster status on startup
  checkManagementClusterStatus(managementApi);
}

export async function deactivate(): Promise<void> {
  console.log('Stopping OpenShift Management extension');
  managementPanel?.dispose();
}

/**
 * Set up the webview HTML content
 */
async function setupWebview(
  extensionContext: ExtensionContext,
  panel: extensionApi.WebviewPanel,
): Promise<void> {
  const indexHtmlUri = extensionApi.Uri.joinPath(extensionContext.extensionUri, 'media', 'index.html');
  const indexHtmlPath = indexHtmlUri.fsPath;
  let indexHtml = await fs.promises.readFile(indexHtmlPath, 'utf8');

  // Fix script src paths
  const scriptLink = indexHtml.match(/<script.*?src="(.*?)".*?>/g);
  if (scriptLink) {
    scriptLink.forEach(link => {
      const src = link.match(/src="(.*?)"/);
      if (src) {
        const webviewSrc = panel.webview.asWebviewUri(
          extensionApi.Uri.joinPath(extensionContext.extensionUri, 'media', src[1]),
        );
        indexHtml = indexHtml.replace(src[1], webviewSrc.toString());
      }
    });
  }

  // Fix CSS link paths
  const cssLink = indexHtml.match(/<link.*?href="(.*?)".*?>/g);
  if (cssLink) {
    cssLink.forEach(link => {
      const href = link.match(/href="(.*?)"/);
      if (href) {
        const webviewHref = panel.webview.asWebviewUri(
          extensionApi.Uri.joinPath(extensionContext.extensionUri, 'media', href[1]),
        );
        indexHtml = indexHtml.replace(href[1], webviewHref.toString());
      }
    });
  }

  panel.webview.html = indexHtml;
  console.log('Webview HTML set, length:', indexHtml.length);
}

/**
 * Check management cluster status and notify user if action needed
 */
async function checkManagementClusterStatus(api: openShiftManagementApi): Promise<void> {
  try {
    const status = await api.getManagementClusterStatus();

    if (!status.exists) {
      console.log('Management cluster does not exist');
      // Don't auto-create - let user decide via UI
    } else if (!status.healthy) {
      console.warn('Management cluster exists but is not healthy');
      await extensionApi.window.showWarningMessage(
        'OpenShift Management cluster is not healthy. You may need to recreate it.',
      );
    } else {
      console.log('Management cluster is healthy with providers:', status.providers);
    }
  } catch (error) {
    console.error('Error checking management cluster status:', error);
  }
}
