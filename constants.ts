import { AircraftConfig } from "./types";

export const MAX_THRUST = 0.5;
export const GRAVITY = 0.08;
export const LIFT_COEFFICIENT = 0.002;
export const DRAG_COEFFICIENT = 0.0005;
export const ROTATION_SPEED = 0.02;
export const MIN_TAKEOFF_SPEED = 0.8;
export const MAX_SPEED = 4.0;
export const STALL_SPEED = 0.5;

// Visual constants
export const SKY_COLOR = "#87CEEB";
export const GROUND_COLOR = "#3a5f32";
export const FOG_NEAR = 100;
export const FOG_FAR = 1000;

export const AIRCRAFT_FLEET: AircraftConfig[] = [
  {
    id: "skybound-mk1",
    name: "SkyBound Mk1",
    type: "Trainer",
    description: "Reliable, stable, and easy to fly. Perfect for new pilots.",
    color: "#f0f0f0",
    thrustMult: 1.0,
    liftMult: 1.0,
    dragMult: 1.0,
    turnSpeedMult: 1.0,
    maxSpeedMult: 1.0,
    maxAltitude: 5000,
    engineCount: 1
  },
  {
    id: "raptor-x",
    name: "Raptor X",
    type: "Jet",
    description: "High speed interceptor. Extremely agile but requires high speed to maintain lift.",
    color: "#475569",
    thrustMult: 2.5,
    liftMult: 0.8, // Needs more speed for lift
    dragMult: 0.6, // Sleek
    turnSpeedMult: 1.8,
    maxSpeedMult: 2.5,
    maxAltitude: 15000,
    engineCount: 2
  },
  {
    id: "titan-hauler",
    name: "Titan Hauler",
    type: "Cargo",
    description: "Heavy lifter. Slow and steady, generates massive lift but turns like a boat.",
    color: "#3f6212",
    thrustMult: 0.8,
    liftMult: 1.5,
    dragMult: 1.8,
    turnSpeedMult: 0.4,
    maxSpeedMult: 0.7,
    maxAltitude: 8000,
    engineCount: 4
  },
  {
    id: "acro-z",
    name: "Acro Z",
    type: "Stunt",
    description: "Lightweight stunt plane. incredible roll rate and thrust-to-weight ratio.",
    color: "#ea580c",
    thrustMult: 1.4,
    liftMult: 1.1,
    dragMult: 1.1,
    turnSpeedMult: 2.5,
    maxSpeedMult: 1.2,
    maxAltitude: 6000,
    engineCount: 1
  }
];
