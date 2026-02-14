import React, { useEffect, useRef } from 'react';
import { FlightData, ATCMessage, AircraftConfig } from '../types';
import { ArrowUp, ArrowDown, Gauge, Wind, AlertTriangle, Settings, HelpCircle, RotateCcw, Radio, Plane, Mic, LayoutGrid } from 'lucide-react';

interface ControlsProps {
  flightData: FlightData;
  atcMessages: ATCMessage[];
  config: AircraftConfig;
  onToggleGear: () => void;
  onCycleFlaps: () => void;
  onRestart: () => void;
  onOpenHangar: () => void;
  onATCRequest: (type: 'takeoff' | 'landing' | 'position' | 'emergency') => void;
  onThrottleChange: (index: number, value: number) => void;
  showHelp: boolean;
  setShowHelp: (v: boolean) => void;
}

export const Controls: React.FC<ControlsProps> = ({ 
  flightData, 
  atcMessages,
  config,
  onToggleGear, 
  onCycleFlaps,
  onRestart,
  onOpenHangar,
  onATCRequest,
  onThrottleChange,
  showHelp,
  setShowHelp
}) => {
  const speedKnots = Math.round(flightData.velocity * 100);
  const altFeet = Math.round(flightData.altitude * 10);
  const isStalling = flightData.velocity < 0.5 && flightData.altitude > 2;
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Average throttle for display
  const avgThrottle = flightData.throttles.reduce((a, b) => a + b, 0) / (flightData.throttles.length || 1);

  // Auto-scroll ATC chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [atcMessages]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10 text-white select-none font-mono">
      {/* Top Bar: Telemetry & ATC */}
      <div className="flex justify-between items-start pointer-events-auto">
        {/* Left: Gauges */}
        <div className="bg-black/40 backdrop-blur-md p-4 rounded-lg border border-white/20 shadow-xl">
          <div className="flex items-center gap-4 mb-2">
            <Gauge className="w-5 h-5 text-blue-400" />
            <span className="text-2xl font-bold">{speedKnots} <span className="text-xs text-gray-400">KNOTS</span></span>
          </div>
          <div className="flex items-center gap-4">
            <ArrowUp className="w-5 h-5 text-green-400" />
            <span className="text-2xl font-bold">{altFeet} <span className="text-xs text-gray-400">FT</span></span>
          </div>
          {isStalling && (
            <div className="mt-2 flex items-center gap-2 text-red-500 animate-pulse font-bold">
              <AlertTriangle className="w-4 h-4" /> STALL WARNING
            </div>
          )}
        </div>

        {/* Right: ATC & System Buttons */}
        <div className="flex flex-col items-end gap-2 max-w-sm w-full">
           <div className="flex gap-2">
              <button 
                onClick={onOpenHangar}
                className="p-2 bg-black/40 hover:bg-black/60 rounded-full border border-white/20 transition-colors pointer-events-auto"
                title="Fleet / Hangar"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button 
                onClick={onRestart}
                className="p-2 bg-black/40 hover:bg-black/60 rounded-full border border-white/20 transition-colors pointer-events-auto"
                title="Restart Flight (R)"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setShowHelp(!showHelp)}
                className="p-2 bg-black/40 hover:bg-black/60 rounded-full border border-white/20 transition-colors pointer-events-auto"
                title="Help"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
           </div>

           {/* ATC Panel */}
           <div className="bg-black/80 backdrop-blur-md rounded-lg border border-white/20 w-full flex flex-col overflow-hidden shadow-2xl pointer-events-auto">
              <div className="flex items-center gap-2 p-2 bg-white/5 border-b border-white/10">
                <Radio className="w-4 h-4 text-orange-400" />
                <span className="font-bold text-xs text-orange-400 tracking-wider">ATC COMMS</span>
                <div className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              </div>
              
              {/* Message Log */}
              <div className="h-32 overflow-y-auto p-3 flex flex-col gap-2 text-xs">
                {atcMessages.length === 0 && (
                  <div className="text-gray-500 italic text-center mt-4">No active communications</div>
                )}
                {atcMessages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender === 'Pilot' ? 'items-end' : 'items-start'}`}>
                    <span className={`px-2 py-1 rounded max-w-[90%] ${
                      msg.sender === 'Pilot' 
                        ? 'bg-blue-600/30 text-blue-100 border border-blue-500/30' 
                        : 'bg-gray-700/50 text-orange-100 border border-orange-500/20'
                    }`}>
                      <span className="font-bold mr-1 opacity-70 block text-[10px] mb-0.5">{msg.sender}</span>
                      {msg.text}
                    </span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Action Buttons */}
              <div className="p-2 bg-white/5 border-t border-white/10 grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => onATCRequest('takeoff')}
                    className="flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 py-1.5 px-2 rounded text-[10px] uppercase font-bold transition-colors"
                  >
                    <Plane className="w-3 h-3" /> Req Takeoff
                  </button>
                  <button 
                    onClick={() => onATCRequest('landing')}
                    className="flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 py-1.5 px-2 rounded text-[10px] uppercase font-bold transition-colors"
                  >
                    <ArrowDown className="w-3 h-3" /> Req Landing
                  </button>
                  <button 
                    onClick={() => onATCRequest('position')}
                    className="flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 py-1.5 px-2 rounded text-[10px] uppercase font-bold transition-colors"
                  >
                    <Mic className="w-3 h-3" /> Position
                  </button>
                  <button 
                    onClick={() => onATCRequest('emergency')}
                    className="flex items-center justify-center gap-1 bg-red-900/40 hover:bg-red-900/60 text-red-200 border border-red-800/50 py-1.5 px-2 rounded text-[10px] uppercase font-bold transition-colors"
                  >
                    <AlertTriangle className="w-3 h-3" /> Mayday
                  </button>
              </div>
           </div>
        </div>
      </div>

      {/* Center: Attitude Indicator (Simplified Crosshair) */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
        <div className="w-[200px] h-[1px] bg-white"></div>
        <div className="h-[200px] w-[1px] bg-white absolute"></div>
        <div className="w-4 h-4 border border-white rounded-full absolute"></div>
      </div>

      {/* Bottom Bar: Systems & Inputs */}
      <div className="flex items-end justify-between pointer-events-auto w-full">
        {/* Throttle & Flaps */}
        <div className="bg-black/40 backdrop-blur-md p-4 rounded-lg border border-white/20 flex gap-6 items-end">
          <div className="flex flex-col items-center">
            <div className="text-xs text-gray-400 uppercase mb-2">Engines ({config.engineCount})</div>
            <div className="flex gap-2 h-32">
                {Array.from({ length: config.engineCount }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 h-full relative group">
                        {/* Interactive Vertical Slider */}
                        <div className="relative w-6 h-full bg-gray-800 rounded-full border border-gray-600 overflow-hidden hover:border-white/50 transition-colors">
                            <div 
                                className={`absolute bottom-0 w-full pointer-events-none transition-all duration-75 ${
                                    (flightData.throttles[i] || 0) > 90 ? 'bg-red-500' : 'bg-green-500'
                                }`}
                                style={{ height: `${flightData.throttles[i] || 0}%` }}
                            ></div>
                            <input 
                                type="range" 
                                min="0" max="100" 
                                value={flightData.throttles[i] || 0}
                                onChange={(e) => onThrottleChange(i, Number(e.target.value))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize"
                                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} 
                                title={`Engine ${i+1}`}
                            />
                        </div>
                        <div className="text-[9px] text-gray-500 font-bold group-hover:text-white">{i+1}</div>
                    </div>
                ))}
            </div>
            <div className="font-bold mt-1 text-sm">{Math.round(avgThrottle)}% <span className="text-[10px] text-gray-400">AVG</span></div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${flightData.brake ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-gray-800'}`}></div>
              <span className="text-xs">PARKING BRAKE</span>
            </div>
            
            <button 
              onClick={onToggleGear}
              className={`px-4 py-2 rounded border transition-all flex items-center gap-2 ${flightData.isGearDown ? 'bg-green-600/50 border-green-500' : 'bg-gray-800/50 border-gray-600'}`}
            >
              <Settings className={`w-4 h-4 ${flightData.isGearDown ? '' : 'text-gray-500'}`} />
              GEAR {flightData.isGearDown ? 'DOWN' : 'UP'}
            </button>

            <button 
              onClick={onCycleFlaps}
              className={`px-4 py-2 rounded border transition-all flex items-center gap-2 ${flightData.flapsValue > 0 ? 'bg-blue-600/50 border-blue-500' : 'bg-gray-800/50 border-gray-600'}`}
            >
              <Wind className="w-4 h-4" />
              FLAPS: {flightData.flapsValue}
            </button>
          </div>
        </div>

        {/* Control Surface Visualizer */}
        <div className="bg-black/40 backdrop-blur-md p-4 rounded-lg border border-white/20">
          <div className="text-xs text-gray-400 mb-2 uppercase text-center">Input Axes</div>
          <div className="grid grid-cols-3 gap-2 w-24 mx-auto">
             <div className="col-start-2 flex justify-center">
                <div className={`w-2 h-2 rounded-full ${flightData.pitchInput < -0.1 ? 'bg-white' : 'bg-gray-700'}`}></div>
             </div>
             <div className="col-start-1 flex justify-center">
                <div className={`w-2 h-2 rounded-full ${flightData.rollInput < -0.1 ? 'bg-white' : 'bg-gray-700'}`}></div>
             </div>
             <div className="col-start-2 flex justify-center">
                <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
             </div>
             <div className="col-start-3 flex justify-center">
                <div className={`w-2 h-2 rounded-full ${flightData.rollInput > 0.1 ? 'bg-white' : 'bg-gray-700'}`}></div>
             </div>
             <div className="col-start-2 flex justify-center">
                <div className={`w-2 h-2 rounded-full ${flightData.pitchInput > 0.1 ? 'bg-white' : 'bg-gray-700'}`}></div>
             </div>
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-gray-400">
             <span>RUDDER: {flightData.yawInput.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {showHelp && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm pointer-events-auto">
          <div className="bg-gray-900 p-8 rounded-xl border border-gray-700 max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-6 text-blue-400 flex items-center gap-2">
              <HelpCircle /> Flight Controls
            </h2>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div className="text-gray-400">Pitch Down/Up</div>
              <div className="font-bold text-white">W / S <span className="text-xs font-normal text-gray-500">(or Arrows)</span></div>
              
              <div className="text-gray-400">Roll Left/Right</div>
              <div className="font-bold text-white">A / D <span className="text-xs font-normal text-gray-500">(or Arrows)</span></div>
              
              <div className="text-gray-400">Yaw (Rudder)</div>
              <div className="font-bold text-white">Q / E</div>
              
              <div className="text-gray-400">Master Throttle</div>
              <div className="font-bold text-white">Shift / Space</div>
              
              <div className="text-gray-400">Individual Engines</div>
              <div className="font-bold text-white">Mouse Drag on UI</div>

              <div className="text-gray-400">Landing Gear</div>
              <div className="font-bold text-white">G</div>
              
              <div className="text-gray-400">Flaps</div>
              <div className="font-bold text-white">F</div>

              <div className="text-gray-400">Brakes</div>
              <div className="font-bold text-white">B</div>

              <div className="text-gray-400">Camera View</div>
              <div className="font-bold text-white">C</div>

              <div className="text-gray-400">Restart</div>
              <div className="font-bold text-white">R</div>
            </div>
            <button 
              onClick={() => setShowHelp(false)}
              className="mt-8 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded transition-colors"
            >
              Start Flying
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
