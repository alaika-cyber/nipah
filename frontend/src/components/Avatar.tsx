import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls } from '@react-three/drei';
import type { Group, Mesh } from 'three';

interface AvatarProps {
  isSpeaking: boolean;
  isThinking: boolean;
  mouthOpen: number;
}

function DoctorFace({ isSpeaking, isThinking, mouthOpen }: AvatarProps) {
  const headRef = useRef<Group>(null);
  const mouthRef = useRef<Mesh>(null);
  const leftEyeRef = useRef<Mesh>(null);
  const rightEyeRef = useRef<Mesh>(null);

  const blinkPhase = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.5) * 0.12;
      headRef.current.rotation.x = isThinking ? -0.08 : Math.sin(t * 0.8) * 0.03;
      headRef.current.position.y = Math.sin(t * 1.3) * 0.03;
    }

    if (mouthRef.current) {
      const targetOpen = isSpeaking ? 0.12 + mouthOpen * 0.45 : 0.06;
      mouthRef.current.scale.y += (targetOpen - mouthRef.current.scale.y) * Math.min(1, delta * 12);
    }

    const blink = Math.max(0.15, Math.abs(Math.sin(t * 1.4 + blinkPhase)));
    const eyeScale = isSpeaking ? blink * 0.85 : blink;

    if (leftEyeRef.current && rightEyeRef.current) {
      leftEyeRef.current.scale.y = eyeScale;
      rightEyeRef.current.scale.y = eyeScale;
    }
  });

  return (
    <group ref={headRef} position={[0, 0.1, 0]}>
      {/* Torso / coat */}
      <mesh position={[0, -1.0, 0]}>
        <capsuleGeometry args={[0.55, 0.85, 8, 16]} />
        <meshStandardMaterial color="#f3f6fa" roughness={0.45} metalness={0.05} />
      </mesh>

      {/* Coat lapels */}
      <mesh position={[-0.16, -0.72, 0.43]} rotation={[0.2, 0.2, 0.1]}>
        <boxGeometry args={[0.18, 0.36, 0.03]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
      <mesh position={[0.16, -0.72, 0.43]} rotation={[0.2, -0.2, -0.1]}>
        <boxGeometry args={[0.18, 0.36, 0.03]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>

      {/* Shirt */}
      <mesh position={[0, -0.8, 0.45]}>
        <boxGeometry args={[0.35, 0.25, 0.05]} />
        <meshStandardMaterial color="#7dd3fc" />
      </mesh>

      {/* Medical tie */}
      <mesh position={[0, -0.86, 0.49]}>
        <coneGeometry args={[0.06, 0.2, 12]} />
        <meshStandardMaterial color="#1d4ed8" />
      </mesh>

      {/* ID badge */}
      <mesh position={[0.31, -0.86, 0.47]} rotation={[0.1, -0.08, 0.04]}>
        <boxGeometry args={[0.15, 0.2, 0.02]} />
        <meshStandardMaterial color="#dbeafe" />
      </mesh>
      <mesh position={[0.31, -0.82, 0.485]}>
        <boxGeometry args={[0.09, 0.025, 0.01]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* Neck */}
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.14, 0.16, 0.22, 20]} />
        <meshStandardMaterial color="#e7b89c" />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial color="#f2c6a9" roughness={0.65} />
      </mesh>

      {/* Hair */}
      <mesh position={[0, 0.47, -0.05]}>
        <sphereGeometry args={[0.5, 30, 30, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshStandardMaterial color="#1f2937" roughness={0.8} />
      </mesh>

      {/* Ears */}
      <mesh position={[-0.54, 0.2, 0.0]}>
        <sphereGeometry args={[0.08, 14, 14]} />
        <meshStandardMaterial color="#efbfa2" />
      </mesh>
      <mesh position={[0.54, 0.2, 0.0]}>
        <sphereGeometry args={[0.08, 14, 14]} />
        <meshStandardMaterial color="#efbfa2" />
      </mesh>

      {/* Eyes */}
      <mesh ref={leftEyeRef} position={[-0.18, 0.28, 0.47]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.18, 0.28, 0.47]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#111827" />
      </mesh>

      {/* Glasses */}
      <mesh position={[-0.18, 0.28, 0.5]}>
        <torusGeometry args={[0.09, 0.01, 12, 40]} />
        <meshStandardMaterial color="#111827" metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0.18, 0.28, 0.5]}>
        <torusGeometry args={[0.09, 0.01, 12, 40]} />
        <meshStandardMaterial color="#111827" metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.28, 0.5]}>
        <boxGeometry args={[0.08, 0.01, 0.01]} />
        <meshStandardMaterial color="#111827" />
      </mesh>

      {/* Nose */}
      <mesh position={[0, 0.12, 0.52]}>
        <coneGeometry args={[0.055, 0.16, 14]} />
        <meshStandardMaterial color="#e3af92" />
      </mesh>

      {/* Mouth */}
      <mesh ref={mouthRef} position={[0, -0.03, 0.5]} scale={[1, 0.1, 1]}>
        <sphereGeometry args={[0.12, 20, 20]} />
        <meshStandardMaterial color={isSpeaking ? '#f43f5e' : '#be123c'} roughness={0.3} />
      </mesh>

      {/* Stethoscope */}
      <mesh position={[-0.28, -0.63, 0.23]} rotation={[0, 0, 0.25]}>
        <torusGeometry args={[0.2, 0.016, 12, 50]} />
        <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0.28, -0.63, 0.23]} rotation={[0, 0, -0.25]}>
        <torusGeometry args={[0.2, 0.016, 12, 50]} />
        <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.98, 0.42]}>
        <cylinderGeometry args={[0.055, 0.055, 0.035, 24]} />
        <meshStandardMaterial color="#111827" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.98, 0.445]}>
        <cylinderGeometry args={[0.032, 0.032, 0.02, 24]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.85} roughness={0.25} />
      </mesh>
    </group>
  );
}

export default function Avatar({ isSpeaking, isThinking, mouthOpen }: AvatarProps) {
  return (
    <div className="flex flex-col items-center w-full">
      <div
        className={`w-full max-w-sm h-80 rounded-full border-2 border-indigo-500/30 bg-gray-950 shadow-[0_0_50px_rgba(99,102,241,0.2)] overflow-hidden relative ${
          isThinking ? 'after:content-[""] after:absolute after:inset-0 after:bg-indigo-500/10 after:animate-pulse' : ''
        }`}
      >
        <Canvas camera={{ position: [0, 0.3, 3.1], fov: 35 }}>
          <color attach="background" args={["#030712"]} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 3, 2]} intensity={1.25} />
          <directionalLight position={[-2, 2, -2]} intensity={0.45} color="#60a5fa" />

          <Float speed={isSpeaking ? 1.8 : 1} rotationIntensity={0.08} floatIntensity={0.2}>
            <DoctorFace isSpeaking={isSpeaking} isThinking={isThinking} mouthOpen={mouthOpen} />
          </Float>

          <OrbitControls 
            enablePan={false} 
            enableZoom={false} 
            maxPolarAngle={2.1} 
            minPolarAngle={1.1}
          />
        </Canvas>
      </div>

      {/* Voice Visualizer */}
      <div className="flex items-end gap-1 mt-4 h-8">
        {[...Array(9)].map((_, i) => (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-150 ${
              isSpeaking ? 'bg-indigo-400' : 'bg-gray-700'
            }`}
            style={{
              height: isSpeaking 
                ? `${20 + Math.random() * 60 * mouthOpen}%` 
                : '4px',
              opacity: isSpeaking ? 0.8 : 0.4
            }}
          />
        ))}
      </div>

      <p className="mt-3 text-sm font-medium tracking-wide">
        <span className={isSpeaking ? 'text-indigo-400' : isThinking ? 'text-amber-400' : 'text-gray-400'}>
          {isSpeaking ? 'Dr. NiVa is speaking...' : isThinking ? 'Dr. NiVa is thinking...' : 'Dr. NiVa — AI Consultant'}
        </span>
      </p>
    </div>
  );
}
