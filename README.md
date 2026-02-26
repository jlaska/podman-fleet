# OpenShift Management - Cluster Management Extension for Podman Desktop

A Podman Desktop extension that provides declarative, provider-agnostic OpenShift and Kubernetes cluster lifecycle management using **Kubernetes Cluster API (CAPI)**.

## Overview

OpenShift Management enables users to create, import, and manage multiple OpenShift and Kubernetes clusters from their workstation without switching between multiple tools and CLIs. Instead of wrapping individual CLIs (kind, rosa, az), this extension leverages Cluster API to provide:

- **Declarative cluster definitions** as Kubernetes CRDs
- **Consistent lifecycle management** across all providers
- **Single management interface** via `clusterctl` and Kubernetes API
- **Extensible provider model** for new infrastructure targets

## Features

### Management Cluster
- Auto-created Kind cluster with Podman backend
- Runs CAPI controllers for cluster lifecycle management
- Persistent across Podman Desktop sessions

### Cluster Creation (CAPI-Managed)
- **Local clusters** via CAPD (Cluster API Provider Docker)
- **ROSA HCP** via CAPA (Cluster API Provider AWS)
- **ARO** via CAPZ (Cluster API Provider Azure) + Azure Service Operator
- **Other providers** (vSphere, OpenShift, etc.)

### Cluster Import
- Import existing clusters via kubeconfig
- Monitor imported clusters (read-only)
- Display alongside CAPI-managed clusters

### Management Dashboard
- Unified view of all clusters (managed + imported)
- Metrics: total clusters, provider distribution, health status
- Version distribution charts
- Cluster operations: View, Scale, Delete, Refresh

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Podman Desktop Extension                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Dashboard   │  │  CAPI Manager│  │  Import Manager      │  │
│  │  (Webview)   │  │  (Backend)   │  │  (Kubeconfig-only)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Kind Management Cluster (Auto-created)              │
│                   (runs CAPI controllers)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Workload Clusters                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Kind     │  │ ROSA HCP │  │ ARO      │  │ vSphere  │  ...   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Backend:** TypeScript, Podman Desktop API
- **Frontend:** Svelte 5, TailwindCSS, [@podman-desktop/ui-svelte](https://www.npmjs.com/package/@podman-desktop/ui-svelte)
- **Package Manager:** pnpm
- **Build Tool:** Vite

## Project Structure

```
openshift-management/
├── packages/
│   ├── backend/              # Extension core
│   │   ├── src/
│   │   │   ├── extension.ts  # Entry point
│   │   │   ├── api-impl.ts   # RPC implementation
│   │   │   ├── capi/         # CAPI management
│   │   │   └── storage/      # Cluster metadata storage
│   │   └── media/            # Built frontend
│   ├── frontend/             # Svelte 5 webview
│   │   ├── src/
│   │   │   ├── views/        # Dashboard, cluster list
│   │   │   ├── components/   # Metrics, charts
│   │   │   └── wizards/      # Create/import wizards
│   └── shared/               # Types and RPC contracts
│       └── src/
│           ├── OpenShiftManagementApi.ts
│           └── types/
├── pnpm-workspace.yaml
└── package.json
```

## Development

### Prerequisites

- Node.js >= 22.0.0
- pnpm >= 9.0.0
- Podman Desktop >= 1.17

### Setup

1. Clone the repository:
```sh
git clone git@github.com:jlaska/podman-fleet.git
cd podman-fleet
```

2. Install dependencies:
```sh
pnpm install
```

3. Build the extension:
```sh
pnpm run build
```

4. Load in Podman Desktop:
   - Navigate to Settings → Extensions
   - Enable "Development Mode"
   - Go to Extensions → Local extension tab
   - Click "Add a local folder..."
   - Select `packages/backend` directory

### Development Workflow

Watch mode (rebuild on changes):
```sh
pnpm run watch
```

Format code:
```sh
pnpm run format:fix
```

Lint code:
```sh
pnpm run lint:fix
```

Type check:
```sh
pnpm run typecheck
```

Run tests:
```sh
pnpm run test
```

## CLI Dependencies

The extension automatically manages these tools:

| Tool | Purpose | Auto-Install |
|------|---------|--------------|
| `kind` | Create management cluster | Yes |
| `clusterctl` | CAPI management | Yes |
| `kubectl` | Apply manifests, query status | Yes |
| `helm` | Install ASO for ARO support | Yes |

Optional (for specific providers):
- `az` - Azure login for ARO credentials

## Implementation Status

- [x] Phase 0: Repository setup
- [ ] Phase 1: Foundation + Management Cluster
- [ ] Phase 2: Local Cluster Creation (CAPD)
- [ ] Phase 3: Import + Dashboard
- [ ] Phase 4: Cloud Providers (ROSA HCP, ARO)
- [ ] Phase 5: Polish

## Contributing

Contributions are welcome! Please follow the standard pull request process.

## License

Apache-2.0

## Resources

- [Podman Desktop Extensions Documentation](https://podman-desktop.io/docs/extensions)
- [Kubernetes Cluster API](https://cluster-api.sigs.k8s.io/)
- [ROSA Cluster API Provider](https://github.com/kubernetes-sigs/cluster-api-provider-aws)
- [ARO Cluster API Integration](https://github.com/stolostron/cluster-api-installer/blob/installer-aro/doc/ARO-capz.md)
