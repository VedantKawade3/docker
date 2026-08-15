import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { levels } from '../data/levels';

export interface ImageState {
  id: string;
  name: string;
  tag: string;
  size: string;
}

export interface ContainerState {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'exited';
  ports: Record<string, string>;
  network?: string;
  hasVolume?: boolean;
  env?: Record<string, string>;
}

export interface NetworkState {
  id: string;
  name: string;
  containers: string[];
}

export interface VolumeState {
  id: string;
  name: string;
  driver: string;
}

export interface TerminalEntry {
  command: string;
  output: string;
  type: 'info' | 'error' | 'success';
}

interface SnapshotState {
  images: ImageState[];
  containers: ContainerState[];
  networks: NetworkState[];
  volumes: VolumeState[];
  terminalHistory: TerminalEntry[];
  currentLevelIndex: number;
  isLevelComplete: boolean;
  completedLevels: number[];
  customProjectStructure: any[] | null;
}

export interface DockerState extends SnapshotState {
  historyStack: SnapshotState[];
  // Actions
  executeCommand: (cmd: string) => void;
  undo: () => void;
  resetLevel: () => void;
  advanceLevel: () => void;
  setLevel: (index: number) => void;
  setCustomProjectStructure: (structure: any[] | null) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

// ─── Command Parser ───────────────────────────────────────────────────────────

function parseCommand(
  cmd: string,
  state: SnapshotState
): { nextState: Partial<SnapshotState> & { __undo?: boolean }; entry: TerminalEntry } {
  const cleanCmd = cmd.trim();
  const args = cleanCmd.split(/\s+/);
  let output = '';
  let type: TerminalEntry['type'] = 'info';

  const images = [...state.images];
  const containers = [...state.containers];
  const networks = [...state.networks];
  const volumes = [...state.volumes];

  const tool = args[0];
  const sub = args[1];

  if (tool === 'docker') {
    // ── docker build ────────────────────────────────────────────────────────
    if (sub === 'build') {
      const tIdx = args.indexOf('-t');
      const imageName = tIdx !== -1 && args[tIdx + 1] ? args[tIdx + 1] : 'my-app:latest';
      const [name, tag = 'latest'] = imageName.split(':');
      const isLean = imageName.includes('lean') || imageName.includes('prod');
      const imageSize = isLean ? '42.8MB' : '148.4MB';

      const existingIdx = images.findIndex(i => i.name === name && i.tag === tag);
      if (existingIdx !== -1) {
        images[existingIdx] = { ...images[existingIdx], size: imageSize };
        output = `[+] Building 1.2s (7/7) FINISHED\n => [internal] load build definition from Dockerfile\n => => transferring dockerfile: 320B\n => [internal] load .dockerignore\n => [1/4] FROM node:18-alpine\n => [2/4] WORKDIR /app\n => [3/4] COPY package*.json ./\n => [4/4] COPY . .\n => exporting to image\n => => exporting layers\n => => writing image sha256:3c4d5e6f7a8b\n => => naming to docker.io/library/${name}:${tag}\n\nSuccessfully tagged ${name}:${tag}`;
        type = 'success';
      } else {
        images.push({ id: uid(), name, tag, size: imageSize });
        output = isLean
          ? `[+] Multi-Stage Building 2.4s (11/11) FINISHED\n => [stage-0 1/4] FROM node:18-alpine AS builder\n => [stage-0 2/4] WORKDIR /app\n => [stage-0 3/4] RUN npm ci\n => [stage-0 4/4] RUN npm run build\n => [stage-1 1/3] FROM node:18-alpine AS runner\n => [stage-1 2/3] COPY --from=builder /app/dist ./dist\n => [stage-1 3/3] EXPOSE 3000\n => Optimized image size: 42.8MB (reduced from 1.2GB)\nSuccessfully built 8f3b2a1c9e0d\nSuccessfully tagged ${name}:${tag}`
          : `[+] Building 1.8s (8/8) FINISHED\n => [internal] load build definition from Dockerfile\n => [1/5] FROM node:18-alpine\n => [2/5] WORKDIR /app\n => [3/5] COPY package*.json ./\n => [4/5] RUN npm install\n => [5/5] COPY . .\n => exporting to image\nSuccessfully built 3c4d5e6f7a8b\nSuccessfully tagged ${name}:${tag}`;
        type = 'success';
      }
    }

    // ── docker pull ─────────────────────────────────────────────────────────
    else if (sub === 'pull') {
      const targetImg = args[2] || 'nginx:alpine';
      const [name, tag = 'latest'] = targetImg.split(':');
      const imgSize = name === 'nginx' ? '23.4MB' : name === 'redis' ? '29.8MB' : name === 'postgres' ? '242MB' : '65MB';

      if (!images.find(i => i.name === name && i.tag === tag)) {
        images.push({ id: uid(), name, tag, size: imgSize });
      }
      output = `Using default tag: ${tag}\n${tag}: Pulling from library/${name}\n59bf1c3509f3: Pull complete\n8dd830fed12e: Pull complete\nDigest: sha256:e68a1834927a421\nStatus: Downloaded newer image for ${name}:${tag}\ndocker.io/library/${name}:${tag}`;
      type = 'success';
    }

    // ── docker run ──────────────────────────────────────────────────────────
    else if (sub === 'run') {
      const detached = args.includes('-d');

      // Parse port mappings -p host:cont
      const ports: Record<string, string> = {};
      const pIdx = args.indexOf('-p');
      if (pIdx !== -1 && args[pIdx + 1]) {
        const [h, c] = args[pIdx + 1].split(':');
        if (h && c) ports[h] = c;
      }

      // Parse custom name --name <name>
      const nameIdx = args.indexOf('--name');
      const customName = nameIdx !== -1 && args[nameIdx + 1] ? args[nameIdx + 1] : undefined;

      // Parse network --network <net>
      const netIdx = args.indexOf('--network');
      const networkName = netIdx !== -1 && args[netIdx + 1] ? args[netIdx + 1] : undefined;

      // Parse volume -v vol:path
      const vIdx = args.indexOf('-v');
      const hasVolume = vIdx !== -1;
      if (hasVolume && args[vIdx + 1]) {
        const volName = args[vIdx + 1].split(':')[0];
        if (volName && !volumes.find(v => v.name === volName)) {
          volumes.push({ id: uid(), name: volName, driver: 'local' });
        }
      }

      // Parse env vars -e KEY=VAL
      const env: Record<string, string> = {};
      args.forEach((arg, i) => {
        if (arg === '-e' && args[i + 1]) {
          const [k, v] = args[i + 1].split('=');
          if (k) env[k] = v || 'true';
        }
      });

      // Target image is usually last argument
      const imageArg = args[args.length - 1];
      const [name, tag = 'latest'] = imageArg.split(':');

      const wellKnownImages: Record<string, string> = {
        nginx: '23.4MB',
        redis: '29.8MB',
        postgres: '242MB',
        mysql: '448MB',
        mongo: '650MB',
        'my-app': '148MB',
        'prod-app': '42.8MB',
      };

      const imageExists = images.find(i => i.name === name && i.tag === tag) || wellKnownImages[name];
      if (imageExists) {
        if (!images.find(i => i.name === name && i.tag === tag)) {
          const size = wellKnownImages[name] || '35MB';
          images.push({ id: uid(), name, tag, size });
          output += `Unable to find image '${name}:${tag}' locally\n${tag}: Pulling from library/${name}\nPull complete\n`;
        }

        const containerId = uid();
        const containerName = customName || `${name}_${containerId.slice(0, 5)}`;

        containers.push({
          id: containerId,
          name: containerName,
          image: `${name}:${tag}`,
          status: 'running',
          ports,
          network: networkName,
          hasVolume,
          env,
        });

        if (networkName) {
          let net = networks.find(n => n.name === networkName);
          if (!net) {
            net = { id: uid(), name: networkName, containers: [] };
            networks.push(net);
          }
          net.containers.push(containerName);
        }

        output += detached ? `${containerId}b872f8a49c30` : `Starting container ${containerName}...\n[ready] Listening on mapped ports.`;
        type = 'success';
      } else {
        output = `docker: Error response from daemon: repository '${name}' not found. Did you run 'docker build -t ${name} .' first?`;
        type = 'error';
      }
    }

    // ── docker ps ───────────────────────────────────────────────────────────
    else if (sub === 'ps') {
      const showAll = args.includes('-a');
      const targetContainers = showAll ? containers : containers.filter(c => c.status === 'running');
      const header = 'CONTAINER ID   IMAGE               COMMAND                  CREATED         STATUS         PORTS                     NAMES';
      const rows = targetContainers.map(c => {
        const portStr = Object.entries(c.ports).map(([h, p]) => `0.0.0.0:${h}->${p}/tcp`).join(', ') || '-';
        const statusStr = c.status === 'running' ? 'Up 3 minutes' : 'Exited (0) 1 minute ago';
        return `${c.id.slice(0, 12).padEnd(14)} ${c.image.padEnd(19)} "docker-entrypoint..."   3 mins ago      ${statusStr.padEnd(14)} ${portStr.padEnd(25)} ${c.name}`;
      });
      output = [header, ...rows].join('\n');
      if (targetContainers.length === 0) {
        output = 'CONTAINER ID   IMAGE   COMMAND   CREATED   STATUS   PORTS   NAMES\n(No active containers)';
      }
    }

    // ── docker images ───────────────────────────────────────────────────────
    else if (sub === 'images' || (sub === 'image' && args[2] === 'ls')) {
      const header = 'REPOSITORY        TAG       IMAGE ID       CREATED         SIZE';
      const rows = images.map(i => `${i.name.padEnd(17)} ${i.tag.padEnd(9)} ${i.id.slice(0, 12).padEnd(14)} 10 mins ago     ${i.size}`);
      output = images.length > 0 ? [header, ...rows].join('\n') : 'REPOSITORY   TAG   IMAGE ID   CREATED   SIZE\n(No images found)';
    }

    // ── docker stop ─────────────────────────────────────────────────────────
    else if (sub === 'stop') {
      const target = args[2];
      const cont = containers.find(c => c.id.startsWith(target) || c.name === target);
      if (cont) {
        cont.status = 'exited';
        output = `${cont.name}\nContainer stopped gracefully (SIGTERM received).`;
        type = 'success';
      } else {
        output = `Error response from daemon: No such container: ${target}`;
        type = 'error';
      }
    }

    // ── docker logs ─────────────────────────────────────────────────────────
    else if (sub === 'logs') {
      const target = args[2];
      const cont = containers.find(c => c.id.startsWith(target) || c.name === target);
      if (cont) {
        output = `[${cont.name}] 2026-08-15T18:00:00Z [info] Initializing service...\n[${cont.name}] 2026-08-15T18:00:01Z [ready] Server accepting connections.\n[${cont.name}] 2026-08-15T18:00:02Z [healthcheck] Status: 200 OK (0.4ms)`;
        type = 'info';
      } else {
        output = `Error response from daemon: No such container: ${target}`;
        type = 'error';
      }
    }

    // ── docker network ──────────────────────────────────────────────────────
    else if (sub === 'network') {
      const netAction = args[2];
      if (netAction === 'create') {
        const netName = args[3];
        if (!netName) {
          output = 'Error: network name is required.\nUsage: docker network create <name>';
          type = 'error';
        } else if (networks.find(n => n.name === netName)) {
          output = `Network '${netName}' already exists.`;
        } else {
          networks.push({ id: uid(), name: netName, containers: [] });
          output = `${uid()}${uid()}\nNetwork '${netName}' created successfully with bridge driver.`;
          type = 'success';
        }
      } else if (netAction === 'ls') {
        const header = 'NETWORK ID     NAME        DRIVER    SCOPE';
        const rows = [
          '8a1b2c3d4e5f   bridge      bridge    local',
          '9b2c3d4e5f6a   host        host      local',
          ...networks.map(n => `${n.id.slice(0, 12).padEnd(14)} ${n.name.padEnd(11)} bridge    local`),
        ];
        output = [header, ...rows].join('\n');
      }
    }

    // ── docker volume ───────────────────────────────────────────────────────
    else if (sub === 'volume') {
      const volAction = args[2];
      if (volAction === 'create') {
        const volName = args[3] || 'db-data';
        if (volumes.find(v => v.name === volName)) {
          output = `Volume '${volName}' already exists.`;
        } else {
          volumes.push({ id: uid(), name: volName, driver: 'local' });
          output = `${volName}\nVolume created and ready for persistent mounts.`;
          type = 'success';
        }
      } else if (volAction === 'ls') {
        const header = 'DRIVER    VOLUME NAME';
        const rows = volumes.map(v => `${v.driver.padEnd(9)} ${v.name}`);
        output = volumes.length > 0 ? [header, ...rows].join('\n') : 'DRIVER    VOLUME NAME\n(No custom volumes created)';
      }
    }

    // ── docker version / --version ──────────────────────────────────────────
    else if (sub === '--version' || sub === 'version') {
      output = 'Docker version 26.1.4, build 5650f9b';
    } else {
      output = `docker: '${sub}' is not a valid docker command.\nType 'help' to see all available commands.`;
      type = 'error';
    }
  }

  // ── docker-compose ────────────────────────────────────────────────────────
  else if (tool === 'docker-compose' || (tool === 'docker' && sub === 'compose')) {
    const composeArgs = tool === 'docker-compose' ? args.slice(1) : args.slice(2);
    const composeCmd = composeArgs[0];

    if (composeCmd === 'up') {
      const levelIdx = state.currentLevelIndex;

      // Level 9: Full-Stack 3-tier Production (Gateway + API + DB)
      if (levelIdx === 8) {
        if (!images.find(i => i.name === 'nginx')) images.push({ id: uid(), name: 'nginx', tag: 'alpine', size: '23.4MB' });
        if (!images.find(i => i.name === 'my-app')) images.push({ id: uid(), name: 'my-app', tag: 'latest', size: '148MB' });
        if (!images.find(i => i.name === 'postgres')) images.push({ id: uid(), name: 'postgres', tag: '15', size: '242MB' });

        if (!containers.find(c => c.name === 'gateway')) {
          containers.push({ id: uid(), name: 'gateway', image: 'nginx:alpine', status: 'running', ports: { '80': '80' }, network: 'app-tier' });
        }
        if (!containers.find(c => c.name === 'api')) {
          containers.push({ id: uid(), name: 'api', image: 'my-app:latest', status: 'running', ports: {}, network: 'app-tier' });
        }
        if (!containers.find(c => c.name === 'db')) {
          containers.push({ id: uid(), name: 'db', image: 'postgres:15', status: 'running', ports: {}, network: 'data-tier', hasVolume: true });
        }

        if (!networks.find(n => n.name === 'app-tier')) networks.push({ id: uid(), name: 'app-tier', containers: ['gateway', 'api'] });
        if (!networks.find(n => n.name === 'data-tier')) networks.push({ id: uid(), name: 'data-tier', containers: ['api', 'db'] });

        output = `[+] Running 3/3\n ✔ Network production-stack_app-tier   Created  0.1s\n ✔ Network production-stack_data-tier  Created  0.1s\n ✔ Container db                         Started  0.5s\n ✔ Container api                        Started  0.7s\n ✔ Container gateway                    Started  0.9s\n\nFull-Stack 3-Tier Production Architecture Online!`;
        type = 'success';
      }
      // Standard 2-tier Compose Stack (Web + Redis)
      else {
        if (!images.find(i => i.name === 'my-app')) images.push({ id: uid(), name: 'my-app', tag: 'latest', size: '148MB' });
        if (!images.find(i => i.name === 'redis')) images.push({ id: uid(), name: 'redis', tag: 'alpine', size: '29.8MB' });

        if (!containers.find(c => c.image === 'my-app:latest')) {
          containers.push({ id: uid(), name: 'my-app-web-1', image: 'my-app:latest', status: 'running', ports: { '3000': '3000' }, network: 'my-app_default' });
        }
        if (!containers.find(c => c.image === 'redis:alpine')) {
          containers.push({ id: uid(), name: 'my-app-redis-1', image: 'redis:alpine', status: 'running', ports: {}, network: 'my-app_default' });
        }
        if (!networks.find(n => n.name === 'my-app_default')) {
          networks.push({ id: uid(), name: 'my-app_default', containers: ['my-app-web-1', 'my-app-redis-1'] });
        }

        output = `[+] Running 2/2\n ✔ Network my-app_default   Created  0.1s\n ✔ Container my-app-redis-1 Started  0.4s\n ✔ Container my-app-web-1   Started  0.6s`;
        type = 'success';
      }
    } else if (composeCmd === 'down') {
      const remaining = containers.filter(c => !c.network?.includes('app') && !c.network?.includes('tier') && !c.network?.includes('default'));
      containers.length = 0;
      containers.push(...remaining);
      output = `[+] Running 2/2\n ✔ Containers Stopped and Removed\n ✔ Network bridges cleaned up`;
      type = 'success';
    } else {
      output = `docker-compose: '${composeCmd}' is not recognized. Try 'docker-compose up' or 'docker-compose down'.`;
      type = 'error';
    }
  }

  // ── General Utility Commands ───────────────────────────────────────────────
  else if (tool === 'undo') {
    return { nextState: { __undo: true }, entry: { command: cmd, output: 'Undid last command.', type: 'info' } };
  } else if (tool === 'reset') {
    return { nextState: { images: [], containers: [], networks: [], volumes: [], isLevelComplete: false }, entry: { command: cmd, output: 'Level state reset.', type: 'info' } };
  } else if (tool === 'clear') {
    return { nextState: { terminalHistory: [] }, entry: { command: cmd, output: '', type: 'info' } };
  } else if (tool === 'help') {
    output = `Docker Learning Workflow — Command Quick Reference:
  docker build -t <name[:tag]> .         Build an image from Dockerfile
  docker run [-d] [-p h:c] <image>       Run container in background with port mapping
  docker run -d --name <name> <image>    Run container with custom name
  docker run -d --network <net> <image>  Run container attached to custom network
  docker run -d -v <vol:path> <image>    Run container with persistent volume mount
  docker run -d -e KEY=VAL <image>       Run container with runtime environment variables
  docker pull <image:tag>                Pull pre-built image from Docker Hub registry
  docker ps [-a]                         List running [or all] containers
  docker images                          List locally cached images
  docker logs <name|id>                  View standard output logs of a container
  docker stop <name|id>                  Gracefully terminate a running container
  docker network create <name>           Create custom isolated bridge network
  docker volume create <name>            Create persistent storage volume
  docker-compose up [-d]                 Start multi-container service architecture
  docker-compose down                    Stop and clean up all compose services
  undo                                   Revert last executed command
  reset                                  Reset level environment to initial state
  clear                                  Clear terminal scrollback`;
  } else if (tool === '') {
    output = '';
  } else {
    output = `bash: ${tool}: command not found. Type 'help' to see all available Docker commands.`;
    type = 'error';
  }

  return { nextState: { images, containers, networks, volumes }, entry: { command: cmd, output, type } };
}

// ─── Store ────────────────────────────────────────────────────────────────────

const INITIAL: SnapshotState = {
  images: [],
  containers: [],
  networks: [],
  volumes: [],
  terminalHistory: [],
  currentLevelIndex: 0,
  isLevelComplete: false,
  completedLevels: [],
  customProjectStructure: null,
};

function checkLevelCompletion(state: SnapshotState): boolean {
  const level = levels[state.currentLevelIndex];
  if (!level?.expectedFinalState) return false;
  let complete = true;

  // Check expected images
  if (level.expectedFinalState.images) {
    level.expectedFinalState.images.forEach(img => {
      const [n, t = 'latest'] = img.split(':');
      if (!state.images.find(i => i.name === n && i.tag === t)) complete = false;
    });
  }

  // Check expected containers
  if (level.expectedFinalState.containers) {
    level.expectedFinalState.containers.forEach(exp => {
      const [n, t = 'latest'] = exp.image.split(':');
      const found = state.containers.find(c => {
        const matchesImage = c.image === `${n}:${t}` || c.image.startsWith(n);
        const matchesStatus = exp.status ? c.status === exp.status : c.status === 'running';
        const matchesNet = exp.network ? c.network === exp.network : true;
        const matchesVol = exp.hasVolume ? c.hasVolume : true;
        return matchesImage && matchesStatus && matchesNet && matchesVol;
      });

      if (!found) {
        complete = false;
        return;
      }

      if (exp.ports) {
        Object.entries(exp.ports).forEach(([h, c]) => {
          if (found.ports[h] !== c) complete = false;
        });
      }
    });
  }

  // Check expected volumes
  if (level.expectedFinalState.volumes) {
    level.expectedFinalState.volumes.forEach(volName => {
      if (!state.volumes.find(v => v.name === volName)) complete = false;
    });
  }

  // Check expected networks
  if (level.expectedFinalState.networks) {
    level.expectedFinalState.networks.forEach(netName => {
      if (!state.networks.find(n => n.name === netName)) complete = false;
    });
  }

  return complete;
}

export const useDockerStore = create<DockerState>()(
  persist(
    (set, get) => ({
      ...INITIAL,
      historyStack: [],

      setCustomProjectStructure: (structure) => set({ customProjectStructure: structure }),

      executeCommand: (cmd: string) => {
        const state = get();
        const snapshot: SnapshotState = {
          images: [...state.images],
          containers: [...state.containers],
          networks: [...state.networks],
          volumes: [...state.volumes],
          terminalHistory: [...state.terminalHistory],
          currentLevelIndex: state.currentLevelIndex,
          isLevelComplete: state.isLevelComplete,
          completedLevels: [...state.completedLevels],
          customProjectStructure: state.customProjectStructure,
        };

        const { nextState, entry } = parseCommand(cmd, snapshot);

        if (nextState.__undo) {
          get().undo();
          return;
        }

        const baseHistory = cmd === ''
          ? snapshot.terminalHistory
          : nextState.terminalHistory ?? [...snapshot.terminalHistory, entry];

        const merged: Partial<SnapshotState> = { ...nextState, terminalHistory: baseHistory };
        delete (merged as Record<string, unknown>).__undo;

        const afterImages = (merged.images ?? snapshot.images) as ImageState[];
        const afterContainers = (merged.containers ?? snapshot.containers) as ContainerState[];
        const afterNetworks = (merged.networks ?? snapshot.networks) as NetworkState[];
        const afterVolumes = (merged.volumes ?? snapshot.volumes) as VolumeState[];

        const tempState: SnapshotState = {
          ...snapshot,
          ...merged,
          images: afterImages,
          containers: afterContainers,
          networks: afterNetworks,
          volumes: afterVolumes,
        };

        const nowComplete = !snapshot.isLevelComplete && checkLevelCompletion(tempState);

        set(s => ({
          ...merged,
          isLevelComplete: nowComplete ? true : s.isLevelComplete,
          historyStack: [...s.historyStack, snapshot],
        }));
      },

      undo: () => {
        set(state => {
          if (state.historyStack.length === 0) return state;
          const stack = [...state.historyStack];
          const prev = stack.pop()!;
          return { ...prev, historyStack: stack };
        });
      },

      resetLevel: () => {
        set(s => ({
          images: [], containers: [], networks: [], volumes: [],
          terminalHistory: [...s.terminalHistory, { command: 'reset', output: 'Level state reset to initial conditions.', type: 'info' }],
          isLevelComplete: false,
          historyStack: [],
        }));
      },

      advanceLevel: () => {
        set(s => {
          const next = s.currentLevelIndex + 1;
          if (next >= levels.length) return s;
          return {
            currentLevelIndex: next,
            images: [], containers: [], networks: [], volumes: [],
            terminalHistory: [],
            isLevelComplete: false,
            historyStack: [],
            completedLevels: s.completedLevels.includes(s.currentLevelIndex)
              ? s.completedLevels
              : [...s.completedLevels, s.currentLevelIndex],
          };
        });
      },

      setLevel: (index: number) => {
        set(s => {
          const target = Math.max(0, Math.min(index, levels.length - 1));
          return {
            currentLevelIndex: target,
            images: [], containers: [], networks: [], volumes: [],
            terminalHistory: [],
            isLevelComplete: false,
            historyStack: [],
          };
        });
      },
    }),
    {
      name: 'docker-sim-progress',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        completedLevels: s.completedLevels,
        currentLevelIndex: s.currentLevelIndex,
      }),
    }
  )
);
