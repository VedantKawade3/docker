export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
}

export interface Level {
  id: string;
  title: string;
  objective: string;
  problem: string;
  hints: string[];
  initialFiles: FileNode[];
  expectedFinalState?: {
    images?: string[];
    containers?: {
      image: string;
      ports?: Record<string, string>;
      network?: string;
      status?: 'running' | 'exited';
      hasVolume?: boolean;
    }[];
    volumes?: string[];
    networks?: string[];
  };
}

export const levels: Level[] = [
  // ── 1. Image Basics ────────────────────────────────────────────────────────
  {
    id: "level-1",
    title: "Level 1: Containerizing an Application",
    objective: "Build your first Docker image from a Dockerfile.",
    problem: "You built a Node.js web server, but your teammate cannot run it because they have conflicting Node.js versions. Package the application and its dependencies into a reproducible Docker Image using `docker build`.",
    hints: ["docker build -t my-app ."],
    initialFiles: [
      {
        name: "my-app",
        type: "folder",
        children: [
          {
            name: "Dockerfile",
            type: "file",
            content: `FROM node:18-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 3000\nCMD ["node", "server.js"]`
          },
          {
            name: "server.js",
            type: "file",
            content: `const http = require('http');\nconst server = http.createServer((req, res) => {\n  res.writeHead(200, {'Content-Type': 'application/json'});\n  res.end(JSON.stringify({ message: "Hello from Dockerized Node.js!" }));\n});\nserver.listen(3000, () => console.log('Server running on port 3000'));`
          },
          {
            name: "package.json",
            type: "file",
            content: `{\n  "name": "my-app",\n  "version": "1.0.0",\n  "scripts": { "start": "node server.js" }\n}`
          }
        ]
      }
    ],
    expectedFinalState: {
      images: ["my-app:latest"]
    }
  },

  // ── 2. Port Forwarding & Detached Mode ──────────────────────────────────────
  {
    id: "level-2",
    title: "Level 2: Running & Port Forwarding",
    objective: "Run a container in the background and expose host ports.",
    problem: "A Docker image is just a blueprint. To make it accessible on your machine, launch a container in detached mode (`-d`) and forward host port `3000` to container port `3000` (`-p 3000:3000`).",
    hints: [
      "docker build -t my-app .",
      "docker run -d -p 3000:3000 my-app"
    ],
    initialFiles: [
      {
        name: "my-app",
        type: "folder",
        children: [
          {
            name: "server.js",
            type: "file",
            content: `const express = require('express');\nconst app = express();\napp.get('/', (req, res) => res.send('API Online'));\napp.listen(3000);`
          },
          {
            name: "Dockerfile",
            type: "file",
            content: `FROM node:18-alpine\nWORKDIR /app\nCOPY . .\nEXPOSE 3000\nCMD ["node", "server.js"]`
          }
        ]
      }
    ],
    expectedFinalState: {
      containers: [
        { image: "my-app:latest", ports: { "3000": "3000" }, status: "running" }
      ]
    }
  },

  // ── 3. Container Lifecycle & Inspection ─────────────────────────────────────
  {
    id: "level-3",
    title: "Level 3: Container Lifecycle & Logs",
    objective: "Inspect running containers and manage their lifecycle.",
    problem: "Your container is running in production, but you need to inspect its status with `docker ps`, check output with `docker logs`, and gracefully terminate it using `docker stop`.",
    hints: [
      "docker run -d -p 3000:3000 --name web-service my-app",
      "docker ps",
      "docker stop web-service"
    ],
    initialFiles: [
      {
        name: "web-service",
        type: "folder",
        children: [
          {
            name: "Dockerfile",
            type: "file",
            content: `FROM node:18-alpine\nWORKDIR /app\nCOPY . .\nCMD ["node", "server.js"]`
          },
          {
            name: "server.js",
            type: "file",
            content: `console.log('Worker initialized, listening for requests...');`
          }
        ]
      }
    ],
    expectedFinalState: {
      containers: [
        { image: "my-app:latest", status: "exited" }
      ]
    }
  },

  // ── 4. Docker Hub & Registry Images ─────────────────────────────────────────
  {
    id: "level-4",
    title: "Level 4: Pulling Pre-built Hub Images",
    objective: "Pull and run an official NGINX reverse proxy from Docker Hub.",
    problem: "You do not need to write a Dockerfile for standard software. Pull the official lightweight `nginx:alpine` image from Docker Hub and start it forwarding host port `8080` to HTTP port `80`.",
    hints: [
      "docker pull nginx:alpine",
      "docker run -d -p 8080:80 nginx:alpine"
    ],
    initialFiles: [
      {
        name: "nginx-config",
        type: "folder",
        children: [
          {
            name: "index.html",
            type: "file",
            content: `<!DOCTYPE html>\n<html>\n<body><h1>Welcome to NGINX Docker Proxy</h1></body>\n</html>`
          }
        ]
      }
    ],
    expectedFinalState: {
      images: ["nginx:alpine"],
      containers: [
        { image: "nginx:alpine", ports: { "8080": "80" }, status: "running" }
      ]
    }
  },

  // ── 5. Persistent Volumes ───────────────────────────────────────────────────
  {
    id: "level-5",
    title: "Level 5: Persistent Volumes & Databases",
    objective: "Attach a persistent volume to preserve database data.",
    problem: "Containers are ephemeral: when destroyed, their internal data is lost. Create a persistent named Docker volume `db-data` and mount it to PostgreSQL (`postgres:15`) on port `5432`.",
    hints: [
      "docker volume create db-data",
      "docker run -d -p 5432:5432 -v db-data:/var/lib/postgresql/data postgres:15"
    ],
    initialFiles: [
      {
        name: "db-setup",
        type: "folder",
        children: [
          {
            name: "schema.sql",
            type: "file",
            content: `CREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  username VARCHAR(50) NOT NULL,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);`
          }
        ]
      }
    ],
    expectedFinalState: {
      volumes: ["db-data"],
      containers: [
        { image: "postgres:15", ports: { "5432": "5432" }, hasVolume: true, status: "running" }
      ]
    }
  },

  // ── 6. Custom Bridge Networks ───────────────────────────────────────────────
  {
    id: "level-6",
    title: "Level 6: Custom Bridge Networks",
    objective: "Isolate containers within a custom private bridge network.",
    problem: "By default, containers cannot securely resolve each other by name. Create a dedicated bridge network `app-net` and attach your container to it so microservices can communicate over internal DNS.",
    hints: [
      "docker network create app-net",
      "docker run -d --network app-net --name backend-api my-app"
    ],
    initialFiles: [
      {
        name: "microservice",
        type: "folder",
        children: [
          {
            name: "client.js",
            type: "file",
            content: `// Connect to backend via internal container hostname 'backend-api'\nfetch('http://backend-api:3000/api/health')\n  .then(res => res.json());`
          }
        ]
      }
    ],
    expectedFinalState: {
      networks: ["app-net"],
      containers: [
        { image: "my-app:latest", network: "app-net", status: "running" }
      ]
    }
  },

  // ── 7. Environment Variables & 12-Factor Config ──────────────────────────────
  {
    id: "level-7",
    title: "Level 7: Environment Variables & Config",
    objective: "Inject runtime configuration using environment variables.",
    problem: "Hardcoding credentials or port numbers into images is an anti-pattern. Launch `my-app` injecting `PORT=8000` and `NODE_ENV=production` via `-e` flags.",
    hints: [
      "docker run -d -p 8000:8000 -e PORT=8000 -e NODE_ENV=production my-app"
    ],
    initialFiles: [
      {
        name: "config-app",
        type: "folder",
        children: [
          {
            name: "server.js",
            type: "file",
            content: `const port = process.env.PORT || 3000;\nconst env = process.env.NODE_ENV || 'development';\nconsole.log(\`Running in \${env} mode on port \${port}\`);`
          }
        ]
      }
    ],
    expectedFinalState: {
      containers: [
        { image: "my-app:latest", ports: { "8000": "8000" }, status: "running" }
      ]
    }
  },

  // ── 8. Docker Compose Multi-Container ───────────────────────────────────────
  {
    id: "level-8",
    title: "Level 8: Docker Compose Orchestration",
    objective: "Orchestrate multi-container applications with Docker Compose.",
    problem: "Managing multiple `docker run` commands manually is tedious. Use `docker-compose up` to start both the Web App and the Redis caching layer declared in `docker-compose.yml` simultaneously.",
    hints: [
      "docker-compose up"
    ],
    initialFiles: [
      {
        name: "compose-stack",
        type: "folder",
        children: [
          {
            name: "docker-compose.yml",
            type: "file",
            content: `version: '3.8'\nservices:\n  web:\n    image: my-app:latest\n    ports:\n      - "3000:3000"\n    environment:\n      - REDIS_HOST=redis\n    networks:\n      - backend\n  redis:\n    image: redis:alpine\n    networks:\n      - backend\n\nnetworks:\n  backend:\n    driver: bridge`
          }
        ]
      }
    ],
    expectedFinalState: {
      containers: [
        { image: "my-app:latest", ports: { "3000": "3000" }, status: "running" },
        { image: "redis:alpine", ports: {}, status: "running" }
      ]
    }
  },

  // ── 9. Full-Stack 3-Tier Production Architecture ────────────────────────────
  {
    id: "level-9",
    title: "Level 9: Full-Stack 3-Tier Microservices",
    objective: "Run a complete production stack: Frontend + Backend + Database.",
    problem: "Launch a full-stack production architecture with an NGINX Gateway on port `80`, Node.js REST API on port `3000`, and a PostgreSQL Database connected through internal Docker networks.",
    hints: [
      "docker-compose up -d"
    ],
    initialFiles: [
      {
        name: "production-stack",
        type: "folder",
        children: [
          {
            name: "docker-compose.yml",
            type: "file",
            content: `version: '3.8'\nservices:\n  gateway:\n    image: nginx:alpine\n    ports:\n      - "80:80"\n    depends_on:\n      - api\n    networks:\n      - app-tier\n\n  api:\n    image: my-app:latest\n    environment:\n      - DATABASE_URL=postgres://db:5432/main\n    networks:\n      - app-tier\n      - data-tier\n\n  db:\n    image: postgres:15\n    volumes:\n      - postgres_data:/var/lib/postgresql/data\n    networks:\n      - data-tier\n\nvolumes:\n  postgres_data:\n\nnetworks:\n  app-tier:\n  data-tier:`
          }
        ]
      }
    ],
    expectedFinalState: {
      containers: [
        { image: "nginx:alpine", ports: { "80": "80" }, status: "running" },
        { image: "my-app:latest", ports: {}, status: "running" },
        { image: "postgres:15", ports: {}, status: "running" }
      ]
    }
  },

  // ── 10. Multi-Stage Dockerfile Optimization ─────────────────────────────────
  {
    id: "level-10",
    title: "Level 10: Multi-Stage Build Optimization",
    objective: "Optimize container images for production using Multi-Stage Builds.",
    problem: "Standard Docker images contain build tools, source code, and development dependencies (often > 1GB). Use a Multi-Stage Dockerfile to compile the binary in a `builder` stage, then copy only the compiled output into a tiny Alpine image (`prod-app:lean`).",
    hints: [
      "docker build -t prod-app:lean ."
    ],
    initialFiles: [
      {
        name: "optimized-app",
        type: "folder",
        children: [
          {
            name: "Dockerfile",
            type: "file",
            content: `# Stage 1: Build & Dependencies\nFROM node:18-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\n# Stage 2: Minimal Production Runtime\nFROM node:18-alpine AS runner\nWORKDIR /app\nENV NODE_ENV=production\nCOPY --from=builder /app/dist ./dist\nCOPY --from=builder /app/package.json ./\nEXPOSE 3000\nCMD ["node", "dist/server.js"]`
          },
          {
            name: ".dockerignore",
            type: "file",
            content: `node_modules\n.git\n.env\n*.md\ncoverage`
          }
        ]
      }
    ],
    expectedFinalState: {
      images: ["prod-app:lean"]
    }
  }
];
