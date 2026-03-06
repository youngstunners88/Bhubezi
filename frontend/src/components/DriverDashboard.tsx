import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { UserProfile, ActivePing, RoutePath, DriverStatus, ChatMessage, Review } from '../types';
import { UserRole } from '../types';
import { TAXI_RANKS, POINT_VALUES } from '../constants';
import { Play, Users, MapPin, Navigation, Square, Banknote, X, History, UserMinus, UserPlus, MessageCircle, ShieldAlert, Send, Search, Car, AlertTriangle, Zap, LocateFixed, ShieldCheck, Sparkles, Star, Trophy, Type, ChevronLeft, Bell, CheckCircle2, User } from 'lucide-react';
import RouteMap from './RouteMap';
import ReferralRewards from './ReferralRewards';

interface Props {
  user: UserProfile;
  pings: ActivePing[];
  addPoints: (amount: number) => void;
  routes: RoutePath[];
  onUpdateRoute: (route: RoutePath) => void;
  onConfirmPickup: (pingId: string) => void;
  onLocationUpdate: (coords: {x: number, y: number} | null) => void;
  onStatusUpdate: (status: DriverStatus | null) => void;
  onTripComplete?: () => void;
  messages: ChatMessage[];
  onSendMessage: (content: string, routeId?: string, isAlert?: boolean, alertType?: ChatMessage['alertType'], channel?: ChatMessage['channel'], rankTag?: string) => void;
  onUploadWash: (photos: { front: string, back: string, side: string }) => void;
  onApproveMarshal: (marshalId: string) => void;
  showTutorial?: boolean;
  onCloseTutorial?: () => void;
  isOnline?: boolean;
  otherDriversOnRoute?: { id: string; name: string; coords: {x: number, y: number} }[];
  onAcceptPing?: (pingId: string, driverId: string, driverName: string, price: number) => void;
  onSubmitReview?: (review: Review) => void;
}

const DriverDashboard: React.FC<Props> = ({
  user, pings, addPoints, routes, onUpdateRoute,
  onLocationUpdate, onStatusUpdate, onTripComplete, messages, onSendMessage,
  showTutorial, onCloseTutorial, isOnline = true,
  otherDriversOnRoute = [], onAcceptPing, onSubmitReview
}) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originTab, setOriginTab] = useState('CBD');
  const [destTab, setDestTab] = useState('CBD');
  const [customDestination, setCustomDestination] = useState('');
  const [useCustomDest, setUseCustomDest] = useState(false);
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [myCoords, setMyCoords] = useState<{ x: number, y: number } | null>(null);
  const [isDriving, setIsDriving] = useState(false);
  const [passengersEntered, setPassengersEntered] = useState(0);
  const [passengersExited, setPassengersExited] = useState(0);
  const [driverProgress, setDriverProgress] = useState(0);
  const [showPriceBoard, setShowPriceBoard] = useState(false);
  const [priceSearch, setPriceSearch] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatChannel, setChatChannel] = useState<'DRIVERS' | 'MARSHALS' | 'PASSENGERS'>('DRIVERS');
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [acceptedPings, setAcceptedPings] = useState<string[]>([]);
  const [showCompetingDrivers, setShowCompetingDrivers] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{id: string, name: string, role: typeof UserRole[keyof typeof UserRole]} | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const categories = ['CBD', 'Soweto', 'Alexandra', 'Greater Joburg', 'East Rand', 'West Rand', 'Northern Suburbs', 'Long Distance'];
  const occupancy = Math.max(0, passengersEntered - passengersExited);

  const activeRoute = useMemo(() =>
    routes.find(r => (useMyLocation ? (r.originId === 'my-location' || r.originId === origin) : r.originId === origin) && r.destinationId === (useCustomDest ? 'custom' : destination)),
    [routes, origin, destination, useCustomDest, useMyLocation]);

  const filteredMessages = useMemo(() => {
    return messages.filter(m => m.channel === chatChannel);
  }, [messages, chatChannel]);

  // Get pings for the current route
  const relevantPings = useMemo(() => {
    if (!activeRoute) return pings;
    return pings.filter(p => {
      // Show pings that match the current route
      if (p.rankId && (p.rankId === origin || p.isCustom)) return true;
      return true; // Show all pings for now
    });
  }, [pings, activeRoute, origin]);

  const handleAcceptPing = (ping: ActivePing) => {
    const price = activeRoute?.price || 15;
    if (onAcceptPing) {
      onAcceptPing(ping.id, user.id, user.name, price);
    }
    setAcceptedPings(prev => [...prev, ping.id]);
    addPoints(POINT_VALUES.DRIVER_CONFIRM_PICKUP);
    alert(`Request accepted! Price: R${price}. Passenger will see you as an option.`);
  };

  const getRankName = (id: string) => TAXI_RANKS.find(r => r.id === id)?.name || (id === 'custom' ? customDestination : id);
  const filteredOriginRanks = useMemo(() => TAXI_RANKS.filter(r => r.category === originTab), [originTab]);
  const filteredDestRanks = useMemo(() => TAXI_RANKS.filter(r => r.category === destTab), [destTab]);

  const filteredPriceRoutes = useMemo(() => {
    const search = priceSearch.toLowerCase();
    return routes.filter(r => {
      const originName = r.originId === 'my-location' ? 'My Location' : getRankName(r.originId).toLowerCase();
      const destName = r.destinationId === 'custom' ? (r.customDestinationName || customDestination || '').toLowerCase() : getRankName(r.destinationId).toLowerCase();
      return originName.includes(search) || (destName && destName.includes(search));
    });
  }, [routes, priceSearch, customDestination]);

  const driverCoords = useMemo(() => {
    if (isDriving && activeRoute && activeRoute.path.length >= 2) {
      const path = activeRoute.path;
      const totalSegments = path.length - 1;
      const segment = Math.min(Math.floor(driverProgress * totalSegments), totalSegments - 1);
      const segmentProgress = (driverProgress * totalSegments) % 1;
      const p1 = path[segment];
      const p2 = path[segment + 1];
      return {
        x: p1.x + (p2.x - p1.x) * segmentProgress,
        y: p1.y + (p2.y - p1.y) * segmentProgress
      };
    }
    return myCoords;
  }, [isDriving, activeRoute, driverProgress, myCoords]);

  const handleUpdatePrice = (routeId: string, newPrice: number) => {
    const existingRoute = routes.find(r => r.id === routeId);
    if (existingRoute) {
      onUpdateRoute({ ...existingRoute, price: newPrice, lastUpdatedBy: `DRIVER ${user.name}` });
      addPoints(POINT_VALUES.SUBMIT_PRICE);
    }
  };

  const handleUseLocation = () => {
    if (!useMyLocation) {
      // Set location immediately with default Johannesburg coords, then update with precise GPS
      const defaultJoziCoords = { x: 50, y: 50 }; // Center of Joburg
      setMyCoords(defaultJoziCoords);
      setUseMyLocation(true);
      setOrigin('');
      onLocationUpdate(defaultJoziCoords);
      
      // Then try to get precise GPS in background
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          const x = ((lng - 27.9) / 0.3) * 100;
          const y = (1 - (lat + 26.3) / 0.2) * 100;
          const coords = { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
          setMyCoords(coords);
          onLocationUpdate(coords);
        },
        () => { /* Using default location */ },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setUseMyLocation(false);
      setMyCoords(null);
      onLocationUpdate(null);
    }
  };

  useEffect(() => {
    onLocationUpdate(driverCoords);
  }, [driverCoords, onLocationUpdate]);

  useEffect(() => {
    if (isDriving) {
      onStatusUpdate({
        isEnRoute: true,
        destinationName: useCustomDest ? customDestination : (TAXI_RANKS.find(r => r.id === destination)?.name || 'Jozi'),
        occupancy,
        lastUpdated: Date.now()
      });
      const interval = setInterval(() => {
        setDriverProgress(p => (p + 0.005) % 1);
      }, 500);
      return () => clearInterval(interval);
    } else {
      onStatusUpdate(null);
      setDriverProgress(0);
    }
  }, [isDriving, occupancy, onStatusUpdate, destination, customDestination, useCustomDest]);

  const startTrip = () => {
    if (!canStartService) return;
    setIsDriving(true);
    setPassengersEntered(0);
    setPassengersExited(0);
    addPoints(POINT_VALUES.DRIVER_START_TRIP);
  };

  const finishTrip = () => {
    setIsDriving(false);
    if (onTripComplete) onTripComplete();
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget || !onSubmitReview) return;
    onSubmitReview({
      id: `review-${Date.now()}`,
      reviewerId: user.id,
      reviewerName: user.name,
      reviewerRole: UserRole.DRIVER,
      targetId: reviewTarget.id,
      targetName: reviewTarget.name,
      targetRole: reviewTarget.role,
      rating: reviewRating,
      comment: reviewComment,
      timestamp: Date.now()
    });
    setShowReviewModal(false);
    setReviewTarget(null);
    setReviewRating(5);
    setReviewComment('');
    addPoints(10);
    alert('Review submitted! +10 points');
  };

  const handleDriverAlert = (type: ChatMessage['alertType'], baseMsg: string) => {
    let locationTag = "Nearby Intersection";
    const currentPos = driverCoords;
    if (currentPos) {
      const nearest = TAXI_RANKS.reduce((prev, curr) => {
        const d1 = Math.sqrt(Math.pow(curr.coords.x - currentPos.x, 2) + Math.pow(curr.coords.y - currentPos.y, 2));
        const d2 = Math.sqrt(Math.pow(prev.coords.x - currentPos.x, 2) + Math.pow(prev.coords.y - currentPos.y, 2));
        return d1 < d2 ? curr : prev;
      });
      locationTag = `${nearest.name} Intersection`;
    }
    const finalMsg = `[${locationTag}] ${baseMsg}`;
    onSendMessage(finalMsg, activeRoute?.id, true, type, 'MARSHALS', locationTag);
    onSendMessage(finalMsg, activeRoute?.id, true, type, 'DRIVERS', locationTag);
    alert(`Alert broadcasted to Marshals & Drivers from ${locationTag}!`);
  };

  const sendTextMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput, activeRoute?.id, false, 'GENERAL', chatChannel);
    setChatInput('');
  };

  const canStartService = (useMyLocation || origin !== '') && (useCustomDest ? customDestination !== '' : destination !== '');

  const driverSteps = [
    { title: "Start Your Day", desc: "Select a rank or use your current location to show where you're starting from.", icon: <MapPin className="text-yellow-400" /> },
    { title: "Set Destination", desc: "Choose where you're heading. You can pick a rank or type a custom street name.", icon: <Navigation className="text-blue-500" /> },
    { title: "Load Passengers", desc: "Once you start, use the LOAD/OFF buttons to track your 15-seater occupancy.", icon: <Users className="text-green-500" /> },
    { title: "Alert Others", desc: "Seen police or traffic? Press the quick buttons to warn the whole Jozi fleet!", icon: <ShieldAlert className="text-red-500" /> }
  ];

  return (
    <div className="space-y-6 flex flex-col min-h-0 relative">
      {showTutorial && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="bg-white w-full max-w-sm rounded-[3rem] border-4 border-black overflow-hidden flex flex-col shadow-[15px_15px_0_0_rgba(251,191,36,1)]">
            <div className="bg-yellow-400 p-8 border-b-4 border-black text-center">
              <div className="w-20 h-20 bg-black rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-xl">
                <Sparkles className="text-yellow-400" size={40} />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-black leading-none">DRIVER GUIDE</h2>
              <p className="text-[10px] font-black text-black/60 uppercase tracking-[0.2em] mt-2">Master the Jozi Routes</p>
            </div>
            <div className="p-8 space-y-6 flex-1">
              <div className="flex items-start gap-5 animate-in slide-in-from-right-4" key={tutorialStep}>
                <div className="bg-gray-100 p-4 rounded-2xl border-2 border-black/10">{driverSteps[tutorialStep].icon}</div>
                <div className="space-y-2">
                  <h4 className="text-xl font-black uppercase italic tracking-tighter leading-none">{driverSteps[tutorialStep].title}</h4>
                  <p className="text-xs font-bold text-gray-500 leading-snug">{driverSteps[tutorialStep].desc}</p>
                </div>
              </div>
            </div>
            <div className="p-8 bg-gray-50 border-t-4 border-black flex gap-3">
              {tutorialStep > 0 && (
                <button onClick={() => setTutorialStep(s => s-1)} className="p-4 bg-white border-4 border-black rounded-2xl active:scale-95"><ChevronLeft/></button>
              )}
              <button
                onClick={() => tutorialStep < driverSteps.length - 1 ? setTutorialStep(s => s+1) : (onCloseTutorial && onCloseTutorial())}
                className="flex-1 bg-black text-white py-4 rounded-2xl font-black uppercase italic tracking-tighter border-2 border-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-1"
              >
                {tutorialStep < driverSteps.length - 1 ? 'NEXT STEP' : 'SHO! LET\'S DRIVE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isOnline && (
        <div className="bg-red-500 text-white p-3 rounded-2xl border-2 border-black text-center text-xs font-black uppercase animate-pulse">
          OFFLINE MODE - Actions will sync when back online
        </div>
      )}

      <div className="bg-blue-800 text-white p-6 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black flex justify-between items-center relative overflow-hidden flex-shrink-0">
        <div className="absolute top-0 right-0 p-4 opacity-10"><History size={80} /></div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center border-2 border-yellow-400 overflow-hidden">
            {user.profileImage ? (
              <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <User className="text-yellow-400" size={28} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-yellow-400">Sho! {user.name}!</h2>
              <ShieldCheck size={18} className="text-yellow-400" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest">{user.vehicle?.plate || 'NO PLATE'}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 relative z-10">
          <button onClick={() => setShowPriceBoard(true)} className="p-3 rounded-2xl border-2 border-black bg-blue-900 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1">
            <Banknote size={20} />
          </button>
          <button data-testid="driver-comms-btn" onClick={() => setShowChat(!showChat)} className={`p-3 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 transition-all ${showChat ? 'bg-yellow-400 text-black' : 'bg-blue-900 text-white'}`}>
            <MessageCircle size={20} />
          </button>
        </div>
      </div>

      {showPriceBoard && (
        <div className="bg-white p-6 rounded-[2.5rem] border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-top-4 fixed inset-x-5 top-24 bottom-24 z-[100] flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-black text-lg uppercase italic tracking-tighter flex items-center gap-2"><Banknote size={20} className="text-blue-500" /> PRICE BOARD</h3>
            <button onClick={() => setShowPriceBoard(false)} className="text-gray-400 hover:text-black"><X size={24}/></button>
          </div>
          <div className="relative mb-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" value={priceSearch} onChange={(e) => setPriceSearch(e.target.value)} placeholder="Search routes..." className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-black rounded-xl font-black text-xs outline-none" />
          </div>
          <div className="space-y-3 overflow-y-auto no-scrollbar flex-1">
            {filteredPriceRoutes.map(r => (
              <div key={r.id} className="p-4 bg-gray-50 rounded-2xl border-2 border-black/10 flex justify-between items-center">
                <div className="max-w-[65%] text-xs font-black italic uppercase">
                  <div className="text-blue-500">FROM: {getRankName(r.originId)}</div>
                  <div className="text-gray-800">TO: {getRankName(r.destinationId)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" defaultValue={r.price} onBlur={(e) => handleUpdatePrice(r.id, parseInt(e.target.value))} className="w-16 p-2 bg-white border-2 border-black rounded-lg font-black text-center text-sm shadow-[2px_2px_0_0_rgba(0,0,0,1)]" />
                  <span className="text-xs font-black italic">R</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showChat && (
        <div className="bg-white p-6 rounded-[2.5rem] border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-top-4 fixed inset-x-5 top-24 bottom-24 z-[100] flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-black text-lg uppercase italic tracking-tighter flex items-center gap-2"><MessageCircle size={20} className="text-blue-500" /> COMMS HUB</h3>
            <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-black"><X size={20}/></button>
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4">
            <button onClick={() => setChatChannel('DRIVERS')} className={`flex-1 px-3 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${chatChannel === 'DRIVERS' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>DRIVERS</button>
            <button onClick={() => setChatChannel('MARSHALS')} className={`flex-1 px-3 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${chatChannel === 'MARSHALS' ? 'bg-orange-600 text-white' : 'text-gray-400'}`}>MARSHALS</button>
            <button onClick={() => setChatChannel('PASSENGERS')} className={`flex-1 px-3 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${chatChannel === 'PASSENGERS' ? 'bg-green-600 text-white' : 'text-gray-400'}`}>PASSENGERS</button>
          </div>
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-3 no-scrollbar mb-4 flex flex-col-reverse">
            {filteredMessages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <MessageCircle size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-[10px] font-black uppercase">No messages yet in {chatChannel}</p>
              </div>
            ) : (
              filteredMessages.slice().reverse().map(msg => (
                <div key={msg.id} className={`p-3 rounded-2xl border-2 ${msg.isAlert ? 'bg-red-50 border-red-500' : msg.senderId === user.id ? 'bg-blue-50 border-blue-200 ml-4' : 'bg-gray-50 border-black/5 mr-4'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-[8px] font-black uppercase tracking-widest ${msg.role === UserRole.DRIVER ? 'text-blue-600' : msg.role === UserRole.MARSHAL ? 'text-orange-600' : 'text-green-600'}`}>
                      {msg.senderName} {msg.rankTag ? `(@ ${msg.rankTag})` : ''}
                      <span className="text-gray-400 ml-1">• {msg.role === UserRole.DRIVER ? 'DRIVER' : msg.role === UserRole.MARSHAL ? 'MARSHAL' : 'PASSENGER'}</span>
                    </span>
                    <span className="text-[7px] text-gray-400 font-bold">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="text-xs font-bold leading-tight">{msg.content}</p>
                  {msg.role === UserRole.PASSENGER && msg.senderId !== user.id && onSubmitReview && (
                    <button 
                      onClick={() => { setReviewTarget({id: msg.senderId, name: msg.senderName, role: UserRole.PASSENGER}); setShowReviewModal(true); }}
                      className="text-[8px] font-black text-green-500 uppercase mt-1 hover:underline"
                    >
                      Review Passenger →
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          <form onSubmit={sendTextMsg} className="flex gap-2">
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={`Message ${chatChannel.toLowerCase()}...`} className="flex-1 bg-gray-50 border-2 border-black rounded-xl px-4 py-2 font-black text-xs outline-none"/>
            <button type="submit" className="bg-black text-white p-2 rounded-xl border-2 border-black active:scale-95"><Send size={18} /></button>
          </form>
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pb-20">
            {isDriving && (
              <div className="bg-black text-yellow-400 p-5 rounded-[2rem] border-4 border-yellow-400 shadow-xl animate-in slide-in-from-top-4">
                <div className="flex items-center justify-between mb-3 text-[8px] font-black uppercase italic tracking-widest">
                  <div className="flex items-center gap-2"><Navigation size={14} /> EN ROUTE TO:</div>
                  <div className="bg-yellow-400 text-black px-2 py-0.5 rounded-full">LIVE</div>
                </div>
                <p className="text-2xl font-black uppercase italic tracking-tighter leading-none border-b border-yellow-400/20 pb-3">{getRankName(destination)}</p>
                <div className="flex justify-between items-center mt-3">
                  <div className="text-center"><p className="text-[8px] font-black uppercase opacity-60 leading-none">LOADED</p><p className="text-xl font-black">{occupancy}/15</p></div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => {setPassengersEntered(p => p+1); addPoints(5);}} className="bg-green-600 text-white p-3 rounded-2xl border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:translate-y-1 flex items-center gap-2"><UserPlus size={14} /><span className="text-[9px] font-black uppercase">LOAD</span></button>
                    <button onClick={() => {if(occupancy > 0) {setPassengersExited(p => p+1); addPoints(5);}}} className="bg-red-600 text-white p-3 rounded-2xl border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:translate-y-1 flex items-center gap-2"><UserMinus size={14} /><span className="text-[9px] font-black uppercase">OFF</span></button>
                  </div>
                </div>
              </div>
            )}
            <div className="relative rounded-[2.5rem] overflow-hidden border-4 border-black shadow-2xl z-10 h-64">
              <RouteMap originId={useMyLocation ? 'my-location' : origin} destinationId={useCustomDest ? 'custom' : destination} activePings={pings} activeRoutePath={activeRoute?.path} userCoords={driverCoords} otherDrivers={otherDriversOnRoute} />
            </div>

            {/* OTHER TAXIS ON ROUTE */}
            {otherDriversOnRoute.length > 0 && showCompetingDrivers && (
              <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-200">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-1">
                    <Car size={12} /> OTHER TAXIS ON THIS ROUTE
                  </p>
                  <button onClick={() => setShowCompetingDrivers(false)} className="text-blue-400 hover:text-blue-600"><X size={14}/></button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {otherDriversOnRoute.map(driver => (
                    <div key={driver.id} className="px-3 py-1.5 bg-white rounded-xl border-2 border-blue-200 text-[9px] font-black text-blue-700 flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      {driver.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PASSENGER REQUESTS */}
            {relevantPings.length > 0 && !isDriving && (
              <div className="space-y-3">
                <h3 className="font-black text-[10px] uppercase text-gray-500 tracking-widest flex items-center gap-2">
                  <Bell size={12} className="text-yellow-500" /> PASSENGER REQUESTS ({relevantPings.length})
                </h3>
                <div className="space-y-3">
                  {relevantPings.map(ping => {
                    const isAccepted = acceptedPings.includes(ping.id) || ping.acceptedBy?.includes(user.id);
                    const acceptedCount = ping.acceptedBy?.length || 0;
                    const price = activeRoute?.price || 15;
                    return (
                      <div key={ping.id} className={`p-4 rounded-2xl border-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)] ${isAccepted ? 'bg-green-50 border-green-400' : 'bg-white border-black'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-black uppercase italic">{ping.passengerName}</p>
                            <p className="text-[9px] font-bold text-gray-400">
                              {ping.isCustom ? 'Custom Location' : TAXI_RANKS.find(r => r.id === ping.rankId)?.name || 'Unknown Rank'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-green-600">R{price}</p>
                            {acceptedCount > 0 && (
                              <p className="text-[8px] font-black text-orange-500">{acceptedCount} driver{acceptedCount > 1 ? 's' : ''} competing</p>
                            )}
                          </div>
                        </div>
                        {!isAccepted ? (
                          <button 
                            onClick={() => handleAcceptPing(ping)}
                            className="w-full bg-yellow-400 text-black py-3 rounded-xl font-black uppercase text-xs border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:translate-y-1"
                          >
                            ACCEPT REQUEST - R{price}
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-2 text-green-600 py-2">
                            <CheckCircle2 size={16} />
                            <span className="text-xs font-black uppercase">YOU ACCEPTED</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!isDriving ? (
              <div className="bg-white p-7 rounded-[3rem] border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] space-y-6">
                <button onClick={handleUseLocation} className={`w-full p-4 rounded-2xl border-2 border-black font-black text-[11px] flex items-center justify-center gap-3 transition-all ${useMyLocation ? 'bg-blue-500 text-white shadow-none translate-y-1' : 'bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]'}`}>
                  <LocateFixed size={18} /> {useMyLocation ? 'GPS ACTIVE' : 'USE MY LOCATION'}
                </button>
                <div className="space-y-4">
                  {!useMyLocation && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block ml-1">FROM WHERE?</label>
                      <div className="flex overflow-x-auto gap-1 no-scrollbar pb-1">
                        {categories.map(c => <button key={c} onClick={() => setOriginTab(c)} className={`flex-shrink-0 px-3 py-1.5 rounded-xl border-2 border-black text-[8px] font-black uppercase transition-all ${originTab === c ? 'bg-yellow-400 text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]' : 'bg-gray-50 text-gray-400'}`}>{c}</button>)}
                      </div>
                      <select value={origin} onChange={(e) => setOrigin(e.target.value)} className="w-full p-4 bg-gray-50 border-4 border-black rounded-[1.5rem] font-black text-sm outline-none appearance-none">
                        <option value="">RANK IN {originTab}...</option>
                        {filteredOriginRanks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block">DESTINATION?</label>
                      <button onClick={() => setUseCustomDest(!useCustomDest)} className="text-[9px] font-black uppercase text-blue-600 italic hover:underline">{useCustomDest ? 'SELECT RANK' : 'ENTER CUSTOM'}</button>
                    </div>
                    {useCustomDest ? (
                      <div className="relative group">
                        <input
                          type="text"
                          value={customDestination}
                          onChange={(e) => setCustomDestination(e.target.value)}
                          placeholder="Type custom location..."
                          className="w-full p-5 bg-gray-50 border-4 border-black rounded-[1.5rem] font-black text-sm outline-none shadow-[4px_4px_0_0_rgba(0,0,0,1)] focus:translate-x-0.5 focus:translate-y-0.5 transition-all"
                        />
                        <Type size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-black/20" />
                      </div>
                    ) : (
                      <>
                        <div className="flex overflow-x-auto gap-1 no-scrollbar pb-1">
                          {categories.map(c => <button key={c} onClick={() => setDestTab(c)} className={`flex-shrink-0 px-3 py-1.5 rounded-xl border-2 border-black text-[8px] font-black uppercase transition-all ${destTab === c ? 'bg-blue-400 text-white shadow-[2px_2px_0_0_rgba(0,0,0,1)]' : 'bg-gray-50 text-gray-400'}`}>{c}</button>)}
                        </div>
                        <select value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full p-4 bg-gray-50 border-4 border-black rounded-[1.5rem] font-black text-sm outline-none appearance-none">
                          <option value="">RANK IN {destTab}...</option>
                          {filteredDestRanks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </>
                    )}
                  </div>
                </div>
                <button onClick={startTrip} disabled={!canStartService} className={`w-full font-black py-5 rounded-[3rem] border-4 border-black transition-all ${canStartService ? 'bg-green-600 text-white shadow-[6px_6px_0_0_rgba(0,0,0,1)]' : 'bg-gray-200 text-gray-400 opacity-50 cursor-not-allowed grayscale'}`}>
                  <Play size={24} fill="currentColor" /> START TRIP
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => handleDriverAlert('POLICE', "POLICE STOP!")} className="bg-red-600 text-white p-4 rounded-2xl border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] flex flex-col items-center gap-1 active:translate-y-1"><ShieldAlert size={24} /><span className="text-[8px] font-black uppercase">Police</span></button>
                  <button onClick={() => handleDriverAlert('TRAFFIC', "HEAVY TRAFFIC!")} className="bg-orange-500 text-white p-4 rounded-2xl border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] flex flex-col items-center gap-1 active:translate-y-1"><AlertTriangle size={24} /><span className="text-[8px] font-black uppercase">Traffic</span></button>
                  <button onClick={() => handleDriverAlert('ALT_ROUTE', "ROAD IS CLEAR!")} className="bg-green-600 text-white p-4 rounded-2xl border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] flex flex-col items-center gap-1 active:translate-y-1"><Zap size={24} /><span className="text-[8px] font-black uppercase">Clear</span></button>
                </div>
                <button onClick={finishTrip} className="w-full bg-white text-red-600 font-black py-5 rounded-[2.5rem] border-4 border-red-600 uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-[4px_4px_0_0_rgba(220,38,38,0.1)]"><Square size={16} fill="currentColor" /> FINISH TRIP</button>
              </div>
            )}
            <div className="bg-black text-white p-8 rounded-[3.5rem] border-4 border-yellow-400 shadow-[12px_12px_0_0_rgba(0,0,0,1)] grid grid-cols-3 gap-4">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 bg-yellow-400/10 rounded-xl flex items-center justify-center mx-auto border border-yellow-400/30"><Star className="text-yellow-400" size={18} fill="currentColor" /></div>
                <p className="text-lg font-black">{user.averageRating?.toFixed(1) || '5.0'}</p>
                <p className="text-[7px] font-black uppercase text-gray-500 tracking-widest">RATING</p>
              </div>
              <div className="text-center space-y-1">
                <div className="w-10 h-10 bg-blue-400/10 rounded-xl flex items-center justify-center mx-auto border border-blue-400/30"><Car className="text-blue-400" size={18} /></div>
                <p className="text-lg font-black">{user.tripsCompleted || 0}</p>
                <p className="text-[7px] font-black uppercase text-gray-500 tracking-widest">TRIPS</p>
              </div>
              <div className="text-center space-y-1">
                <div className="w-10 h-10 bg-green-400/10 rounded-xl flex items-center justify-center mx-auto border border-green-400/30"><Trophy className="text-green-400" size={18} /></div>
                <p className="text-lg font-black">{user.points}</p>
                <p className="text-[7px] font-black uppercase text-gray-500 tracking-widest">POINTS</p>
              </div>
            </div>
            <ReferralRewards userId={user.id} onReferral={() => addPoints(POINT_VALUES.AFFILIATE_SHARE)} />
      </div>

      {/* Review Modal */}
      {showReviewModal && reviewTarget && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[2rem] border-4 border-black shadow-[10px_10px_0_0_rgba(0,0,0,1)] p-6">
            <h3 className="font-black text-lg uppercase italic tracking-tighter mb-4">Review {reviewTarget.name}</h3>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={`w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center ${star <= reviewRating ? 'bg-yellow-400 text-black' : 'bg-gray-100 text-gray-400'}`}
                    >
                      <Star size={18} fill={star <= reviewRating ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2">Comment (Optional)</label>
                <textarea 
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience..."
                  className="w-full p-3 bg-gray-50 border-2 border-black rounded-xl font-bold text-sm resize-none h-20"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowReviewModal(false)} className="flex-1 py-3 rounded-xl border-2 border-black font-black uppercase text-xs bg-gray-100">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl border-2 border-black font-black uppercase text-xs bg-blue-500 text-white shadow-[3px_3px_0_0_rgba(0,0,0,1)]">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(DriverDashboard);
