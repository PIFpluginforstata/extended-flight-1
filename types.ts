export interface FlightData {
  position: [number, number, number];
  rotation: [number, number, number]; // Euler angles
  velocity: number;
  altitude: number;
  throttles: number[]; // Array of 0-100 values
  fuel: number;
  isGearDown: boolean;
  flapsValue: number; // 0, 1, 2
  brake: boolean;
  pitchInput: number;
  rollInput: number;
  yawInput: number;
}

export interface ControlState {
  pitch: number; // -1 to 1
  roll: number;  // -1 to 1
  yaw: number;   // -1 to 1
  throttles: number[]; // Array of 0-100 values
  brake: boolean;
  flaps: number; // 0, 1, 2
  gear: boolean;
}

export interface ATCMessage {
  id: string;
  sender: 'ATC' | 'Pilot';
  text: string;
  timestamp: number;
  type?: 'info' | 'warning' | 'success';
}

export interface AircraftConfig {
  id: string;
  name: string;
  type: 'Trainer' | 'Jet' | 'Cargo' | 'Stunt';
  description: string;
  color: string;
  // Physics Multipliers (Base = 1.0)
  thrustMult: number;
  liftMult: number;
  dragMult: number;
  turnSpeedMult: number;
  maxSpeedMult: number;
  maxAltitude: number;
  engineCount: number;
}
