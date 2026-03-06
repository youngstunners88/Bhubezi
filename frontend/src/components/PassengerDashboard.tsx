import React, { useState, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { UserProfile, RoutePath, ActivePing, RankStatus, TrafficLevel, DriverStatus, MarshalInfo, ChatMessage, Review } from '../types';
import { UserRole } from '../types';
import { TAXI_RANKS, POINT_VALUES } from '../constants';
import { Navigation, Bell, MapPin, Car, Target, Clock, Banknote, LocateFixed, CheckCircle2, UserCheck, Users, X, Activity, Type, ChevronLeft, TrendingUp, Star, Trophy, MessageCircle, Send, User, Search } from 'lucide-react';
import RouteMap from './RouteMap';
import ReferralRewards from './ReferralRewards';

interface Props {
  user: UserProfile;
  addPoints: (amount: number) => void;
  routes: RoutePath[];
  onPing: (ping: ActivePing) => void;
  onConfirmPickup: (pingId: string) => void;
  onConfirmDelivery: () => void;
  rankStatuses: Record<string, RankStatus>;
  heroDriverStatus?: DriverStatus | null;
  onCheatingDetected?: () => void;
  showTutorial?: boolean;
  onCloseTutorial?: () => void;
  isOnline?: boolean;
  marshals?: MarshalInfo[];
  messages?: ChatMessage[];
  onSendMessage?: (content: string, routeId?: string, isAlert?: boolean, alertType?: ChatMessage['alertType'], channel?: ChatMessage['channel'], rankTag?: string) => void;
  onSubmitReview?: (review: Omit<Review, 'id' | 'timestamp'>) => void;
  reviews?: Review[];
  activePings?: ActivePing[];
  otherDriversOnRoute?: { id: string; name: string; coords: {x: number, y: number} }[];
}

const PassengerDashboard: React.FC<Props> = ({ user, addPoints, routes, onPing, onConfirmPickup, onConfirmDelivery, showTutorial, onCloseTutorial, isOnline = true, marshals = [], messages = [], onSendMessage, onSubmitReview, activePings = [], otherDriversOnRoute = [] }) => {
  const [selectedRank, setSelectedRank] = useState('');
  const [destinationRank, setDestinationRank] = useState('');
  const [originTab, setOriginTab] = useState('CBD');
  const [destTab, setDestTab] = useState('CBD');
  const [useCustomDest, setUseCustomDest] = useState(false);
  const [customDestination, setCustomDestination] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [isEnRoute, setIsEnRoute] = useState(false);
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [myCoords, setMyCoords] = useState<{ x: number, y: number } | null>(null);
  const [showPriceBoard, setShowPriceBoard] = useState(false);
  const [walkingSpeedCongruency, setWalkingSpeedCongruency] = useState(1.0);
  const [trafficLevel, setTrafficLevel] = useState<TrafficLevel>('MODERATE');
  const [currentPingId, setCurrentPingId] = useState<string | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  
  // Comms and marshal selection states
  const [showComms, setShowComms] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [selectedMarshalId, setSelectedMarshalId] = useState<string>('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{id: string, name: string, role: typeof UserRole[keyof typeof UserRole]} | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [showCompetingDrivers, setShowCompetingDrivers] = useState(true);
  const [priceSearch, setPriceSearch] = useState('');
  const [chatChannel, setChatChannel] = useState<'DRIVERS' | 'MARSHALS' | 'PASSENGERS'>('PASSENGERS');
  
  // Use activePings to get current ping info
  const currentPingInfo = useMemo(() => {
    return activePings.find(p => p.passengerId === user.id);
  }, [activePings, user.id]);

  useEffect(() => {
    const trafficLevels: TrafficLevel[] = ['CLEAR', 'MODERATE', 'HEAVY', 'GRIDLOCK'];
    const interval = setInterval(() => {
      setTrafficLevel(trafficLevels[Math.floor(Math.random() * trafficLevels.length)]);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isWaiting) {
      const interval = setInterval(() => {
        setWalkingSpeedCongruency(0.8 + Math.random() * 0.4);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isWaiting]);

  const getRankName = (id: string) => TAXI_RANKS.find(r => r.id === id)?.name || (id === 'custom' ? customDestination : id);
  const categories = ['CBD', 'Soweto', 'Alexandra', 'Greater Joburg', 'East Rand', 'West Rand', 'Northern Suburbs', 'Long Distance'];
  const filteredOriginRanks = useMemo(() => TAXI_RANKS.filter(r => r.category === originTab), [originTab]);
  const filteredDestRanks = useMemo(() => TAXI_RANKS.filter(r => r.category === destTab), [destTab]);

  const activeRoute = useMemo(() =>
    routes.find(r => (r.originId === selectedRank || useMyLocation) && r.destinationId === (useCustomDest ? 'custom' : destinationRank)),
    [routes, selectedRank, destinationRank, useMyLocation, useCustomDest]);

  const calculatedETA = useMemo(() => {
    if (!activeRoute && !isWaiting) return null;
    const trafficMultiplier = { 'CLEAR': 1.0, 'MODERATE': 1.4, 'HEAVY': 2.2, 'GRIDLOCK': 4.5 }[trafficLevel];
    const stopDelay = (activeRoute?.path.length || 2) * 0.3;
    const baseMinutes = 8;
    let eta = (baseMinutes * trafficMultiplier) + stopDelay;
    if (isWaiting) eta = eta / walkingSpeedCongruency;
    return Math.max(1, Math.round(eta));
  }, [activeRoute, trafficLevel, isWaiting, walkingSpeedCongruency]);

  const handleUseLocation = () => {
    if (!useMyLocation) {
      // Set location immediately with default Johannesburg coords, then update with precise GPS
      const defaultJoziCoords = { x: 50, y: 50 }; // Center of Joburg
      setMyCoords(defaultJoziCoords);
      setUseMyLocation(true);
      setSelectedRank('');
      
      // Then try to get precise GPS in background
      if (!navigator.geolocation) {
        console.log('Geolocation not supported');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          const x = ((lng - 27.9) / 0.3) * 100;
          const y = (1 - (lat + 26.3) / 0.2) * 100;
          setMyCoords({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
        },
        () => { /* Using default location */ },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setUseMyLocation(false);
      setMyCoords(null);
    }
  };

  const pingTaxi = () => {
    if (!destinationRank && !useCustomDest) return alert('Select destination first!');
    setIsWaiting(true);
    const pingId = uuidv4().slice(0, 9); // SECURITY FIX: Using uuid instead of Math.random()
    onPing({ id: pingId, passengerId: user.id, passengerName: user.name, rankId: selectedRank || undefined, customCoords: myCoords || undefined, isCustom: useMyLocation, timestamp: Date.now() });
    setCurrentPingId(pingId);
  };

  const handleArrival = () => {
    onConfirmDelivery();
    setIsEnRoute(false);
    setSelectedRank('');
    setDestinationRank('');
    alert("Sharp! Safe arrival confirmed. +30 Points awarded.");
  };

  const canPing = (useMyLocation || selectedRank !== '') && (useCustomDest ? customDestination !== '' : destinationRank !== '');

  // Get marshals at selected rank
  const marshalsAtRank = useMemo(() => {
    if (!selectedRank) return [];
    return marshals.filter(m => m.rankId === selectedRank && m.isOnline);
  }, [marshals, selectedRank]);

  // Get filtered messages for passenger - strictly by selected channel
  const filteredMessages = useMemo(() => {
    return messages.filter(m => m.channel === chatChannel);
  }, [messages, chatChannel]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !onSendMessage) return;
    const rankName = selectedRank ? TAXI_RANKS.find(r => r.id === selectedRank)?.name : undefined;
    onSendMessage(chatInput, undefined, false, 'GENERAL', chatChannel, rankName);
    setChatInput('');
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget || !onSubmitReview) return;
    onSubmitReview({
      reviewerId: user.id,
      reviewerName: user.name,
      reviewerRole: UserRole.PASSENGER,
      targetId: reviewTarget.id,
      targetName: reviewTarget.name,
      targetRole: reviewTarget.role,
      rating: reviewRating,
      comment: reviewComment
    });
    setShowReviewModal(false);
    setReviewTarget(null);
    setReviewRating(5);
    setReviewComment('');
    alert('Review submitted! +15 points');
    addPoints(15);
  };

  const filteredPriceRoutes = useMemo(() => {
    const search = priceSearch.toLowerCase();
    return routes.filter(r => {
      const dName = getRankName(r.destinationId).toLowerCase();
      const oName = getRankName(r.originId).toLowerCase();
      return dName.includes(search) || oName.includes(search);
    });
  }, [routes, priceSearch, customDestination]);

  const selectRouteFromBoard = (originId: string, destId: string) => {
    if (originId === 'my-location') { handleUseLocation(); }
    else { setSelectedRank(originId); setUseMyLocation(false); }
    setDestinationRank(destId);
    setUseCustomDest(false);
    setShowPriceBoard(false);
  };

  const passengerSteps = [
    { title: "Plan Your Route", desc: "Select where you are and where you want to go using the rank categories.", icon: <MapPin className="text-yellow-400" /> },
    { title: "Ping the Network", desc: "Press 'PING' to alert nearby drivers that you're waiting. They'll see you on the map!", icon: <Bell className="text-blue-500" /> },
    { title: "Confirm Collection", desc: "When you get into the taxi, press 'COLLECTED' so we can track your trip safety.", icon: <UserCheck className="text-green-500" /> },
    { title: "Arrive Safely", desc: "When you get off, press 'DELIVERED SAFE' to finish the trip and score points!", icon: <CheckCircle2 className="text-blue-600" /> }
  ];

  const trafficColor = { 'CLEAR': 'text-green-500', 'MODERATE': 'text-yellow-500', 'HEAVY': 'text-orange-500', 'GRIDLOCK': 'text-red-600' }[trafficLevel];

  return (
    <div className="space-y-6 pb-12 flex flex-col min-h-0 relative">
      {showTutorial && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="bg-white w-full max-w-sm rounded-[3rem] border-4 border-black overflow-hidden flex flex-col shadow-[15px_15px_0_0_rgba(34,197,94,1)]">
            <div className="bg-green-500 p-8 border-b-4 border-black text-center">
              <div className="w-20 h-20 bg-black rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-xl">
                <Users className="text-green-500" size={40} />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-black leading-none">COMMUTER GUIDE</h2>
              <p className="text-[10px] font-black text-black/60 uppercase tracking-[0.2em] mt-2">Ride the Jozi Network</p>
            </div>
            <div className="p-8 space-y-6 flex-1">
              <div className="flex items-start gap-5 animate-in slide-in-from-right-4" key={tutorialStep}>
                <div className="bg-gray-100 p-4 rounded-2xl border-2 border-black/10">{passengerSteps[tutorialStep].icon}</div>
                <div className="space-y-2">
                  <h4 className="text-xl font-black uppercase italic tracking-tighter leading-none">{passengerSteps[tutorialStep].title}</h4>
                  <p className="text-xs font-bold text-gray-500 leading-snug">{passengerSteps[tutorialStep].desc}</p>
                </div>
              </div>
            </div>
            <div className="p-8 bg-gray-50 border-t-4 border-black flex gap-3">
              {tutorialStep > 0 && (
                <button onClick={() => setTutorialStep(s => s-1)} className="p-4 bg-white border-4 border-black rounded-2xl active:scale-95"><ChevronLeft/></button>
              )}
              <button
                onClick={() => tutorialStep < passengerSteps.length - 1 ? setTutorialStep(s => s+1) : (onCloseTutorial && onCloseTutorial())}
                className="flex-1 bg-black text-white py-4 rounded-2xl font-black uppercase italic tracking-tighter border-2 border-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-1"
              >
                {tutorialStep < passengerSteps.length - 1 ? 'NEXT STEP' : 'SHO! I\'M READY'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isOnline && (
        <div className="bg-red-500 text-white p-3 rounded-2xl border-2 border-black text-center text-xs font-black uppercase animate-pulse">
          OFFLINE MODE - Your ping will be sent when back online
        </div>
      )}

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
              <button key={r.id} onClick={() => selectRouteFromBoard(r.originId, r.destinationId)} className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-black/10 flex justify-between items-center hover:bg-yellow-50 transition-all group">
                <div className="max-w-[70%] text-xs font-black italic uppercase text-left">
                  <div className="text-blue-500">FROM: {getRankName(r.originId)}</div>
                  <div className="text-gray-800">TO: {getRankName(r.destinationId)}</div>
                </div>
                <div className="text-right text-black font-black"><span className="text-[10px] italic">R</span><span className="text-xl">{r.price || 15}</span></div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-green-600 text-white p-6 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center border-2 border-yellow-400 overflow-hidden">
            {user.profileImage ? (
              <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <User className="text-yellow-400" size={28} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-yellow-300">Sho! {user.name ? user.name.split(' ')[0] : 'Malume'}!</h2>
            </div>
            <p className="text-green-100 text-[10px] font-black uppercase tracking-widest mt-1">Status: Scouting Fleet</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPriceBoard(true)} className="p-3 rounded-2xl border-2 border-black bg-green-700 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1">
            <Banknote size={20} />
          </button>
          <button data-testid="passenger-comms-btn" onClick={() => setShowComms(!showComms)} className={`p-3 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 transition-all ${showComms ? 'bg-yellow-400 text-black' : 'bg-green-700 text-white'}`}>
            <MessageCircle size={20} />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center px-2">
          <label className="text-[11px] font-black uppercase text-gray-500 tracking-[0.2em] flex items-center gap-2">
            <Navigation size={14} className="text-blue-500" /> LIVE NETWORK
          </label>
          <div className="flex items-center gap-2">
            <Activity size={14} className={trafficColor} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${trafficColor}`}>{trafficLevel} Traffic</span>
          </div>
        </div>
        <div className="relative rounded-[2.5rem] overflow-hidden border-4 border-black shadow-2xl h-64 z-10 bg-slate-100">
          <RouteMap originId={selectedRank} destinationId={destinationRank} userCoords={myCoords} activeRoutePath={activeRoute?.path} activePings={(isWaiting || isEnRoute) ? [{ id: 'me', passengerId: user.id, passengerName: user.name, isCustom: useMyLocation, customCoords: myCoords || undefined, timestamp: Date.now() }] : []} otherDrivers={otherDriversOnRoute} />
        </div>
        
        {/* OTHER TAXIS ON ROUTE */}
        {otherDriversOnRoute.length > 0 && showCompetingDrivers && (
          <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-1">
                <Car size={12} /> OTHER TAXIS NEARBY
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
        {calculatedETA !== null && (
          <div className="flex items-center justify-center gap-2 bg-black text-yellow-400 p-3 rounded-2xl border-2 border-white shadow-lg animate-bounce">
            <Clock size={16} />
            <span className="text-xs font-black uppercase tracking-widest">ESTIMATED ARRIVAL: {calculatedETA} MINS</span>
          </div>
        )}
      </div>

      {/* COMMS PANEL - Fixed overlay like driver dashboard */}
      {showComms && (
        <div className="bg-white p-6 rounded-[2.5rem] border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-top-4 fixed inset-x-5 top-24 bottom-24 z-[100] flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-black text-lg uppercase italic tracking-tighter flex items-center gap-2"><MessageCircle size={20} className="text-green-500" /> COMMS HUB</h3>
            <button onClick={() => setShowComms(false)} className="text-gray-400 hover:text-black"><X size={20}/></button>
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4">
            <button onClick={() => setChatChannel('DRIVERS')} className={`flex-1 px-3 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${chatChannel === 'DRIVERS' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>DRIVERS</button>
            <button onClick={() => setChatChannel('MARSHALS')} className={`flex-1 px-3 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${chatChannel === 'MARSHALS' ? 'bg-orange-600 text-white' : 'text-gray-400'}`}>MARSHALS</button>
            <button onClick={() => setChatChannel('PASSENGERS')} className={`flex-1 px-3 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${chatChannel === 'PASSENGERS' ? 'bg-green-600 text-white' : 'text-gray-400'}`}>PASSENGERS</button>
          </div>
          
          {/* Marshal Selection - show when in MARSHALS channel */}
          {chatChannel === 'MARSHALS' && marshalsAtRank.length > 0 && (
            <div className="bg-orange-50 p-4 rounded-2xl border-2 border-orange-200 mb-4">
              <p className="text-[10px] font-black uppercase text-orange-600 mb-2">Select Marshal to Contact:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedMarshalId('')}
                  className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase border-2 ${selectedMarshalId === '' ? 'bg-orange-500 text-white border-black' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  ALL MARSHALS
                </button>
                {marshalsAtRank.map(marshal => (
                  <button
                    key={marshal.id}
                    onClick={() => setSelectedMarshalId(marshal.id)}
                    className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase border-2 flex items-center gap-1 ${selectedMarshalId === marshal.id ? 'bg-orange-500 text-white border-black' : 'bg-white text-gray-600 border-gray-200'}`}
                  >
                    <User size={10} />
                    {marshal.name} ({marshal.rating}★)
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar mb-4 flex flex-col-reverse">
            {filteredMessages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <MessageCircle size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-[10px] font-black uppercase">No messages yet in {chatChannel}</p>
              </div>
            ) : (
              filteredMessages.slice().reverse().map(msg => (
                <div key={msg.id} className={`p-3 rounded-2xl border-2 ${msg.isAlert ? 'bg-red-50 border-red-500' : msg.senderId === user.id ? 'bg-green-50 border-green-200 ml-4' : 'bg-gray-50 border-black/5 mr-4'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-[8px] font-black uppercase tracking-widest ${msg.role === UserRole.DRIVER ? 'text-blue-600' : msg.role === UserRole.MARSHAL ? 'text-orange-600' : 'text-green-600'}`}>
                      {msg.senderName} {msg.rankTag ? `(@ ${msg.rankTag})` : ''} 
                      <span className="text-gray-400 ml-1">• {msg.role === UserRole.DRIVER ? 'DRIVER' : msg.role === UserRole.MARSHAL ? 'MARSHAL' : 'PASSENGER'}</span>
                    </span>
                    <span className="text-[7px] text-gray-400 font-bold">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="text-xs font-bold leading-tight">{msg.content}</p>
                  {/* Review buttons for drivers and marshals */}
                  {msg.role === UserRole.MARSHAL && onSubmitReview && msg.senderId !== user.id && (
                    <button 
                      onClick={() => { setReviewTarget({id: msg.senderId, name: msg.senderName, role: UserRole.MARSHAL}); setShowReviewModal(true); }}
                      className="text-[8px] font-black text-orange-500 uppercase mt-1 hover:underline"
                    >
                      Review Marshal →
                    </button>
                  )}
                  {msg.role === UserRole.DRIVER && onSubmitReview && msg.senderId !== user.id && (
                    <button 
                      onClick={() => { setReviewTarget({id: msg.senderId, name: msg.senderName, role: UserRole.DRIVER}); setShowReviewModal(true); }}
                      className="text-[8px] font-black text-blue-500 uppercase mt-1 hover:underline"
                    >
                      Review Driver →
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Chat Input */}
          {onSendMessage && (
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input 
                type="text" 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)} 
                placeholder={`Message ${chatChannel.toLowerCase()}...`} 
                className="flex-1 bg-gray-50 border-2 border-black rounded-xl px-4 py-2 font-black text-xs outline-none"
              />
              <button type="submit" className="bg-black text-white p-2 rounded-xl border-2 border-black active:scale-95"><Send size={18} /></button>
            </form>
          )}
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && reviewTarget && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[2rem] border-4 border-black shadow-[10px_10px_0_0_rgba(0,0,0,1)] p-6">
            <h3 className="font-black text-lg uppercase italic tracking-tighter mb-4">Leave Review for {reviewTarget.name}</h3>
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
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2">Comment</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="How was your experience?"
                  className="w-full p-4 bg-gray-50 border-2 border-black rounded-xl h-24 font-bold text-sm outline-none resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowReviewModal(false)} className="flex-1 py-3 rounded-xl font-black text-xs uppercase italic border-2 border-black">CANCEL</button>
                <button type="submit" className="flex-[2] bg-green-600 text-white py-3 rounded-xl font-black uppercase italic tracking-tighter border-2 border-black">SUBMIT REVIEW</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!isWaiting && !isEnRoute && (
        <div className="bg-white p-7 rounded-[3rem] border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] space-y-6">
          <button onClick={handleUseLocation} className={`w-full p-4 rounded-2xl border-2 border-black font-black text-[11px] flex items-center justify-center gap-3 transition-all ${useMyLocation ? 'bg-blue-500 text-white shadow-none translate-y-1' : 'bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]'}`}>
            <LocateFixed size={18} /> {useMyLocation ? 'GPS PIN ACTIVE' : 'USE MY LOCATION'}
          </button>
          <div className="space-y-4">
            {!useMyLocation && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block ml-1">FROM WHERE?</label>
                <div className="flex overflow-x-auto gap-1 no-scrollbar pb-1">
                  {categories.map(c => <button key={c} onClick={() => setOriginTab(c)} className={`flex-shrink-0 px-3 py-1.5 rounded-xl border-2 border-black text-[8px] font-black uppercase transition-all ${originTab === c ? 'bg-yellow-400 text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]' : 'bg-gray-50 text-gray-400'}`}>{c}</button>)}
                </div>
                <select value={selectedRank} onChange={(e) => setSelectedRank(e.target.value)} className="w-full p-4 bg-gray-50 border-4 border-black rounded-[1.5rem] font-black text-sm outline-none appearance-none">
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
                  <input type="text" value={customDestination} onChange={(e) => setCustomDestination(e.target.value)} placeholder="Type custom location..." className="w-full p-5 bg-gray-50 border-4 border-black rounded-[1.5rem] font-black text-sm outline-none shadow-[4px_4px_0_0_rgba(0,0,0,1)]" />
                  <Type size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-black/20" />
                </div>
              ) : (
                <>
                  <div className="flex overflow-x-auto gap-1 no-scrollbar pb-1">
                    {categories.map(c => <button key={c} onClick={() => setDestTab(c)} className={`flex-shrink-0 px-3 py-1.5 rounded-xl border-2 border-black text-[8px] font-black uppercase transition-all ${destTab === c ? 'bg-blue-400 text-white shadow-[2px_2px_0_0_rgba(0,0,0,1)]' : 'bg-gray-50 text-gray-400'}`}>{c}</button>)}
                  </div>
                  <select value={destinationRank} onChange={(e) => setDestinationRank(e.target.value)} className="w-full p-4 bg-gray-50 border-4 border-black rounded-[1.5rem] font-black text-sm outline-none appearance-none">
                    <option value="">RANK IN {destTab}...</option>
                    {filteredDestRanks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </>
              )}
            </div>
          </div>
          <button onClick={pingTaxi} disabled={!canPing} className={`w-full font-black py-5 rounded-[3rem] border-4 border-black transition-all ${canPing ? 'bg-yellow-400 text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)]' : 'bg-gray-200 text-gray-400 opacity-50 grayscale'}`}>
            <Bell size={24} fill="currentColor" /> PING JOZI NETWORK
          </button>
        </div>
      )}

      {isWaiting && (
        <div className="space-y-5 animate-in slide-in-from-bottom-6">
          <div className="bg-black text-white p-7 rounded-[3.5rem] border-4 border-blue-400 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-500 rounded-[1.8rem] flex items-center justify-center border-2 border-black animate-pulse"><Target className="text-white" size={32} /></div>
                <div>
                  <p className="font-black text-lg text-blue-400 uppercase italic tracking-tighter">FLEET SIGNALED</p>
                  <p className="text-[9px] font-black text-gray-400 uppercase mt-1">Status: Detected & Approaching</p>
                </div>
              </div>
            </div>
            
            {/* COMPETING DRIVERS */}
            {(() => {
              const acceptedCount = currentPingInfo?.acceptedBy?.length || 0;
              if (acceptedCount > 0) {
                return (
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/20">
                    <p className="text-[10px] font-black uppercase text-yellow-400 mb-2 flex items-center gap-1">
                      <Car size={12} /> {acceptedCount} DRIVER{acceptedCount > 1 ? 'S' : ''} ACCEPTED!
                    </p>
                    <div className="space-y-2">
                      {currentPingInfo?.acceptedDriverNames?.map((name, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white/10 p-2 rounded-xl">
                          <span className="text-xs font-black">{name}</span>
                          <span className="text-lg font-black text-green-400">R{currentPingInfo?.price || activeRoute?.price || 15}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] font-bold text-gray-400 mt-2">Choose your driver when they arrive!</p>
                  </div>
                );
              }
              return (
                <div className="bg-white/10 p-3 rounded-xl text-center">
                  <p className="text-[10px] font-black uppercase text-gray-400">Waiting for drivers to accept...</p>
                </div>
              );
            })()}
            
            <button onClick={() => { onConfirmPickup(currentPingId!); setIsWaiting(false); setIsEnRoute(true); }} className="w-full bg-green-600 text-white py-4 rounded-2xl border-2 border-black font-black uppercase italic tracking-tighter flex items-center justify-center gap-2">
              <UserCheck size={18} /> I'VE BEEN COLLECTED
            </button>
          </div>
          <button onClick={() => setIsWaiting(false)} className="w-full bg-red-50 text-red-600 font-black py-4 rounded-2xl border-2 border-red-200 uppercase tracking-widest text-[10px]">CANCEL REQUEST</button>
        </div>
      )}

      {isEnRoute && (
        <div className="space-y-5 animate-in slide-in-from-bottom-6">
          <div className="bg-black text-white p-7 rounded-[3.5rem] border-4 border-green-400 shadow-2xl space-y-6">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-green-500 rounded-[1.8rem] flex items-center justify-center border-2 border-black"><Car className="text-white" size={32} /></div>
                <div><p className="font-black text-lg text-green-400 uppercase italic tracking-tighter">JOURNEY LIVE</p><p className="text-[9px] font-black text-gray-400 uppercase mt-1">To: {getRankName(destinationRank)}</p></div>
              </div>
              <button onClick={handleArrival} className="w-full bg-green-600 text-white py-5 rounded-[2rem] border-2 border-black font-black uppercase italic tracking-tighter shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-1 flex items-center justify-center gap-3">
                <CheckCircle2 size={24} /> DELIVERED SAFE
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-black text-white p-8 rounded-[3.5rem] border-4 border-green-400 shadow-[12px_12px_0_0_rgba(0,0,0,1)] space-y-6">
        <div className="flex items-center gap-3 border-b-2 border-green-400/20 pb-4">
          <TrendingUp className="text-green-400" size={24} />
          <h3 className="text-xl font-black italic uppercase tracking-tighter">COMMUTER STATS</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-yellow-400/10 rounded-2xl flex items-center justify-center mx-auto border-2 border-yellow-400/30"><Star className="text-yellow-400" size={24} fill="currentColor" /></div>
            <p className="text-xl font-black">{user.averageRating?.toFixed(1) || '5.0'}</p>
            <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest">RATING</p>
          </div>
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-blue-400/10 rounded-2xl flex items-center justify-center mx-auto border-2 border-blue-400/30"><Car className="text-blue-400" size={24} /></div>
            <p className="text-xl font-black">{user.tripsCompleted || 0}</p>
            <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest">RIDES</p>
          </div>
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-green-400/10 rounded-2xl flex items-center justify-center mx-auto border-2 border-green-400/30"><Trophy className="text-green-400" size={24} /></div>
            <p className="text-xl font-black">{user.points}</p>
            <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest">POINTS</p>
          </div>
        </div>
      </div>

      <ReferralRewards userId={user.id} onReferral={() => addPoints(POINT_VALUES.AFFILIATE_SHARE)} />
    </div>
  );
};

export default React.memo(PassengerDashboard);
