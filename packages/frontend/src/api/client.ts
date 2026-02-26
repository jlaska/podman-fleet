import type { OpenShiftManagementApi } from '/@shared/src/OpenShiftManagementApi';
import { RpcBrowser } from '/@shared/src/messages/MessageProxy';

/**
 * API client for communicating with the backend
 */

export interface RouterState {
  url: string;
}

const podmanDesktopApi = acquirePodmanDesktopApi();
export const rpcBrowser: RpcBrowser = new RpcBrowser(window, podmanDesktopApi);
export const openShiftManagementClient: OpenShiftManagementApi = rpcBrowser.getProxy<OpenShiftManagementApi>();

// Router state management
export const saveRouterState = (state: RouterState) => {
  podmanDesktopApi.setState(state);
};

const isRouterState = (value: unknown): value is RouterState => {
  return typeof value === 'object' && !!value && 'url' in value;
};

export const getRouterState = (): RouterState => {
  const state = podmanDesktopApi.getState();
  if (isRouterState(state)) return state;
  return { url: '/' };
};
