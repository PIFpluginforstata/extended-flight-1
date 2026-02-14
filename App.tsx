import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Controls } from './components/Controls';
import { Plane } from './components/Plane';
import { World } from './components/World';
import { FlightData, ControlState, ATCMessage, AircraftConfig } from './types';
import { AIRCRAFT_FLEET } from './constants';
import { Plane as PlaneIcon, Gauge, Check } from 'lucide-react';

const App: React.FC = () => {
  const [flightData, setFlightData] = useState<FlightData>({
    position: [0,0,0],
    rotation: [0,0,0],
    velocity: 0,
    altitude: 0,
    throttles: [0, 0, 0, 0],
    fuel: 100,
    isGearDown: true,
    flapsValue: 0,
    brake: true,
    pitchInput: 0,
    rollInput: 0,
    yawInput: 0
  });

  const [controls, setControls] = useState<ControlState>({
    pitch: 0,
    roll: 0,
    yaw: 0,
    throttles: [0, 0, 0, 0],
    brake: true,
    flaps: 0,
    gear: true
  });
  
  const [showHelp, setShowHelp] = useState(false);
  const [showHangar, setShowHangar] = useState(true); // Start in Hangar
  const [cameraMode, setCameraMode] = useState(0); 
  const [resetKey, setResetKey] = useState(0);
  const [atcMessages, setAtcMessages] = useState<ATCMessage[]>([]);
  
  // Fleet State
  const [selectedAircraftIndex, setSelectedAircraftIndex] = useState(0);
  const currentAircraft = AIRCRAFT_FLEET[selectedAircraftIndex];

  const addATCMessage = (text: string, sender: 'ATC' | 'Pilot') => {
    const newMessage: ATCMessage = {
      id: Date.now().toString() + Math.random().toString(),
      sender,
      text,
      timestamp: Date.now()
    };
    setAtcMessages(prev => [...prev.slice(-50), newMessage]);
  };

  const handleATCRequest = (type: 'takeoff' | 'landing' | 'position' | 'emergency') => {
     let pilotMsg = "";
     let atcResponse = "";
     
     switch(type) {
        case 'takeoff':
           pilotMsg = "Tower, SkyBound 1 holding short Runway 01, ready for departure.";
           if (flightData.altitude < 5 && flightData.velocity < 1.0) {
              atcResponse = "SkyBound 1, Tower. Winds calm. Runway 01 cleared for takeoff. Climb and maintain 5000.";
           } else {
              atcResponse = "SkyBound 1, you are already airborne. Maintain current heading.";
           }
           break;
        case 'landing':
           pilotMsg = "Tower, SkyBound 1 inbound for landing.";
           atcResponse = "SkyBound 1, Tower. Make left traffic Runway 01. Wind 230 at 5. Cleared to land.";
           break;
        case 'position':
           pilotMsg = "Tower, SkyBound 1 requesting position check.";
           const alt = Math.round(flightData.altitude * 10);
           atcResponse = `SkyBound 1, Radar contact. Altitude ${alt} feet. transponder squawk 4521.`;
           break;
        case 'emergency':
           pilotMsg = "MAYDAY MAYDAY MAYDAY! SkyBound 1 experiencing engine failure!";
           atcResponse = "SkyBound 1, Tower. Emergency declared. All runways clear. Emergency services dispatched. Squawk 7700.";
           break;
     }

     addATCMessage(pilotMsg, "Pilot");
     setTimeout(() => {
        addATCMessage(atcResponse, "ATC");
     }, 1500);
  };

  const handleRestart = useCallback(() => {
    setResetKey(prev => prev + 1);
    setFlightData({
      position: [0,0,0],
      rotation: [0,0,0],
      velocity: 0,
      altitude: 0,
      throttles: [0, 0, 0, 0],
      fuel: 100,
      isGearDown: true,
      flapsValue: 0,
      brake: true,
      pitchInput: 0,
      rollInput: 0,
      yawInput: 0
    });
    setControls({
      pitch: 0,
      roll: 0,
      yaw: 0,
      throttles: [0, 0, 0, 0],
      brake: true,
      flaps: 0,
      gear: true
    });
    setAtcMessages([]);
    setTimeout(() => {
       addATCMessage(`SkyBound ${selectedAircraftIndex + 1}, Tower. Simulation reset. Ready for ${currentAircraft.name} operations.`, "ATC");
    }, 500);
  }, [currentAircraft.name, selectedAircraftIndex]);

  const selectAircraft = (index: number) => {
    setSelectedAircraftIndex(index);
    // Don't close hangar immediately, let user confirm or just click start
  };

  const startFlight = () => {
    setShowHangar(false);
    handleRestart();
  };

  // Helper to change all throttles (Master Throttle)
  const setAllThrottles = (delta: number) => {
    setControls(c => ({ 
      ...c, 
      throttles: c.throttles.map(t => Math.max(0, Math.min(100, t + delta))) 
    }));
  };

  // Handler for individual engine control
  const handleThrottleChange = (index: number, value: number) => {
    setControls(c => {
       const newThrottles = [...c.throttles];
       if (index < newThrottles.length) {
          newThrottles[index] = Math.max(0, Math.min(100, value));
       }
       return { ...c, throttles: newThrottles };
    });
  };

  // Keyboard Inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent interactions if Hangar is open, except maybe ESC
      if (showHangar) return;

      if(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
         e.preventDefault();
      }

      switch(e.code) {
        case 'KeyR':
          handleRestart();
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          setAllThrottles(2);
          break;
        case 'Space': 
          setAllThrottles(5);
          setControls(c => ({ ...c, brake: false }));
          break;
        case 'KeyZ':
          setAllThrottles(-5);
          break;
        case 'KeyW':
        case 'ArrowUp':
          setControls(c => ({ ...c, pitch: 1 }));
          break;
        case 'KeyS':
        case 'ArrowDown':
          setControls(c => ({ ...c, pitch: -1 }));
          break;
        case 'KeyA':
        case 'ArrowLeft':
          setControls(c => ({ ...c, roll: 1 })); // Roll Left
          break;
        case 'KeyD':
        case 'ArrowRight':
          setControls(c => ({ ...c, roll: -1 })); // Roll Right
          break;
        case 'KeyQ':
          setControls(c => ({ ...c, yaw: 1 }));
          break;
        case 'KeyE':
          setControls(c => ({ ...c, yaw: -1 }));
          break;
        case 'KeyG':
          setControls(c => ({ ...c, gear: !c.gear }));
          break;
        case 'KeyF':
          setControls(c => ({ ...c, flaps: (c.flaps + 1) % 3 }));
          break;
        case 'KeyB':
          setControls(c => ({ ...c, brake: !c.brake }));
          break;
        case 'KeyC':
          setCameraMode(prev => (prev + 1) % 3);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (showHangar) return;
      switch(e.code) {
        case 'KeyW':
        case 'ArrowUp':
        case 'KeyS':
        case 'ArrowDown':
          setControls(c => ({ ...c, pitch: 0 }));
          break;
        case 'KeyA':
        case 'ArrowLeft':
        case 'KeyD':
        case 'ArrowRight':
          setControls(c => ({ ...c, roll: 0 }));
          break;
        case 'KeyQ':
        case 'KeyE':
          setControls(c => ({ ...c, yaw: 0 }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleRestart, showHangar]);

  const handleUpdate = useCallback((data: FlightData) => {
    setFlightData(data);
  }, []);

  return (
    <div className="relative w-full h-full bg-slate-900">
      <Controls 
        flightData={flightData} 
        atcMessages={atcMessages}
        config={currentAircraft}
        onToggleGear={() => setControls(c => ({ ...c, gear: !c.gear }))}
        onCycleFlaps={() => setControls(c => ({ ...c, flaps: (c.flaps + 1) % 3 }))}
        onRestart={handleRestart}
        onOpenHangar={() => setShowHangar(true)}
        onATCRequest={handleATCRequest}
        onThrottleChange={handleThrottleChange}
        showHelp={showHelp}
        setShowHelp={setShowHelp}
      />
      
      <Canvas shadows>
        <World />
        <Plane 
          key={resetKey} 
          config={currentAircraft}
          onUpdate={handleUpdate} 
          controls={controls} 
          cameraMode={cameraMode}
        />
      </Canvas>
      
      {/* Hangar / Fleet Selection Overlay */}
      {showHangar && (
        <div className="absolute inset-0 bg-slate-900/95 z-50 flex items-center justify-center backdrop-blur-md">
            <div className="max-w-5xl w-full p-8">
               <div className="text-center mb-10">
                  <h1 className="text-5xl font-bold text-white mb-2 tracking-tighter">SKYBOUND <span className="text-blue-500">HANGAR</span></h1>
                  <p className="text-gray-400">Select your aircraft to begin flight operations</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {AIRCRAFT_FLEET.map((plane, index) => (
                    <div 
                      key={plane.id}
                      onClick={() => selectAircraft(index)}
                      className={`
                        relative group cursor-pointer p-6 rounded-xl border-2 transition-all duration-300
                        ${selectedAircraftIndex === index 
                          ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)] scale-105' 
                          : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'}
                      `}
                    >
                       {selectedAircraftIndex === index && (
                         <div className="absolute -top-3 -right-3 bg-blue-500 text-white rounded-full p-1 shadow-lg">
                           <Check className="w-4 h-4" />
                         </div>
                       )}
                       
                       <div className="h-32 mb-4 flex items-center justify-center bg-black/20 rounded-lg overflow-hidden">
                          {/* Placeholder for plane preview, using icon for now */}
                          <PlaneIcon size={64} color={plane.color} strokeWidth={1} />
                       </div>
                       
                       <div className="space-y-2">
                         <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">{plane.name}</h3>
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-gray-300">{plane.type}</span>
                         </div>
                         <p className="text-sm text-gray-400 h-10 leading-snug">{plane.description}</p>
                         
                         <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/10 text-xs text-gray-400">
                            <div>Speed: <span className="text-white">{(plane.maxSpeedMult * 100).toFixed(0)}%</span></div>
                            <div>Agility: <span className="text-white">{(plane.turnSpeedMult * 100).toFixed(0)}%</span></div>
                            <div>Thrust: <span className="text-white">{(plane.thrustMult * 100).toFixed(0)}%</span></div>
                            <div>Ceiling: <span className="text-white">{(plane.maxAltitude / 1000).toFixed(0)}k ft</span></div>
                         </div>
                       </div>
                    </div>
                  ))}
               </div>

               <div className="mt-12 text-center">
                 <button 
                   onClick={startFlight}
                   className="bg-blue-600 hover:bg-blue-500 text-white text-xl font-bold py-4 px-12 rounded-full shadow-lg hover:shadow-blue-500/25 transition-all transform hover:scale-105 active:scale-95"
                 >
                    {selectedAircraftIndex !== -1 ? 'TAKEOFF' : 'SELECT AIRCRAFT'}
                 </button>
               </div>
            </div>
        </div>
      )}

      {/* Mobile Controls Overlay */}
      {!showHangar && (
        <div className="md:hidden absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2 pointer-events-none opacity-50">
           <div className="text-center text-white bg-black/20 p-2 rounded">Pitch/Roll: Touch Area</div>
        </div>
      )}
    </div>
  );
};

export default App;
