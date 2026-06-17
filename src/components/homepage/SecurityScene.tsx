"use client";
import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float } from "@react-three/drei";
import * as THREE from "three";

const GOLD = "#CDA277";
const SAGE = "#7E9472";
const RED = "#C0563A";
const CREAM = "#F1E8D8";

const SERVER = new THREE.Vector3(0, 1.4, 0);
const QR = new THREE.Vector3(-6, 1.2, 3);
const TABLE = new THREE.Vector3(5.5, 1, -2.5);
const ATTACK = new THREE.Vector3(6, 1, 5.5);
const SHIELD_R = 1.9;

function Core() {
  const shell = useRef<THREE.Mesh>(null);
  useFrame((_, d) => { if (shell.current) { shell.current.rotation.y += d * 0.5; shell.current.rotation.x += d * 0.2; } });
  return (
    <group position={SERVER.toArray()}>
      <Float speed={1.4} floatIntensity={0.4}>
        <mesh>
          <icosahedronGeometry args={[0.6, 0]} />
          <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
        <mesh ref={shell}>
          <icosahedronGeometry args={[1.0, 1]} />
          <meshBasicMaterial color={GOLD} wireframe transparent opacity={0.3} />
        </mesh>
      </Float>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.4, 0]}>
        <ringGeometry args={[1.2, 1.4, 48]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Node({ pos, color, locked }: { pos: THREE.Vector3; color: string; locked?: boolean }) {
  return (
    <group position={pos.toArray()}>
      <Float speed={2} floatIntensity={0.5}>
        <mesh position={[0, 0.4, 0]}>
          {locked ? <boxGeometry args={[0.5, 0.5, 0.5]} /> : <octahedronGeometry args={[0.32, 0]} />}
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
      </Float>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.55, 0.7, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Packet({ from, to, color, offset, speed = 0.25 }: {
  from: THREE.Vector3; to: THREE.Vector3; color: string; offset: number; speed?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => {
    const mid = from.clone().lerp(to, 0.5); mid.y += 2.2;
    return new THREE.QuadraticBezierCurve3(from, mid, to);
  }, [from, to]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.elapsedTime * speed + offset) % 1;
    ref.current.position.copy(curve.getPoint(t));
    ref.current.rotation.x += 0.05; ref.current.rotation.y += 0.05;
    ref.current.scale.setScalar(0.14 + Math.sin(t * Math.PI) * 0.1);
  });
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} />
    </mesh>
  );
}

function Trail({ from, to, color }: { from: THREE.Vector3; to: THREE.Vector3; color: string }) {
  const geo = useMemo(() => {
    const mid = from.clone().lerp(to, 0.5); mid.y += 2.2;
    return new THREE.BufferGeometry().setFromPoints(new THREE.QuadraticBezierCurve3(from, mid, to).getPoints(40));
  }, [from, to]);
  return (<line><primitive object={geo} attach="geometry" /><lineBasicMaterial color={color} transparent opacity={0.16} /></line>);
}

/* attacker che viene respinto dallo scudo del tavolo */
function Attacker({ onBlock }: { onBlock: (v: boolean) => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const edge = useMemo(() => ATTACK.clone().lerp(TABLE, 1 - SHIELD_R / ATTACK.distanceTo(TABLE)), []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const tri = Math.abs(((clock.elapsedTime * 0.4) % 2) - 1); // 0->1->0
    ref.current.position.copy(ATTACK.clone().lerp(edge, tri));
    const near = tri > 0.92;
    onBlock(near);
    (ref.current.material as THREE.MeshStandardMaterial).opacity = near ? 0.3 : 1;
  });
  return (
    <mesh ref={ref}>
      <tetrahedronGeometry args={[0.3, 0]} />
      <meshStandardMaterial color={RED} emissive={RED} emissiveIntensity={1.6} transparent toneMapped={false} />
    </mesh>
  );
}

function Shield({ active }: { active: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const base = 0.08 + (active ? 0.22 : 0);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = base + Math.sin(clock.elapsedTime * 4) * 0.03;
  });
  return (
    <mesh ref={ref} position={TABLE.toArray()}>
      <sphereGeometry args={[SHIELD_R, 24, 24]} />
      <meshBasicMaterial color={SAGE} wireframe transparent opacity={0.1} />
    </mesh>
  );
}

function Scene() {
  const [blocked, setBlocked] = useState(false);
  return (
    <>
      <color attach="background" args={["#0E0B09"]} />
      <fog attach="fog" args={["#0E0B09", 14, 36]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 12, 6]} intensity={1.1} />
      <pointLight position={SERVER.toArray()} intensity={30} color={GOLD} distance={16} />

      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[40, 40]} /><meshStandardMaterial color="#0B0908" roughness={1} /></mesh>
      <gridHelper args={[40, 40, "#3a2c1f", "#1c1510"]} position={[0, 0.01, 0]} />

      <Core />
      <Node pos={QR} color={CREAM} />
      <Node pos={TABLE} color={SAGE} locked />

      <Trail from={QR} to={SERVER} color={CREAM} />
      <Trail from={SERVER} to={TABLE} color={SAGE} />
      <Packet from={QR} to={SERVER} color={CREAM} offset={0} />
      <Packet from={SERVER} to={TABLE} color={SAGE} offset={0.4} />
      <Packet from={SERVER} to={TABLE} color={SAGE} offset={0.85} />

      <Shield active={blocked} />
      <Attacker onBlock={setBlocked} />

      <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.4}
        target={[0, 0.6, 0]} minPolarAngle={Math.PI / 5} maxPolarAngle={Math.PI / 2.4} />
    </>
  );
}

export default function SecurityScene() {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [11, 8, 12], fov: 38 }}
      gl={{ antialias: true, alpha: false }} onCreated={({ gl }) => gl.setClearColor("#0E0B09", 1)}
      style={{ background: "#0E0B09" }}>
      <Scene />
    </Canvas>
  );
}
