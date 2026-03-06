import React, { useState } from 'react';
import type { UserProfile } from '../../types';
import { OnboardingStatus, UserRole } from '../../types';
import { User, Camera, Car, Briefcase, ChevronRight, X, Loader2, CheckCircle2, Type } from 'lucide-react';

interface Props {
  onComplete: (user: Partial<UserProfile>) => void;
}

const OnboardingFlow: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<string | null>(null);
  const [details, setDetails] = useState({ name: '', age: '', gender: '' });
  const [vehicle, setVehicle] = useState<{ type: 'MINIBUS' | 'SEDAN' | 'OTHER'; brand: string; color: string; plate: string }>({ type: 'MINIBUS', brand: '', color: '', plate: '' });
  const [selfie, setSelfie] = useState<string | null>(null);
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [sidePhoto, setSidePhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    if (step === 2 && (!details.name || !details.age || !details.gender)) return;
    setStep(step + 1);
  };

  const selectRole = (r: string) => {
    setRole(r);
    setStep(2);
  };

  const simulateVehicleScan = () => {
    if (!vehicle.brand || !vehicle.color || !frontPhoto || !sidePhoto) {
      setError("Please complete taxi brand, color and both photos!");
      return;
    }
    setIsProcessing(true);
    setError(null);
    setTimeout(() => {
      if (vehicle.type === 'SEDAN') {
        setError("BHUBEZI DENIED: Only official Minibus Taxis allowed.");
        setIsProcessing(false);
      } else {
        setIsProcessing(false);
        setStep(6);
      }
    }, 2500);
  };

  const finish = () => {
    const status = role === UserRole.MARSHAL ? OnboardingStatus.PENDING_VERIFICATION : OnboardingStatus.APPROVED;
    onComplete({
      name: details.name,
      age: parseInt(details.age),
      gender: details.gender,
      role: role as typeof UserRole[keyof typeof UserRole],
      onboardingStatus: status,
      vehicle: role === UserRole.DRIVER ? {
        ...vehicle,
        frontPhoto: frontPhoto || undefined,
        sidePhoto: sidePhoto || undefined
      } : undefined,
      selfie: selfie || undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-yellow-400 z-[100] flex flex-col p-6 font-sans overflow-y-auto">
      <div className="flex-1 max-w-sm mx-auto w-full flex flex-col justify-center py-10 gap-8">
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5, 6].map(s => (
            <div 
              key={s} 
              className={`w-2 h-2 rounded-full transition-all ${step >= s ? 'bg-black w-4' : 'bg-black/20'}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="text-center">
              <h1 className="text-5xl font-black italic uppercase tracking-tighter text-black mb-2">BHUBEZI</h1>
              <p className="text-sm font-black text-black/60 uppercase tracking-widest">Jozi's #1 Taxi Network</p>
            </div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-black text-center">Sho!<br/>WHO ARE YOU?</h2>
            <div className="grid gap-3">
              {[
                { role: UserRole.PASSENGER, icon: User, label: 'PASSENGER', desc: 'Find rides & track routes' },
                { role: UserRole.DRIVER, icon: Car, label: 'DRIVER', desc: 'Manage trips & fill seats' },
                { role: UserRole.MARSHAL, icon: Briefcase, label: 'MARSHAL', desc: 'Regulate the rank flow' }
              ].map(item => (
                <button
                  key={item.role}
                  onClick={() => selectRole(item.role)}
                  className="p-6 rounded-[2rem] border-4 border-black transition-all flex items-center gap-4 text-left bg-white text-black hover:bg-black hover:text-yellow-400 active:scale-95 shadow-[8px_8px_0_0_rgba(0,0,0,1)] group"
                >
                  <item.icon size={32} />
                  <div>
                    <p className="font-black text-xl italic uppercase tracking-tighter">{item.label}</p>
                    <p className="text-[10px] font-bold uppercase opacity-60">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-black text-center leading-none">
              WOZA NABANGANE BAKHO
            </h1>
            <div className="space-y-4">
              <input
                type="text" placeholder="FULL NAME"
                value={details.name} onChange={e => setDetails({ ...details, name: e.target.value })}
                className="w-full p-5 bg-white border-4 border-black rounded-2xl font-black text-sm uppercase outline-none shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number" placeholder="AGE"
                  value={details.age} onChange={e => setDetails({ ...details, age: e.target.value })}
                  className="w-full p-5 bg-white border-4 border-black rounded-2xl font-black text-sm uppercase outline-none shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                />
                <select
                  value={details.gender} onChange={e => setDetails({ ...details, gender: e.target.value })}
                  className="w-full p-5 bg-white border-4 border-black rounded-2xl font-black text-sm uppercase outline-none appearance-none shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                >
                  <option value="">GENDER</option>
                  <option value="MALE">MALE</option>
                  <option value="FEMALE">FEMALE</option>
                </select>
              </div>
            </div>
            <button onClick={handleNext} className="w-full bg-black text-white py-5 rounded-[2rem] font-black uppercase italic tracking-tighter flex items-center justify-center gap-2 border-2 border-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-1">
              NEXT <ChevronRight size={20} />
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 text-center">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-black">
              Sho Skhokho
            </h1>
            <div className="aspect-square bg-white rounded-[3rem] border-4 border-black flex flex-col items-center justify-center relative overflow-hidden shadow-[8px_8px_0_0_rgba(0,0,0,1)] mx-auto w-full">
              {selfie ? (
                <div className="relative w-full h-full">
                  <img src={selfie} className="w-full h-full object-cover grayscale" alt="Selfie" />
                  <button onClick={() => setSelfie(null)} className="absolute top-4 right-4 bg-black text-white p-2 rounded-full border-2 border-white"><X size={16}/></button>
                </div>
              ) : (
                <>
                  <Camera size={64} className="text-black/10 mb-4" />
                  <button onClick={() => setSelfie("https://api.dicebear.com/7.x/avataaars/svg?seed=" + details.name)} className="bg-black text-white px-6 py-3 rounded-xl font-black text-xs uppercase italic border-2 border-white">TAKE PHOTO</button>
                </>
              )}
            </div>
            <button
              onClick={role === UserRole.DRIVER ? handleNext : finish}
              disabled={!selfie}
              className="w-full bg-black text-white py-5 rounded-[2rem] font-black uppercase italic tracking-tighter flex items-center justify-center gap-2 border-2 border-white disabled:opacity-30 shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-1"
            >
              {role === UserRole.DRIVER ? 'NEXT: VEHICLE' : 'FINALIZE ACCOUNT'}
            </button>
          </div>
        )}

        {step === 4 && role === UserRole.DRIVER && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-black">TRAANSIE LAMI</h1>
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-white border-4 border-black rounded-xl px-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                <Car size={18} />
                <input
                  placeholder="BRAND (e.g. TOYOTA QUANTUM)"
                  value={vehicle.brand} onChange={e => setVehicle({...vehicle, brand: e.target.value.toUpperCase()})}
                  className="w-full p-4 font-black text-xs uppercase outline-none"
                />
              </div>
              <div className="flex items-center gap-2 bg-white border-4 border-black rounded-xl px-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                <Type size={18} />
                <input
                  placeholder="TAXI COLOR"
                  value={vehicle.color} onChange={e => setVehicle({...vehicle, color: e.target.value.toUpperCase()})}
                  className="w-full p-4 font-black text-xs uppercase outline-none"
                />
              </div>
              <div className="flex items-center gap-2 bg-white border-4 border-black rounded-xl px-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                <Type size={18} />
                <input
                  placeholder="NUMBER PLATE (OPTIONAL)"
                  value={vehicle.plate} onChange={e => setVehicle({...vehicle, plate: e.target.value.toUpperCase()})}
                  className="w-full p-4 font-black text-xs uppercase outline-none focus:border-black"
                />
              </div>
            </div>
            <button
              onClick={handleNext}
              className="w-full bg-black text-white py-5 rounded-[2rem] font-black uppercase italic tracking-tighter flex items-center justify-center gap-2 border-2 border-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-1"
            >
              NEXT: TAXI PHOTOS
            </button>
          </div>
        )}

        {step === 5 && role === UserRole.DRIVER && (
          <div className="space-y-6 animate-in slide-in-from-right-4 text-center">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-black">TAXI PHOTOS</h1>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase">FRONT VIEW</p>
                <div className="aspect-square bg-white rounded-2xl border-4 border-black flex items-center justify-center relative overflow-hidden shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  {frontPhoto ? <img src={frontPhoto} className="w-full h-full object-cover" /> : <button onClick={() => setFrontPhoto("https://images.unsplash.com/photo-1559412097-401d87f9453c?auto=format&fit=crop&q=80&w=200")} className="text-black/20 hover:text-black transition-colors"><Camera size={32}/></button>}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase">SIDE VIEW</p>
                <div className="aspect-square bg-white rounded-2xl border-4 border-black flex items-center justify-center relative overflow-hidden shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  {sidePhoto ? <img src={sidePhoto} className="w-full h-full object-cover" /> : <button onClick={() => setSidePhoto("https://images.unsplash.com/photo-1559412097-401d87f9453c?auto=format&fit=crop&q=80&w=200")} className="text-black/20 hover:text-black transition-colors"><Camera size={32}/></button>}
                </div>
              </div>
            </div>
            {error && <p className="text-red-600 font-black text-center text-xs uppercase bg-red-50 p-3 rounded-xl border-2 border-red-600">{error}</p>}
            <button
              onClick={simulateVehicleScan}
              disabled={isProcessing}
              className="w-full bg-black text-white py-5 rounded-[2rem] font-black uppercase italic tracking-tighter flex items-center justify-center gap-2 border-2 border-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-1 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : 'VERIFY LE TRAANSIE LAMI'}
            </button>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6 animate-in zoom-in-95 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center border-4 border-white shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
                <CheckCircle2 className="text-green-500" size={48} />
              </div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-black">SHO! WE LIVE.</h2>
              <p className="text-sm font-bold text-black/60">Welcome to the Jozi Network</p>
            </div>
            <button onClick={finish} className="w-full bg-black text-white py-5 rounded-[2rem] font-black uppercase italic tracking-tighter flex items-center justify-center gap-2 border-2 border-white shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
              OPEN DASHBOARD <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingFlow;
