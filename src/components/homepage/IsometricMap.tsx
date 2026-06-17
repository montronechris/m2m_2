"use client";
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

const ACCENT = "#CDA277";   // oro caldo (nodi tavolo)
const ORDER  = "#7E9472";   // verde salvia (comande)
const WOOD = "#7A4F30";      // legno tavoli

/* ---------- Restaurant table + chairs ---------- */
function Table({ pos, n }: { pos: [number, number, number]; n: number }) {
  const chairs = useMemo(
    () => [0, 1, 2, 3].map((i) => {
      const a = (i / 4) * Math.PI * 2;
      return [Math.cos(a) * 1.05, 0, Math.sin(a) * 1.05] as [number, number, number];
    }),
    []
  );
  return (
    <group position={pos}>
      {/* top */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.7, 0.7, 0.08, 32]} />
        <meshStandardMaterial color={WOOD} roughness={0.6} metalness={0.2} />
      </mesh>
      {/* leg */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.7, 12]} />
        <meshStandardMaterial color="#3a2618" />
      </mesh>
      {/* chairs */}
      {chairs.map((c, i) => (
        <RoundedBox key={i} args={[0.5, 0.5, 0.5]} radius={0.08} position={[c[0], 0.25, c[2]]} castShadow>
          <meshStandardMaterial color="#2a2118" roughness={0.85} />
        </RoundedBox>
      ))}
      {/* status node */}
      <Float speed={2} floatIntensity={0.5}>
        <mesh position={[0, 1.6, 0]}>
          <octahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      </Float>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.85, 1.0, 40]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ---------- Kitchen zone (back wall + counter + appliances) ---------- */
function Kitchen({ z }: { z: number }) {
  return (
    <group position={[0, 0, z]}>
      {/* back wall */}
      <mesh position={[0, 1.4, -0.6]} receiveShadow>
        <boxGeometry args={[12, 2.8, 0.3]} />
        <meshStandardMaterial color="#171210" roughness={0.9} />
      </mesh>
      {/* neon strip on wall */}
      <mesh position={[0, 2.3, -0.44]}>
        <boxGeometry args={[11, 0.06, 0.02]} />
        <meshBasicMaterial color={ACCENT} toneMapped={false} />
      </mesh>
      {/* pass counter */}
      <RoundedBox args={[10, 1, 1.4]} radius={0.1} position={[0, 0.5, 0.4]} castShadow receiveShadow>
        <meshStandardMaterial color="#241b13" roughness={0.5} metalness={0.4} />
      </RoundedBox>
      {/* steel top */}
      <mesh position={[0, 1.02, 0.4]}>
        <boxGeometry args={[10, 0.06, 1.4]} />
        <meshStandardMaterial color="#3a342c" metalness={0.85} roughness={0.25} />
      </mesh>
      {/* appliances */}
      {[-3.5, -1.2, 1.2, 3.5].map((x) => (
        <mesh key={x} position={[x, 1.4, -0.2]} castShadow>
          <boxGeometry args={[1.4, 0.8, 0.7]} />
          <meshStandardMaterial color="#2a2118" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* kitchen marker */}
      <Float speed={1.6} floatIntensity={0.4}>
        <mesh position={[0, 2.2, 0.4]}>
          <icosahedronGeometry args={[0.3, 0]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
      </Float>
    </group>
  );
}

/* ---------- Order travelling table -> kitchen ---------- */
function Order({ from, to, offset }: { from: THREE.Vector3; to: THREE.Vector3; offset: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => {
    const mid = from.clone().lerp(to, 0.5);
    mid.y += 2.6;
    return new THREE.QuadraticBezierCurve3(from, mid, to);
  }, [from, to]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.elapsedTime * 0.2 + offset) % 1;
    ref.current.position.copy(curve.getPoint(t));
    ref.current.rotation.y += 0.04;
    ref.current.scale.setScalar(0.16 + Math.sin(t * Math.PI) * 0.1);
  });
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={ORDER} emissive={ORDER} emissiveIntensity={2} toneMapped={false} />
    </mesh>
  );
}

function Trail({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
  const geo = useMemo(() => {
    const mid = from.clone().lerp(to, 0.5); mid.y += 2.6;
    const pts = new THREE.QuadraticBezierCurve3(from, mid, to).getPoints(40);
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [from, to]);
  return (
    <line>
      <primitive object={geo} attach="geometry" />
      <lineBasicMaterial color={ORDER} transparent opacity={0.18} />
    </line>
  );
}

function Scene() {
  const kitchen = new THREE.Vector3(0, 1.2, -6);
  const tables: [number, number][] = [
    [-4, 2], [0, 3], [4, 2], [-3, -1], [3, -1.5],
  ];
  const tVecs = tables.map(([x, z]) => new THREE.Vector3(x, 1.4, z));

  return (
    <>
      <color attach="background" args={["#1B1714"]} />
      <fog attach="fog" args={["#1B1714", 16, 38]} />
      <ambientLight intensity={0.6} />
      <hemisphereLight args={["#f3e6cf", "#1B1714", 0.5]} />
      <directionalLight position={[6, 14, 8]} intensity={1.3} castShadow />
      <pointLight position={[0, 5, -5]} intensity={35} color={ACCENT} distance={18} />

      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#14100D" roughness={1} />
      </mesh>
      <gridHelper args={[40, 40, "#3a2c1f", "#241b13"]} position={[0, 0.01, 0]} />

      <Kitchen z={kitchen.z} />

      {tVecs.map((t, i) => (
        <group key={i}>
          <Table pos={[t.x, 0, t.z]} n={i + 1} />
          <Trail from={t} to={kitchen} />
          <Order from={t} to={kitchen} offset={i * 0.2} />
        </group>
      ))}

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.4}
        target={[0, 0.5, -1]}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 2.6}
      />
    </>
  );
}

export default function IsometricMap() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [11, 9, 12], fov: 38 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearColor("#1B1714", 1)}
      style={{ background: "#1B1714" }}
    >
      <Scene />
    </Canvas>
  );
}
