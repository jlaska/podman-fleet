import type { ExtensionContext } from '@podman-desktop/api';
import * as extensionApi from '@podman-desktop/api';
import fs from 'node:fs';
import { RpcExtension } from '/@shared/src/messages/MessageProxy';
import { podmanFleetApi } from './api-impl';

/**
 * Podman Fleet Extension
 * Kubernetes fleet management using Cluster API
 */

let fleetPanel: extensionApi.WebviewPanel | undefined;

export async function activate(extensionContext: ExtensionContext): Promise<void> {
  console.log('Starting Podman Fleet extension');

  // Create the API instance
  const fleetApi = new podmanFleetApi(extensionContext);

  // Create webview panel for the fleet dashboard
  fleetPanel = extensionApi.window.createWebviewPanel('podmanFleet', 'Podman Fleet', {
    localResourceRoots: [extensionApi.Uri.joinPath(extensionContext.extensionUri, 'media')],
  });
  extensionContext.subscriptions.push(fleetPanel);

  // Set up the webview HTML
  await setupWebview(extensionContext, fleetPanel);

  // Register the RPC API
  const rpcExtension = new RpcExtension(fleetPanel.webview);
  rpcExtension.registerInstance<podmanFleetApi>(podmanFleetApi, fleetApi);

  // Register provider (optional - for future Podman Desktop integration)
  const provider = extensionApi.provider.createProvider({
    name: 'Podman Fleet',
    id: 'podman-fleet',
    status: 'ready',
    images: {
      icon: './icon.png',
    },
  });
  extensionContext.subscriptions.push(provider);

  console.log('Podman Fleet extension activated');

  // Check management cluster status on startup
  checkManagementClusterStatus(fleetApi);
}

export async function deactivate(): Promise<void> {
  console.log('Stopping Podman Fleet extension');
  fleetPanel?.dispose();
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
}

/**
 * Check management cluster status and notify user if action needed
 */
async function checkManagementClusterStatus(api: podmanFleetApi): Promise<void> {
  try {
    const status = await api.getManagementClusterStatus();

    if (!status.exists) {
      console.log('Management cluster does not exist');
      // Don't auto-create - let user decide via UI
    } else if (!status.healthy) {
      console.warn('Management cluster exists but is not healthy');
      await extensionApi.window.showWarningMessage(
        'Podman Fleet management cluster is not healthy. You may need to recreate it.',
      );
    } else {
      console.log('Management cluster is healthy with providers:', status.providers);
    }
  } catch (error) {
    console.error('Error checking management cluster status:', error);
  }
}
