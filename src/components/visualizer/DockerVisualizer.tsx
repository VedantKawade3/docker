"use client";

import React, { useRef, useMemo, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Float, RoundedBox } from '@react-three/drei';
import { useDockerStore, ImageState, ContainerState, NetworkState } from '@/store/useDockerStore';
import { useTheme } from '@/context/ThemeContext';
import * as THREE from 'three';
import { Layers, Box, Network, Sparkles } from 'lucide-react';

// ── Theme-aware Scene Lights ──────────────────────────────────────────────────

function SceneLights({ isLight }: { isLight: boolean }) {
  return (
    <>
      <ambientLight intensity={isLight ? 0.85 : 0.45} />
      <directionalLight
        position={[12, 18, 10]}
        intensity={isLight ? 1.5 : 1.8}
        color={isLight ? '#ffffff' : '#60a5fa'}
        castShadow
      />
      <pointLight position={[-12, -4, 6]} intensity={isLight ? 0.6 : 0.9} color="#38bdf8" />
      <pointLight position={[0, 10, -8]} intensity={isLight ? 0.4 : 0.7} color="#34d399" />
      <directionalLight position={[-10, 8, -10]} intensity={0.4} color="#818cf8" />
    </>
  );
}

// ── Theme-aware Grid Floor ────────────────────────────────────────────────────

function GridFloor({ isLight }: { isLight: boolean }) {
  return (
    <group position={[0, -2.8, 0]}>
      <gridHelper
        args={[44, 34, isLight ? '#94a3b8' : '#334155', isLight ? '#e2e8f0' : '#111827']}
        position={[0, 0, 0]}
      />
      {/* Subtle floor dock markings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[44, 44]} />
        <meshBasicMaterial
          color={isLight ? '#f1f5f9' : '#07070d'}
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  );
}

// ── Realistic Docker Shipping Container 3D Component ──────────────────────────

function RealisticDockerContainer({
  container,
  index,
  totalCount,
  isLight,
}: {
  container: ContainerState;
  index: number;
  totalCount: number;
  isLight: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const beaconRef = useRef<THREE.Mesh>(null!);
  const isRunning = container.status === 'running';

  // Container positioning along the dockyard
  const xPos = (index - (totalCount - 1) / 2) * 6.2;
  const zPos = 3.0;

  // Distinct industrial container colors (Docker Blue, Green, Orange, Teal)
  const containerColors = [
    { base: '#0284c7', accent: '#38bdf8', emissive: '#0369a1' }, // Classic Docker Blue
    { base: '#059669', accent: '#34d399', emissive: '#047857' }, // Emerald Teal
    { base: '#d97706', accent: '#fbbf24', emissive: '#b45309' }, // Industrial Amber/Orange
    { base: '#7c3aed', accent: '#a78bfa', emissive: '#6d28d9' }, // Service Purple
  ];
  const colorScheme = containerColors[index % containerColors.length];

  // Spawn animation + idle physics
  useFrame((state) => {
    if (groupRef.current) {
      // Subtle float/vibration of running engine
      const engineShake = isRunning ? Math.sin(state.clock.elapsedTime * 8 + index) * 0.015 : 0;
      groupRef.current.position.y = -1.2 + engineShake;
    }
    if (beaconRef.current && isRunning) {
      // Pulsing status beacon
      const s = 1 + Math.sin(state.clock.elapsedTime * 4 + index) * 0.25;
      beaconRef.current.scale.set(s, s, s);
    }
  });

  // Generate corrugated ridges along the side walls
  const corrugationCount = 14;
  const corrugationRibs = useMemo(() => {
    const ribs = [];
    const width = 4.8;
    const step = width / (corrugationCount + 1);
    for (let i = 1; i <= corrugationCount; i++) {
      ribs.push(-width / 2 + i * step);
    }
    return ribs;
  }, []);

  const portEntries = Object.entries(container.ports);

  return (
    <group ref={groupRef} position={[xPos, -1.2, zPos]}>
      {/* ── Main Container Box ── */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[4.8, 2.3, 2.2]} />
        <meshStandardMaterial
          color={isRunning ? colorScheme.base : '#334155'}
          roughness={0.35}
          metalness={0.65}
          emissive={isRunning ? colorScheme.emissive : '#0f172a'}
          emissiveIntensity={isRunning ? 0.25 : 0.05}
        />
      </mesh>

      {/* ── Corrugated Ribs (Front & Back Long Sides) ── */}
      {corrugationRibs.map((rx, idx) => (
        <React.Fragment key={idx}>
          {/* Front Corrugation Rib */}
          <mesh position={[rx, 0, 1.11]}>
            <boxGeometry args={[0.12, 2.05, 0.05]} />
            <meshStandardMaterial
              color={isRunning ? colorScheme.accent : '#475569'}
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
          {/* Back Corrugation Rib */}
          <mesh position={[rx, 0, -1.11]}>
            <boxGeometry args={[0.12, 2.05, 0.05]} />
            <meshStandardMaterial
              color={isRunning ? colorScheme.base : '#334155'}
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
          {/* Roof Ridge Rib */}
          <mesh position={[rx, 1.16, 0]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.12, 0.04, 2.05]} />
            <meshStandardMaterial
              color={isRunning ? colorScheme.accent : '#475569'}
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
        </React.Fragment>
      ))}

      {/* ── Steel Corner Castings (8 Corners) ── */}
      {[
        [-2.4, 1.15, 1.1], [2.4, 1.15, 1.1],
        [-2.4, -1.15, 1.1], [2.4, -1.15, 1.1],
        [-2.4, 1.15, -1.1], [2.4, 1.15, -1.1],
        [-2.4, -1.15, -1.1], [2.4, -1.15, -1.1],
      ].map(([cx, cy, cz], idx) => (
        <mesh key={idx} position={[cx, cy, cz]}>
          <boxGeometry args={[0.28, 0.28, 0.28]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {/* ── Corner Edge Frame Steel Bars ── */}
      {/* Top & Bottom Long Rails */}
      {[-1.15, 1.15].map((y, yi) => (
        <React.Fragment key={yi}>
          <mesh position={[0, y, 1.1]}>
            <boxGeometry args={[4.85, 0.14, 0.14]} />
            <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.3} />
          </mesh>
          <mesh position={[0, y, -1.1]}>
            <boxGeometry args={[4.85, 0.14, 0.14]} />
            <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.3} />
          </mesh>
        </React.Fragment>
      ))}

      {/* ── Front Cargo Doors & Vertical Steel Lock Bars ── */}
      {[-0.6, 0.6].map((bx, bi) => (
        <React.Fragment key={bi}>
          {/* Steel Vertical Lock Bar */}
          <mesh position={[bx, 0, 1.14]}>
            <cylinderGeometry args={[0.035, 0.035, 2.15, 12]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.1} />
          </mesh>
          {/* Lock Handle Cam */}
          <mesh position={[bx, -0.2, 1.18]}>
            <boxGeometry args={[0.14, 0.08, 0.08]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.2} />
          </mesh>
        </React.Fragment>
      ))}

      {/* Door Dividing Center Seam */}
      <mesh position={[0, 0, 1.13]}>
        <boxGeometry args={[0.04, 2.15, 0.02]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* ── Pulsing Top-Right Status Beacon ── */}
      <group position={[2.3, 1.35, 1.0]}>
        <mesh position={[0, -0.05, 0]}>
          <cylinderGeometry args={[0.07, 0.09, 0.1, 16]} />
          <meshStandardMaterial color="#334155" metalness={0.9} />
        </mesh>
        <mesh ref={beaconRef}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color={isRunning ? '#10b981' : '#ef4444'} />
        </mesh>
        <pointLight
          color={isRunning ? '#10b981' : '#ef4444'}
          intensity={isRunning ? 1.2 : 0.2}
          distance={3.5}
        />
      </group>

      {/* ── Stenciled Container Decals & Info ── */}
      {/* Top Banner Stencil */}
      <Text
        position={[-1.2, 0.75, 1.15]}
        fontSize={0.14}
        color="#ffffff"
        anchorX="left"
        anchorY="middle"
        font={undefined}
      >
        {`DOCKER // ${container.id.slice(0, 8).toUpperCase()}`}
      </Text>

      {/* Main Container Name */}
      <Text
        position={[0, 0.35, 1.15]}
        fontSize={0.26}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        font={undefined}
        maxWidth={4.2}
      >
        {container.name}
      </Text>

      {/* Image Tag Subtext */}
      <Text
        position={[0, 0.02, 1.15]}
        fontSize={0.16}
        color={colorScheme.accent}
        anchorX="center"
        anchorY="middle"
        font={undefined}
        maxWidth={4.0}
      >
        {container.image}
      </Text>

      {/* Port Forwarding Banner */}
      {portEntries.length > 0 && (
        <group position={[0, -0.45, 1.15]}>
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[3.2, 0.36]} />
            <meshBasicMaterial color="#0f172a" transparent opacity={0.85} />
          </mesh>
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.14}
            color="#34d399"
            anchorX="center"
            anchorY="middle"
            font={undefined}
          >
            {portEntries.map(([h, p]) => `PORT ⇄ 0.0.0.0:${h} → ${p}/tcp`).join(' | ')}
          </Text>
        </group>
      )}

      {/* Network Badge */}
      {container.network && (
        <Text
          position={[0, -0.82, 1.15]}
          fontSize={0.12}
          color="#c7d2fe"
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          {`⬡ NET: ${container.network}`}
        </Text>
      )}
    </group>
  );
}

// ── Docker Image Blueprint Stack (3D Layer Pallet) ────────────────────────────

function DockerImagePallet({
  image,
  index,
  isLight,
}: {
  image: ImageState;
  index: number;
  isLight: boolean;
}) {
  const meshRef = useRef<THREE.Group>(null!);
  const xPos = (index - 0.5) * 4.2;

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating layer stack animation
      meshRef.current.position.y = 0.6 + Math.sin(state.clock.elapsedTime * 1.5 + index) * 0.08;
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.4 + index) * 0.1;
    }
  });

  return (
    <Float floatIntensity={0.25} rotationIntensity={0.05} speed={1.8}>
      <group ref={meshRef} position={[xPos, 0.6, -3.2]}>
        {/* Heavy Pallet Base */}
        <mesh position={[0, -0.75, 0]}>
          <boxGeometry args={[2.8, 0.18, 2.8]} />
          <meshStandardMaterial
            color={isLight ? '#475569' : '#1e293b'}
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>

        {/* Stacked Filesystem Image Layers (Glowing Blueprint Disks) */}
        {[0, 1, 2, 3].map((layerIdx) => {
          const yOffset = -0.45 + layerIdx * 0.32;
          const layerSize = 2.4 - layerIdx * 0.18;
          return (
            <group key={layerIdx} position={[0, yOffset, 0]}>
              <mesh castShadow>
                <RoundedBox args={[layerSize, 0.2, layerSize]} radius={0.04} smoothness={4}>
                  <meshStandardMaterial
                    color={`hsl(${210 + layerIdx * 8}, 85%, ${isLight ? 48 : 55}%)`}
                    metalness={0.75}
                    roughness={0.2}
                    emissive="#0284c7"
                    emissiveIntensity={0.35}
                  />
                </RoundedBox>
              </mesh>
              {/* Glowing Edge Border Ring */}
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <torusGeometry args={[layerSize * 0.62, 0.025, 12, 32]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} />
              </mesh>
            </group>
          );
        })}

        {/* Floating Top Stencil Emblem */}
        <mesh position={[0, 0.82, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.06, 24]} />
          <meshStandardMaterial color="#0284c7" metalness={0.9} emissive="#38bdf8" emissiveIntensity={0.5} />
        </mesh>

        {/* Image Title Labels */}
        <Text
          position={[0, 1.3, 0]}
          fontSize={0.28}
          color={isLight ? '#0369a1' : '#60a5fa'}
          anchorX="center"
          anchorY="middle"
          font={undefined}
          maxWidth={3.0}
        >
          {image.name}
        </Text>
        <Text
          position={[0, 0.98, 0]}
          fontSize={0.16}
          color={isLight ? '#0284c7' : '#93c5fd'}
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          {`TAG: ${image.tag}  |  SIZE: ${image.size}`}
        </Text>
        <Text
          position={[0, 0.72, 0]}
          fontSize={0.11}
          color={isLight ? '#64748b' : '#38bdf8'}
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          [DOCKER IMAGE LAYERS]
        </Text>
      </group>
    </Float>
  );
}

// ── Network Grid Surface ──────────────────────────────────────────────────────

function DockerNetworkGrid({ network }: { network: NetworkState }) {
  return (
    <group position={[0, -2.4, 3.0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[16, 6]} />
        <meshBasicMaterial color="#4f46e5" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      <Text
        position={[0, 0.05, -2.6]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.22}
        color="#818cf8"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {`⬡ DOCKER NETWORK BRIDGE: ${network.name.toUpperCase()}`}
      </Text>
    </group>
  );
}

// ── Autonomous Dynamic Camera Director (No mouse controls!) ────────────────────

function WorkflowCameraDirector({
  imagesCount,
  containersCount,
}: {
  imagesCount: number;
  containersCount: number;
}) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 5.0, 14.0));
  const targetLook = useRef(new THREE.Vector3(0, 0, 0));
  const currentLook = useRef(new THREE.Vector3(0, 0, 0));

  // Determine dynamic camera vantage based on current workflow
  useEffect(() => {
    if (imagesCount === 0 && containersCount === 0) {
      // 1. Initial State: Wide establishing shot overview
      targetPos.current.set(0, 5.2, 14.5);
      targetLook.current.set(0, 0, 0);
    } else if (containersCount === 0 && imagesCount > 0) {
      // 2. Image Created (docker build): Zoom in & focus on Image Blueprint Layers
      targetPos.current.set(-1.5, 3.2, 7.5);
      targetLook.current.set(0, 0.6, -2.8);
    } else if (containersCount === 1) {
      // 3. Container Spawned (docker run): Swoop down to front view of Shipping Container
      targetPos.current.set(1.5, 2.2, 9.8);
      targetLook.current.set(0, -0.6, 3.0);
    } else {
      // 4. Multi-Container / Compose (docker-compose up): Cinematic elevated isometric perspective
      targetPos.current.set(2.8, 7.8, 16.5);
      targetLook.current.set(0, -0.6, 1.5);
    }
  }, [imagesCount, containersCount]);

  useFrame((state, delta) => {
    // Subtle idle camera breathing sway
    const breathingX = Math.sin(state.clock.elapsedTime * 0.4) * 0.25;
    const breathingY = Math.cos(state.clock.elapsedTime * 0.3) * 0.15;

    const desiredPosition = new THREE.Vector3(
      targetPos.current.x + breathingX,
      targetPos.current.y + breathingY,
      targetPos.current.z
    );

    // Smooth exponential camera interpolation (lerp)
    const smoothFactor = Math.min(1.0, delta * 2.8);
    camera.position.lerp(desiredPosition, smoothFactor);
    currentLook.current.lerp(targetLook.current, smoothFactor);
    camera.lookAt(currentLook.current);
  });

  return null;
}

// ── Empty Scene Guidance in 3D ─────────────────────────────────────────────────

function EmptySceneGuidance({ isLight }: { isLight: boolean }) {
  return (
    <group position={[0, 0.2, 0]}>
      <Text
        position={[0, 0.6, 0]}
        fontSize={0.38}
        color={isLight ? '#475569' : '#94a3b8'}
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        Docker Engine Standby
      </Text>
      <Text
        position={[0, 0.1, 0]}
        fontSize={0.2}
        color={isLight ? '#64748b' : '#64748b'}
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        Run terminal commands to build images & launch containers
      </Text>
    </group>
  );
}

// ── 3D Scene Controller ────────────────────────────────────────────────────────

function DockerScene({ isLight }: { isLight: boolean }) {
  const { images, containers, networks } = useDockerStore();
  const runningContainers = containers.filter((c) => c.status === 'running');
  const isEmpty = images.length === 0 && runningContainers.length === 0;

  return (
    <>
      <SceneLights isLight={isLight} />
      <GridFloor isLight={isLight} />

      {/* Autonomous Camera Director (Moves automatically with commands!) */}
      <WorkflowCameraDirector
        imagesCount={images.length}
        containersCount={runningContainers.length}
      />

      {isEmpty && <EmptySceneGuidance isLight={isLight} />}

      {/* ── Docker Image Blueprint Pallets (Back Row) ── */}
      {images.map((img, i) => (
        <DockerImagePallet key={img.id} image={img} index={i} isLight={isLight} />
      ))}

      {/* ── Authentic Docker Shipping Containers (Front Dockyard) ── */}
      {runningContainers.map((c, i) => (
        <RealisticDockerContainer
          key={c.id}
          container={c}
          index={i}
          totalCount={runningContainers.length}
          isLight={isLight}
        />
      ))}

      {/* ── Networks ── */}
      {networks.map((net) => (
        <DockerNetworkGrid key={net.id} network={net} />
      ))}
    </>
  );
}

// ── Dynamic HUD Legend Overlay ─────────────────────────────────────────────────

function SceneLegend({ isLight }: { isLight: boolean }) {
  const { images, containers, networks } = useDockerStore();
  const running = containers.filter((c) => c.status === 'running');

  return (
    <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none select-none">
      <div
        className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg border backdrop-blur-md transition-all shadow-sm"
        style={{
          background: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.85)',
          borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)',
          color: isLight ? '#0284c7' : '#93c5fd',
        }}
      >
        <Layers size={13} className="shrink-0" /> Images: {images.length}
      </div>
      <div
        className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg border backdrop-blur-md transition-all shadow-sm"
        style={{
          background: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.85)',
          borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)',
          color: isLight ? '#059669' : '#6ee7b7',
        }}
      >
        <Box size={13} className="shrink-0" /> Containers: {running.length}
      </div>
      {networks.length > 0 && (
        <div
          className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg border backdrop-blur-md transition-all shadow-sm"
          style={{
            background: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.85)',
            borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)',
            color: isLight ? '#7c3aed' : '#c7d2fe',
          }}
        >
          <Network size={13} className="shrink-0" /> Networks: {networks.length}
        </div>
      )}
      <div
        className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-md mt-0.5"
        style={{
          background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
          color: isLight ? '#64748b' : '#94a3b8',
        }}
      >
        <Sparkles size={11} className="text-blue-500" />
        Autonomous Cinematic Camera
      </div>
    </div>
  );
}

// ── Main Visualizer Export ────────────────────────────────────────────────────

export default function DockerVisualizer() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div
      className="w-full h-full relative overflow-hidden transition-colors duration-300"
      style={{ background: isLight ? '#f1f5f9' : '#09090f' }}
    >
      <Canvas
        camera={{ position: [0, 5.0, 14.0], fov: 52 }}
        style={{ width: '100%', height: '100%' }}
        shadows
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <DockerScene isLight={isLight} />
        </Suspense>
      </Canvas>
      <SceneLegend isLight={isLight} />
    </div>
  );
}
