import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls, useTexture, MeshDistortMaterial, Shadow } from '@react-three/drei';
import * as THREE from 'three';

interface AvatarProps {
  isSpeaking: boolean;
  isThinking: boolean;
  mouthOpen: number;
}

function RealisticPortrait({ isSpeaking, isThinking, mouthOpen }: AvatarProps) {
  const texture = useTexture('/dr_niva.png');
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (meshRef.current) {
      // Gentle breathing effect
      const breathe = Math.sin(t * 1.5) * 0.02;
      meshRef.current.position.y = breathe;

      // Pulse during speaking
      if (isSpeaking) {
        const pulse = 1 + mouthOpen * 0.05;
        meshRef.current.scale.set(pulse, pulse, 1);
      } else {
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }

      // Thinking state - slight tilt and opacity drop handled by material
    }

    if (glowRef.current) {
      const glowScale = isSpeaking ? 1.1 + Math.sin(t * 10) * 0.05 : 1.05 + Math.sin(t * 2) * 0.02;
      glowRef.current.scale.set(glowScale, glowScale, 1);
      if (glowRef.current.material instanceof THREE.MeshBasicMaterial) {
        glowRef.current.material.opacity = isSpeaking ? 0.4 + mouthOpen * 0.4 : 0.2;
      }
    }
  });

  return (
    <group>
      {/* Background Glow */}
      <mesh ref={glowRef} position={[0, 0, -0.1]}>
        <planeGeometry args={[1.6, 1.6]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.2} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Portrait Card */}
      <mesh ref={meshRef}>
        <planeGeometry args={[1.5, 1.5]} />
        <MeshDistortMaterial
          map={texture}
          transparent
          opacity={isThinking ? 0.7 : 1}
          distort={isThinking ? 0.2 : 0}
          speed={2}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      {/* Subtle Shadow */}
      <Shadow
        opacity={0.3}
        scale={[1.5, 1.5, 1]}
        position={[0, -0.8, 0]}
        color="#000000"
      />
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
        <Canvas camera={{ position: [0, 0, 2.5], fov: 40 }}>
          <ambientLight intensity={0.8} />
          <pointLight position={[10, 10, 10]} intensity={1.5} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color="#6366f1" />

          <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
            <RealisticPortrait isSpeaking={isSpeaking} isThinking={isThinking} mouthOpen={mouthOpen} />
          </Float>

          <OrbitControls 
            enablePan={false} 
            enableZoom={false} 
            maxPolarAngle={Math.PI / 1.5} 
            minPolarAngle={Math.PI / 2.5}
            maxAzimuthAngle={Math.PI / 6}
            minAzimuthAngle={-Math.PI / 6}
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
