import React from 'react';
import { Sky, Stars, Plane as DreiPlane } from '@react-three/drei';

export const World: React.FC = () => {
  return (
    <>
      <Sky sunPosition={[100, 20, 100]} turbidity={0.5} rayleigh={0.5} />
      <Stars radius={200} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[50, 50, 25]} 
        intensity={1} 
        castShadow 
        shadow-mapSize-width={2048} 
        shadow-mapSize-height={2048}
      />
      
      {/* Ground - Infinite Grid look */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[10000, 10000]} />
        <meshStandardMaterial color="#3a5f32" />
      </mesh>
      
      {/* Grid Helper for scale */}
      <gridHelper args={[2000, 200, "#ffffff", "#ffffff"]} position={[0, 0.1, 0]} material-opacity={0.1} material-transparent />
      
      {/* Runway Strip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
         <planeGeometry args={[10, 1000]} />
         <meshStandardMaterial color="#333" />
      </mesh>
      {/* Runway markings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
         <planeGeometry args={[1, 1000]} />
         <meshStandardMaterial color="#fff" opacity={0.5} transparent />
      </mesh>
      
      {/* Some random buildings/cubes for reference */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh key={i} position={[Math.sin(i) * 100 + 50, 10, Math.cos(i) * 200]} castShadow>
          <boxGeometry args={[10, 20, 10]} />
          <meshStandardMaterial color="#666" />
        </mesh>
      ))}
    </>
  );
};
