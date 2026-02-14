import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Quaternion, Group, Euler, MathUtils } from 'three';
import { ControlState, FlightData, AircraftConfig } from '../types';
import { 
  MAX_THRUST, 
  GRAVITY, 
  LIFT_COEFFICIENT, 
  DRAG_COEFFICIENT, 
  ROTATION_SPEED,
  MAX_SPEED,
  MIN_TAKEOFF_SPEED
} from '../constants';

interface PlaneProps {
  config: AircraftConfig;
  onUpdate: (data: FlightData) => void;
  controls: ControlState;
  cameraMode: number;
}

export const Plane: React.FC<PlaneProps> = ({ config, onUpdate, controls, cameraMode }) => {
  const ref = useRef<Group>(null);
  
  // Control surface refs
  const propellerRefs = useRef<Group[]>([]);
  const leftAileronRef = useRef<Group>(null);
  const rightAileronRef = useRef<Group>(null);
  const elevatorRef = useRef<Group>(null);
  const rudderRef = useRef<Group>(null);
  const leftFlapRef = useRef<Group>(null);
  const rightFlapRef = useRef<Group>(null);
  
  const { camera } = useThree();

  // Physics State
  const velocity = useRef(new Vector3(0, 0, 0));
  const speed = useRef(0);
  const position = useRef(new Vector3(0, 0, 0));
  const quaternion = useRef(new Quaternion());
  
  // Internal animation state
  const [gearPos, setGearPos] = useState(1); // 1 = down, 0 = up
  
  useEffect(() => {
    // Initial position on runway
    position.current.set(0, 0.6, 0);
    // Initial rotation (facing -Z)
    quaternion.current.setFromEuler(new Euler(0, 0, 0));
    velocity.current.set(0,0,0);
    
    // Clear refs array on re-mount
    propellerRefs.current = [];
  }, [config.id]); 

  useFrame((state, delta) => {
    if (!ref.current) return;

    // --- 1. Gear Animation ---
    const targetGearPos = controls.gear ? 1 : 0;
    if (Math.abs(gearPos - targetGearPos) > 0.01) {
      setGearPos(prev => MathUtils.lerp(prev, targetGearPos, delta * 3));
    }

    // --- 2. Physics Calculation ---
    const forward = new Vector3(0, 0, -1).applyQuaternion(quaternion.current);
    const up = new Vector3(0, 1, 0).applyQuaternion(quaternion.current);
    const right = new Vector3(1, 0, 0).applyQuaternion(quaternion.current);

    speed.current = velocity.current.length();
    
    // Calculate Thrust & Differential Yaw
    let totalThrustPercent = 0;
    let yawMoment = 0;

    controls.throttles.forEach((val, i) => {
        if (i >= config.engineCount) return;
        totalThrustPercent += val;

        // Differential Thrust Logic (Simplified)
        if (config.engineCount > 1) {
             // Map engine index to left (-1) or right (1) side
             // For 2 engines: 0->-1, 1->1
             // For 4 engines: 0->-1, 1->-0.33, 2->0.33, 3->1
             const side = (i / (config.engineCount - 1)) * 2 - 1; 
             // Uneven thrust creates yaw. Right engine pushes Left (positive Yaw).
             // Therefore Yaw += side * thrust
             yawMoment += side * val;
        }
    });

    const avgThrottle = totalThrustPercent / Math.max(1, config.engineCount);

    let thrustVal = (avgThrottle / 100) * MAX_THRUST * config.thrustMult;
    if (controls.brake && position.current.y < 1.0) {
        thrustVal = 0;
        speed.current *= 0.95; // Ground friction
    }
    const thrustVector = forward.clone().multiplyScalar(thrustVal);

    // Gravity
    const gravityVector = new Vector3(0, -GRAVITY * delta * 60, 0); 

    // Lift
    const maxSpeedForCalc = MAX_SPEED * config.maxSpeedMult;
    const liftFactor = (speed.current / maxSpeedForCalc) * (1 + controls.flaps * 0.3);
    const effectiveLift = Math.max(0, (liftFactor * LIFT_COEFFICIENT * speed.current * 1000 * config.liftMult));
    const liftVector = up.clone().multiplyScalar(effectiveLift * delta);

    // Drag
    const dragVal = (speed.current * speed.current) * DRAG_COEFFICIENT * config.dragMult + (controls.gear ? 0.001 : 0) + (controls.flaps * 0.002);
    const dragVector = velocity.current.clone().normalize().multiplyScalar(-dragVal);

    // Ground Physics
    const isOnGround = position.current.y <= 0.6;
    
    velocity.current.add(thrustVector.multiplyScalar(delta));
    velocity.current.add(gravityVector);
    velocity.current.add(liftVector);
    velocity.current.add(dragVector);

    if (isOnGround) {
        if (velocity.current.y < 0) velocity.current.y = 0;
        position.current.y = 0.6;
        velocity.current.multiplyScalar(0.995);
    }

    // Rotation Control
    const controlAuthority = Math.min(speed.current / MIN_TAKEOFF_SPEED, 1.5) * ROTATION_SPEED * config.turnSpeedMult;
    
    const pitchAmt = controls.pitch * controlAuthority * delta * 60;
    const pitchQuat = new Quaternion().setFromAxisAngle(right, pitchAmt);
    
    const rollAmt = -controls.roll * controlAuthority * 1.5 * delta * 60;
    const rollQuat = new Quaternion().setFromAxisAngle(forward, rollAmt);
    
    // Yaw combines Rudder Input + Differential Thrust
    const diffThrustFactor = 0.0005; // Sensitivity of differential thrust
    const totalYawInput = -controls.yaw + (yawMoment * diffThrustFactor);
    
    const yawAmt = totalYawInput * (isOnGround ? 0.02 : controlAuthority * 0.5) * delta * 60;
    const yawQuat = new Quaternion().setFromAxisAngle(up, yawAmt);

    quaternion.current.multiply(pitchQuat);
    quaternion.current.multiply(yawQuat);
    quaternion.current.multiply(rollQuat);
    
    // Stability (auto-level slightly)
    if (!isOnGround && speed.current > 0.1) {
        const targetVel = forward.clone().multiplyScalar(speed.current);
        velocity.current.lerp(targetVel, delta * 0.5);
    }

    position.current.add(velocity.current.clone().multiplyScalar(delta * 60));

    ref.current.position.copy(position.current);
    ref.current.quaternion.copy(quaternion.current);

    // Control Surface Animations
    propellerRefs.current.forEach((prop, i) => {
        if (prop) {
            const throttle = controls.throttles[i] || 0;
            prop.rotation.z += (throttle / 100) * 1.5 + 0.1;
        }
    });

    if (leftAileronRef.current) leftAileronRef.current.rotation.x = controls.roll * 0.5;
    if (rightAileronRef.current) rightAileronRef.current.rotation.x = -controls.roll * 0.5;
    if (elevatorRef.current) elevatorRef.current.rotation.x = -controls.pitch * 0.5;
    if (rudderRef.current) rudderRef.current.rotation.y = -controls.yaw * 0.5;
    
    // Flaps animation
    const flapAngle = controls.flaps * 0.3; // 0, 0.3, 0.6 rads
    if (leftFlapRef.current) leftFlapRef.current.rotation.x = flapAngle;
    if (rightFlapRef.current) rightFlapRef.current.rotation.x = flapAngle;

    // Camera
    const camOffset = new Vector3(0, 3, 10);
    if (cameraMode === 1) {
       // Cockpit
       camOffset.set(0, 0.8, -0.2);
       if (config.type === "Jet") camOffset.set(0, 0.7, -1.2);
       if (config.type === "Cargo") camOffset.set(0, 2.0, -0.5);
       if (config.type === "Stunt") camOffset.set(0, 0.6, -0.5);
    } else if (cameraMode === 2) {
       // Side view
       camOffset.set(10, 2, 0);
    }
    
    const targetCamPos = position.current.clone().add(camOffset.applyQuaternion(quaternion.current));
    camera.position.lerp(targetCamPos, 0.1);
    camera.lookAt(position.current.clone().add(forward.multiplyScalar(10)));

    onUpdate({
        position: [position.current.x, position.current.y, position.current.z],
        rotation: new Euler().setFromQuaternion(quaternion.current).toArray() as [number, number, number],
        velocity: speed.current,
        altitude: position.current.y,
        throttles: controls.throttles,
        fuel: 100,
        isGearDown: controls.gear,
        flapsValue: controls.flaps,
        brake: controls.brake,
        pitchInput: controls.pitch,
        rollInput: controls.roll,
        yawInput: controls.yaw
    });
  });

  // --- Shared Visual Components ---
  const materials = {
    body: <meshStandardMaterial color={config.color} metalness={0.4} roughness={0.5} />,
    dark: <meshStandardMaterial color="#222" metalness={0.2} roughness={0.8} />,
    glass: <meshStandardMaterial color="#aaddff" transparent opacity={0.6} metalness={0.9} roughness={0.1} />,
    steel: <meshStandardMaterial color="#999" metalness={0.8} roughness={0.2} />,
    tire: <meshStandardMaterial color="#111" roughness={0.9} />,
  };

  const Wheel = ({ position, scale = 1 }: { position: [number, number, number], scale?: number }) => (
    <group position={position} scale={scale}>
       <mesh rotation={[0,0,1.57]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.15, 16]} />
          {materials.tire}
       </mesh>
       <mesh rotation={[0,0,1.57]}>
          <cylinderGeometry args={[0.1, 0.1, 0.16, 16]} />
          {materials.steel}
       </mesh>
    </group>
  );

  // Propeller component now takes a Ref callback or index to attach to the shared array
  const Propeller = ({ index }: { index: number }) => (
    <group ref={(el) => { if(el) propellerRefs.current[index] = el }}>
        <mesh><boxGeometry args={[2.6, 0.15, 0.05]} />{materials.dark}</mesh>
        <mesh rotation={[0, 0, 1.57]}><boxGeometry args={[2.6, 0.15, 0.05]} />{materials.dark}</mesh>
        <mesh position={[0, 0, 0.05]} rotation={[1.57, 0, 0]}><coneGeometry args={[0.15, 0.3, 16]} />{materials.steel}</mesh>
    </group>
  );

  // --- RENDERERS ---

  const renderTrainer = () => (
    <group>
      {/* Fuselage */}
      <mesh position={[0, 0.2, 0.5]} scale={[1, 1.2, 1]}>
         <boxGeometry args={[0.7, 0.7, 3.5]} />
         {materials.body}
      </mesh>
      {/* Nose Cowling */}
      <mesh position={[0, 0.2, -1.5]} rotation={[Math.PI/2, 0, 0]}>
         <cylinderGeometry args={[0.35, 0.45, 0.6, 16]} />
         <meshStandardMaterial color="#ddd" />
      </mesh>
      {/* Cabin/Cockpit */}
      <mesh position={[0, 0.8, 0]}>
         <boxGeometry args={[0.65, 0.6, 1.2]} />
         {materials.glass}
      </mesh>
      <mesh position={[0, 1.11, 0]}>
         <boxGeometry args={[0.7, 0.05, 1.2]} />
         {materials.body}
      </mesh>
      {/* Wings - High Wing */}
      <group position={[0, 1.0, 0.2]}>
         <mesh castShadow>
             <boxGeometry args={[7, 0.15, 1.2]} />
             {materials.body}
         </mesh>
         {/* Struts */}
         <mesh position={[1.5, -0.6, 0]} rotation={[0, 0, -0.5]}>
             <cylinderGeometry args={[0.03, 0.03, 1.5]} />
             {materials.steel}
         </mesh>
         <mesh position={[-1.5, -0.6, 0]} rotation={[0, 0, 0.5]}>
             <cylinderGeometry args={[0.03, 0.03, 1.5]} />
             {materials.steel}
         </mesh>
         {/* Ailerons */}
         <group position={[2.5, 0, 0.6]} ref={leftAileronRef}>
             <mesh position={[0, 0, 0.15]}><boxGeometry args={[1.8, 0.05, 0.3]} />{materials.body}</mesh>
         </group>
         <group position={[-2.5, 0, 0.6]} ref={rightAileronRef}>
             <mesh position={[0, 0, 0.15]}><boxGeometry args={[1.8, 0.05, 0.3]} />{materials.body}</mesh>
         </group>
         {/* Flaps */}
         <group position={[0.8, 0, 0.6]} ref={leftFlapRef}>
             <mesh position={[0, 0, 0.15]}><boxGeometry args={[1.4, 0.05, 0.3]} />{materials.steel}</mesh>
         </group>
         <group position={[-0.8, 0, 0.6]} ref={rightFlapRef}>
             <mesh position={[0, 0, 0.15]}><boxGeometry args={[1.4, 0.05, 0.3]} />{materials.steel}</mesh>
         </group>
      </group>
      {/* Tail */}
      <group position={[0, 0.5, 2.0]}>
         <mesh position={[0, 0, 0]}><boxGeometry args={[2.5, 0.1, 0.8]} />{materials.body}</mesh>
         <mesh position={[0, 0.5, 0]}><boxGeometry args={[0.1, 1.0, 0.8]} />{materials.body}</mesh>
         {/* Moving Parts */}
         <group position={[0, 0, 0.4]} ref={elevatorRef}>
             <mesh position={[0, 0, 0.15]}><boxGeometry args={[2.5, 0.05, 0.3]} />{materials.steel}</mesh>
         </group>
         <group position={[0, 0.5, 0.4]} ref={rudderRef}>
             <mesh position={[0, 0, 0.15]}><boxGeometry args={[0.1, 1.0, 0.3]} />{materials.steel}</mesh>
         </group>
      </group>
      {/* Propeller */}
      <group position={[0, 0.2, -1.8]}>
        <Propeller index={0} />
      </group>
      {/* Gear */}
      <group position={[0, -0.6, 0.5]} visible={gearPos > 0.1}>
          {/* Nose */}
          <group position={[0, 0.2 * (1-gearPos), -2]} scale={gearPos}>
             <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.05, 0.05, 0.6]} />{materials.steel}</mesh>
             <Wheel position={[0, 0, 0]} />
          </group>
          {/* Main */}
          <group position={[0.8, 0.2 * (1-gearPos), 0]} scale={gearPos}>
             <mesh position={[0, 0.3, 0]} rotation={[0,0,-0.3]}><cylinderGeometry args={[0.05, 0.05, 0.6]} />{materials.steel}</mesh>
             <Wheel position={[0.1, 0, 0]} />
          </group>
          <group position={[-0.8, 0.2 * (1-gearPos), 0]} scale={gearPos}>
             <mesh position={[0, 0.3, 0]} rotation={[0,0,0.3]}><cylinderGeometry args={[0.05, 0.05, 0.6]} />{materials.steel}</mesh>
             <Wheel position={[-0.1, 0, 0]} />
          </group>
      </group>
    </group>
  );

  const renderJet = () => (
     <group>
        {/* Fuselage Body */}
        <mesh position={[0, 0, 0]}>
           <boxGeometry args={[1, 0.6, 4.5]} />
           {materials.body}
        </mesh>
        {/* Nose */}
        <mesh position={[0, 0, -3]} rotation={[1.57, 0, 0]}>
           <coneGeometry args={[0.4, 2, 4]} />
           {materials.dark}
        </mesh>
        {/* Cockpit Canopy */}
        <mesh position={[0, 0.4, -1.5]}>
           <capsuleGeometry args={[0.35, 1.2, 4, 16]} />
           <mesh position={[0, 0.1, 0]} rotation={[0.7, 0, 0]} scale={[1,1,1.2]}>{materials.glass}</mesh>
        </mesh>
        {/* Intakes */}
        <mesh position={[0.7, 0, -0.5]}>
            <boxGeometry args={[0.5, 0.6, 1.5]} />
            {materials.body}
        </mesh>
        <mesh position={[-0.7, 0, -0.5]}>
            <boxGeometry args={[0.5, 0.6, 1.5]} />
            {materials.body}
        </mesh>
        {/* Wings - Swept Delta */}
        <group position={[0, 0, 0.5]}>
           <mesh position={[2.0, -0.1, 0.5]} rotation={[-1.57, 0, -0.4]}>
               <boxGeometry args={[2.5, 2.5, 0.1]} /> {/* Approximated delta with box */}
               {materials.body}
           </mesh>
           <mesh position={[-2.0, -0.1, 0.5]} rotation={[-1.57, 0, 0.4]}>
               <boxGeometry args={[2.5, 2.5, 0.1]} />
               {materials.body}
           </mesh>
           {/* Missiles on tips */}
           <mesh position={[3.2, -0.1, 0.5]}><cylinderGeometry args={[0.05, 0.05, 2]} rotation={[1.57,0,0]} />{materials.steel}</mesh>
           <mesh position={[-3.2, -0.1, 0.5]}><cylinderGeometry args={[0.05, 0.05, 2]} rotation={[1.57,0,0]} />{materials.steel}</mesh>
           
           {/* Ailerons */}
           <group position={[2.5, 0, 1.8]} ref={leftAileronRef}>
             <mesh position={[0, 0, 0.15]} rotation={[0, -0.4, 0]}><boxGeometry args={[1.5, 0.05, 0.3]} />{materials.dark}</mesh>
           </group>
           <group position={[-2.5, 0, 1.8]} ref={rightAileronRef}>
             <mesh position={[0, 0, 0.15]} rotation={[0, 0.4, 0]}><boxGeometry args={[1.5, 0.05, 0.3]} />{materials.dark}</mesh>
           </group>
        </group>
        {/* Tail - Twin Verticals */}
        <group position={[0, 0.3, 2.0]}>
            <mesh position={[0.5, 0.6, 0]} rotation={[0, 0, 0.2]}>
                <boxGeometry args={[0.1, 1.2, 1.0]} />
                {materials.body}
            </mesh>
            <mesh position={[-0.5, 0.6, 0]} rotation={[0, 0, -0.2]}>
                <boxGeometry args={[0.1, 1.2, 1.0]} />
                {materials.body}
            </mesh>
            {/* Elevators */}
            <group position={[0, 0, 0.5]} ref={elevatorRef}>
               <mesh position={[0.8, 0, 0]}><boxGeometry args={[1, 0.05, 0.6]} />{materials.dark}</mesh>
               <mesh position={[-0.8, 0, 0]}><boxGeometry args={[1, 0.05, 0.6]} />{materials.dark}</mesh>
            </group>
        </group>
        {/* Engine Glow */}
        <mesh position={[0.4, 0, 2.2]} rotation={[1.57, 0, 0]}>
             <cylinderGeometry args={[0.2, 0.25, 0.2]} />
             <meshBasicMaterial color={(controls.throttles[1] || 0) > 80 ? "#fbbf24" : "#444"} />
        </mesh>
        <mesh position={[-0.4, 0, 2.2]} rotation={[1.57, 0, 0]}>
             <cylinderGeometry args={[0.2, 0.25, 0.2]} />
             <meshBasicMaterial color={(controls.throttles[0] || 0) > 80 ? "#fbbf24" : "#444"} />
        </mesh>

        {/* Jet Gear */}
        <group position={[0, -0.5, 0]} visible={gearPos > 0.1}>
            <group position={[0, 0.2 * (1-gearPos), -2.5]} scale={gearPos}>
                 <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.05, 0.05, 0.4]} />{materials.steel}</mesh>
                 <Wheel position={[0, 0, 0]} scale={0.8} />
            </group>
            <group position={[0.8, 0.2 * (1-gearPos), 0.5]} scale={gearPos}>
                 <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.05, 0.05, 0.5]} />{materials.steel}</mesh>
                 <Wheel position={[0, 0, 0]} />
            </group>
            <group position={[-0.8, 0.2 * (1-gearPos), 0.5]} scale={gearPos}>
                 <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.05, 0.05, 0.5]} />{materials.steel}</mesh>
                 <Wheel position={[0, 0, 0]} />
            </group>
        </group>
     </group>
  );

  const renderCargo = () => (
      <group>
        {/* Wide Fuselage */}
        <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[1.8, 1.8, 6]} />
            {materials.body}
        </mesh>
        <mesh position={[0, 0.4, -3.2]} rotation={[1.57, 0, 0]}>
             <cylinderGeometry args={[0.8, 1.2, 1, 16]} /> {/* Nose */}
             {materials.body}
        </mesh>
        {/* Cockpit Windows */}
        <mesh position={[0, 1.0, -2.8]}>
             <boxGeometry args={[1.6, 0.6, 0.8]} />
             {materials.glass}
        </mesh>
        {/* High Wings */}
        <group position={[0, 1.3, -0.5]}>
             <mesh>
                 <boxGeometry args={[10, 0.3, 2]} />
                 {materials.body}
             </mesh>
             {/* 4 Engines */}
             {[-3, -1.5, 1.5, 3].map((x, i) => (
                 <group key={i} position={[x, -0.4, 0.5]}>
                     <mesh rotation={[1.57, 0, 0]}><cylinderGeometry args={[0.3, 0.3, 1.5]} />{materials.dark}</mesh>
                     <group position={[0, 0, -0.8]}>
                         <Propeller index={i} />
                     </group>
                 </group>
             ))}
             {/* Ailerons */}
             <group position={[4, 0, 1]} ref={leftAileronRef}>
                 <mesh position={[0, 0, 0.2]}><boxGeometry args={[2, 0.05, 0.4]} />{materials.steel}</mesh>
             </group>
             <group position={[-4, 0, 1]} ref={rightAileronRef}>
                 <mesh position={[0, 0, 0.2]}><boxGeometry args={[2, 0.05, 0.4]} />{materials.steel}</mesh>
             </group>
        </group>
        {/* T-Tail */}
        <group position={[0, 1.5, 2.8]}>
             <mesh position={[0, 0.5, 0]}><boxGeometry args={[0.3, 2, 1.5]} />{materials.body}</mesh>
             <mesh position={[0, 1.5, 0]}><boxGeometry args={[4, 0.2, 1.2]} />{materials.body}</mesh>
             <group position={[0, 0.5, 0.7]} ref={rudderRef}>
                 <mesh position={[0, 0, 0.1]}><boxGeometry args={[0.2, 1.8, 0.4]} />{materials.steel}</mesh>
             </group>
             <group position={[0, 1.5, 0.6]} ref={elevatorRef}>
                 <mesh position={[0, 0, 0.1]}><boxGeometry args={[4, 0.05, 0.4]} />{materials.steel}</mesh>
             </group>
        </group>
        {/* Cargo Gear (Multi-wheel pods) */}
        <group position={[0, -0.6, 0.5]} visible={gearPos > 0.1}>
            <group position={[0, 0.2 * (1-gearPos), -2.8]} scale={gearPos}>
                 <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.1, 0.1, 0.6]} />{materials.steel}</mesh>
                 <Wheel position={[0, 0, 0]} />
            </group>
            {/* Side pods */}
            <mesh position={[1, 0, 0.5]} scale={[1, gearPos, 1]}><boxGeometry args={[0.6, 1, 2]} />{materials.body}</mesh>
            <mesh position={[-1, 0, 0.5]} scale={[1, gearPos, 1]}><boxGeometry args={[0.6, 1, 2]} />{materials.body}</mesh>
            
            <group position={[1.2, -0.5 * gearPos, 0]} scale={gearPos}>
                <Wheel position={[0, 0, 0]} />
                <Wheel position={[0, 0, 0.8]} />
            </group>
            <group position={[-1.2, -0.5 * gearPos, 0]} scale={gearPos}>
                <Wheel position={[0, 0, 0]} />
                <Wheel position={[0, 0, 0.8]} />
            </group>
        </group>
      </group>
  );

  const renderStunt = () => (
     <group>
        {/* Sleek Fuselage */}
        <mesh position={[0, 0, 0]}>
           <boxGeometry args={[0.6, 0.6, 3]} />
           {materials.body}
        </mesh>
        <mesh position={[0, 0, -1.8]} rotation={[1.57, 0, 0]}>
           <cylinderGeometry args={[0.1, 0.3, 0.8, 16]} />
           {materials.body}
        </mesh>
        {/* Bubble Canopy */}
        <mesh position={[0, 0.3, -0.5]}>
           <sphereGeometry args={[0.35, 32, 16]} scale={[1, 0.8, 1.5]} />
           {materials.glass}
        </mesh>
        {/* Mid Wings - Symmetrical */}
        <group position={[0, 0, -0.5]}>
           <mesh>
               <boxGeometry args={[5, 0.1, 1.2]} />
               {materials.body}
           </mesh>
           <group position={[2, 0, 0.6]} ref={leftAileronRef}>
              <mesh position={[0, 0, 0.15]}><boxGeometry args={[1.5, 0.05, 0.3]} />{materials.dark}</mesh>
           </group>
           <group position={[-2, 0, 0.6]} ref={rightAileronRef}>
              <mesh position={[0, 0, 0.15]}><boxGeometry args={[1.5, 0.05, 0.3]} />{materials.dark}</mesh>
           </group>
        </group>
        {/* Tail */}
        <group position={[0, 0, 1.4]}>
            <mesh position={[0, 0.4, 0]}><boxGeometry args={[0.1, 0.8, 0.8]} />{materials.body}</mesh>
            <mesh position={[0, 0, 0]}><boxGeometry args={[1.8, 0.1, 0.6]} />{materials.body}</mesh>
            
            <group position={[0, 0, 0.3]} ref={elevatorRef}>
               <mesh position={[0, 0, 0.15]}><boxGeometry args={[1.8, 0.05, 0.3]} />{materials.dark}</mesh>
            </group>
            <group position={[0, 0.4, 0.4]} ref={rudderRef}>
               <mesh position={[0, 0, 0.15]}><boxGeometry args={[0.1, 0.8, 0.3]} />{materials.dark}</mesh>
            </group>
        </group>
        {/* Prop */}
        <group position={[0, 0, -2.2]}>
            <Propeller index={0} />
        </group>
        {/* Taildragger Gear */}
        <group position={[0, -0.4, 0]} visible={gearPos > 0.1}>
            <group position={[0.6, 0.1 * (1-gearPos), -1]} scale={gearPos}>
                 <mesh position={[0, 0.2, 0]} rotation={[0, 0, -0.3]}><cylinderGeometry args={[0.03, 0.03, 0.5]} />{materials.steel}</mesh>
                 <Wheel position={[0.1, 0, 0]} scale={0.8} />
            </group>
            <group position={[-0.6, 0.1 * (1-gearPos), -1]} scale={gearPos}>
                 <mesh position={[0, 0.2, 0]} rotation={[0, 0, 0.3]}><cylinderGeometry args={[0.03, 0.03, 0.5]} />{materials.steel}</mesh>
                 <Wheel position={[-0.1, 0, 0]} scale={0.8} />
            </group>
            <group position={[0, 0.1 * (1-gearPos), 1.5]} scale={gearPos}>
                 <Wheel position={[0, 0, 0]} scale={0.4} />
            </group>
        </group>
     </group>
  );

  return (
    <group ref={ref}>
      {config.type === 'Trainer' && renderTrainer()}
      {config.type === 'Jet' && renderJet()}
      {config.type === 'Cargo' && renderCargo()}
      {config.type === 'Stunt' && renderStunt()}
    </group>
  );
};
