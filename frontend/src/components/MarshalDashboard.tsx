import React, { useState, useMemo } from 'react';
import type { UserProfile, RankStatus, QueueCapacity, ChatMessage, RoutePath, Review } from '../types';
import { UserRole } from '../types';
import { TAXI_RANKS, POINT_VALUES } from '../constants';
import { MapPin, Star, Trophy, Activity, User, MessageCircle, Banknote, X, Search, Send } from 'lucide-react';
import RouteMap from './RouteMap';
import ReferralRewards from './ReferralRewards';

interface Props {
  user: UserProfile;
  addPoints: (amount: number) => void;
  routes: RoutePath[];
  onUpdateStatus: (status: RankStatus) => void;
  currentStatuses: Record<string, RankStatus>;
  onSendMessage: (content: string, routeId?: string, isAlert?: boolean, alertType?: ChatMessage['alertType'], channel?: ChatMessage['channel'], rankTag?: string) => void;
  isOnline?: boolean;
  messages?: ChatMessage[];
  onSubmitReview?: (review: Review) => void;
}

const MarshalDashboard: React.FC<Props> = ({
  user, addPoints, routes, onUpdateStatus, currentStatuses, onSendMessage, isOnline = true, messages = [], onSubmitReview
}) => {
  const [selectedRank, setSelectedRank] = useState('');
  const [capacity, setCapacity] = useState<QueueCapacity>('HALF_FULL');
  const [loadEstimate, setLoadEstimate] = useState(50);
  const [showPriceBoard, setShowPriceBoard] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatChannel, setChatChannel] = useState<'DRIVERS' | 'MARSHALS' | 'PASSENGERS'>('MARSHALS');
  const [priceSearch, setPriceSearch] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{id: string, name: string, role: typeof UserRole[keyof typeof UserRole]} | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const categories = ['CBD', 'Soweto', 'Alexandra', 'Greater Joburg', 'East Rand', 'West Rand', 'Northern Suburbs', 'Long Distance'];
  const [selectedCategory, setSelectedCategory] = useState('CBD');

  const getRankName = (id: string) => TAXI_RANKS.find(r => r.id === id)?.name || id;

  const filteredPriceRoutes = useMemo(() => {
    const search = priceSearch.toLowerCase();
    return routes.filter(r => {
      const originName = getRankName(r.originId).toLowerCase();
      const destName = getRankName(r.destinationId).toLowerCase();
      return originName.includes(search) || destName.includes(search);
    });
  }, [routes, priceSearch]);

  const filteredMessages = useMemo(() => {
    return messages.filter(m => m.channel === chatChannel);
  }, [messages, chatChannel]);

  const handleUpdatePrice = (routeId: string, _newPrice: number) => {
    // Marshals can update prices
    const route = routes.find(r => r.id === routeId);
    if (route) {
      addPoints(POINT_VALUES.SUBMIT_PRICE);
    }
  };

  const sendTextMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput, undefined, false, 'GENERAL', chatChannel);
    setChatInput('');
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget || !onSubmitReview) return;
    onSubmitReview({
      id: `review-${Date.now()}`,
      reviewerId: user.id,
      reviewerName: user.name,
      reviewerRole: UserRole.MARSHAL,
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

  const filteredRanks = useMemo(() => 
    TAXI_RANKS.filter(r => r.category === selectedCategory),
    [selectedCategory]
  );

  const handleUpdateStatus = () => {
    if (!selectedRank) return;
    
    const status: RankStatus = {
      rankId: selectedRank,
      capacity,
      lastUpdated: Date.now(),
      marshalName: user.name,
      loadEstimate
    };
    
    onUpdateStatus(status);
    
    // Send status update to MARSHALS channel
    const rankName = getRankName(selectedRank);
    const statusMessage = `📍 STATUS UPDATE: ${rankName} is now ${getCapacityLabel(capacity)} (${loadEstimate}% load)`;
    onSendMessage(statusMessage, undefined, false, 'GENERAL', 'MARSHALS', rankName);
    
    addPoints(POINT_VALUES.MARSHAL_POST_STATUS);
    alert('Rank status updated! +30 points earned.');
  };

  const getCapacityColor = (cap: QueueCapacity) => {
    switch (cap) {
      case 'EMPTY': return 'bg-green-500';
      case 'MOVING': return 'bg-green-400';
      case 'HALF_FULL': return 'bg-yellow-400';
      case 'FULL_HOUSE': return 'bg-orange-500';
      case 'OVERFLOWING': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getCapacityLabel = (cap: QueueCapacity) => {
    switch (cap) {
      case 'EMPTY': return 'EMPTY';
      case 'MOVING': return 'MOVING';
      case 'HALF_FULL': return 'HALF';
      case 'FULL_HOUSE': return 'FULL';
      case 'OVERFLOWING': return 'OVER';
      default: return cap;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {!isOnline && (
        <div className="bg-red-500 text-white p-3 rounded-2xl border-2 border-black text-center text-xs font-black uppercase animate-pulse">
          OFFLINE MODE - Status updates will sync when back online
        </div>
      )}

      <div className="bg-orange-600 text-white p-6 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center border-2 border-yellow-400 overflow-hidden">
            {user.profileImage ? (
              <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <User className="text-yellow-400" size={28} />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-yellow-300">Sho! Marshal {user.name}!</h2>
            <p className="text-orange-100 text-[10px] font-black uppercase tracking-widest mt-1">Rank Controller</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPriceBoard(true)} className="p-3 rounded-2xl border-2 border-black bg-orange-700 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1">
            <Banknote size={20} />
          </button>
          <button data-testid="marshal-comms-btn" onClick={() => setShowChat(!showChat)} className={`p-3 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 transition-all ${showChat ? 'bg-yellow-400 text-black' : 'bg-orange-700 text-white'}`}>
            <MessageCircle size={20} />
          </button>
        </div>
      </div>

      {/* Map Section */}
      <div className="bg-white rounded-[2.5rem] border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] overflow-hidden relative z-10">
        <div className="p-4 border-b-4 border-black bg-orange-50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            <p className="text-sm font-black uppercase tracking-tighter italic text-black">JOZI LIVE NETWORK</p>
          </div>
        </div>
        <div className="h-48 relative">
          <RouteMap 
            otherDrivers={[]}
          />
        </div>
      </div>

      <div className="bg-black text-white p-6 rounded-[3rem] border-4 border-orange-500 shadow-[12px_12px_0_0_rgba(0,0,0,1)] grid grid-cols-3 gap-4">
        <div className="text-center space-y-1">
          <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center mx-auto border border-orange-500/30">
            <Star className="text-orange-500" size={18} />
          </div>
          <p className="text-lg font-black">{user.averageRating?.toFixed(1) || '5.0'}</p>
          <p className="text-[7px] font-black uppercase text-gray-500 tracking-widest">RATING</p>
        </div>
        <div className="text-center space-y-1">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center mx-auto border border-yellow-500/30">
            <Activity className="text-yellow-500" size={18} />
          </div>
          <p className="text-lg font-black">{Object.keys(currentStatuses).length}</p>
          <p className="text-[7px] font-black uppercase text-gray-500 tracking-widest">UPDATES</p>
        </div>
        <div className="text-center space-y-1">
          <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto border border-green-500/30">
            <Trophy className="text-green-500" size={18} />
          </div>
          <p className="text-lg font-black">{user.points}</p>
          <p className="text-[7px] font-black uppercase text-gray-500 tracking-widest">POINTS</p>
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
            <h3 className="font-black text-lg uppercase italic tracking-tighter flex items-center gap-2"><MessageCircle size={20} className="text-orange-500" /> COMMS HUB</h3>
            <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-black"><X size={20}/></button>
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4">
            <button onClick={() => setChatChannel('DRIVERS')} className={`flex-1 px-3 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${chatChannel === 'DRIVERS' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>DRIVERS</button>
            <button onClick={() => setChatChannel('MARSHALS')} className={`flex-1 px-3 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${chatChannel === 'MARSHALS' ? 'bg-orange-600 text-white' : 'text-gray-400'}`}>MARSHALS</button>
            <button onClick={() => setChatChannel('PASSENGERS')} className={`flex-1 px-3 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${chatChannel === 'PASSENGERS' ? 'bg-green-600 text-white' : 'text-gray-400'}`}>PASSENGERS</button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar mb-4 flex flex-col-reverse">
            {filteredMessages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <MessageCircle size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-[10px] font-black uppercase">No messages yet in {chatChannel}</p>
              </div>
            ) : (
              filteredMessages.slice().reverse().map(msg => (
                <div key={msg.id} className={`p-3 rounded-2xl border-2 ${msg.isAlert ? 'bg-red-50 border-red-500' : msg.senderId === user.id ? 'bg-orange-50 border-orange-200 ml-4' : 'bg-gray-50 border-black/5 mr-4'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-[8px] font-black uppercase tracking-widest ${msg.role === UserRole.DRIVER ? 'text-blue-600' : msg.role === UserRole.MARSHAL ? 'text-orange-600' : 'text-green-600'}`}>
                      {msg.senderName} {msg.rankTag ? `(@ ${msg.rankTag})` : ''}
                      <span className="text-gray-400 ml-1">• {msg.role === UserRole.DRIVER ? 'DRIVER' : msg.role === UserRole.MARSHAL ? 'MARSHAL' : 'PASSENGER'}</span>
                    </span>
                    <span className="text-[7px] text-gray-400 font-bold">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="text-xs font-bold leading-tight">{msg.content}</p>
                  {/* Review button for passengers */}
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

      <div className="bg-white p-6 rounded-[3rem] border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-xl border-2 border-black">
            <MapPin className="text-white" size={20} />
          </div>
          <h3 className="text-xl font-black italic uppercase tracking-tighter">UPDATE RANK STATUS</h3>
        </div>

        <div className="flex overflow-x-auto gap-1 no-scrollbar pb-1">
          {categories.map(c => (
            <button 
              key={c} 
              onClick={() => setSelectedCategory(c)} 
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl border-2 border-black text-[8px] font-black uppercase transition-all ${selectedCategory === c ? 'bg-orange-500 text-white shadow-[2px_2px_0_0_rgba(0,0,0,1)]' : 'bg-gray-50 text-gray-400'}`}
            >
              {c}
            </button>
          ))}
        </div>

        <select 
          value={selectedRank} 
          onChange={(e) => setSelectedRank(e.target.value)} 
          className="w-full p-4 bg-gray-50 border-4 border-black rounded-[1.5rem] font-black text-sm outline-none appearance-none"
        >
          <option value="">SELECT RANK IN {selectedCategory}...</option>
          {filteredRanks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">QUEUE CAPACITY</label>
          <div className="grid grid-cols-5 gap-1">
            {(['EMPTY', 'MOVING', 'HALF_FULL', 'FULL_HOUSE', 'OVERFLOWING'] as QueueCapacity[]).map(cap => (
              <button
                key={cap}
                onClick={() => setCapacity(cap)}
                className={`p-2 rounded-xl border-2 border-black text-[6px] font-black uppercase transition-all leading-tight ${capacity === cap ? 'bg-orange-500 text-white shadow-[2px_2px_0_0_rgba(0,0,0,1)]' : 'bg-gray-50 text-gray-400'}`}
              >
                {getCapacityLabel(cap)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex justify-between">
            <span>LOAD ESTIMATE</span>
            <span>{loadEstimate}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={loadEstimate}
            onChange={(e) => setLoadEstimate(parseInt(e.target.value))}
            className="w-full h-4 bg-gray-200 rounded-full appearance-none cursor-pointer accent-orange-500"
          />
        </div>

        <button 
          onClick={handleUpdateStatus}
          disabled={!selectedRank}
          className={`w-full font-black py-4 rounded-[2rem] border-4 border-black transition-all ${selectedRank ? 'bg-orange-500 text-white shadow-[6px_6px_0_0_rgba(0,0,0,1)]' : 'bg-gray-200 text-gray-400 opacity-50 cursor-not-allowed'}`}
        >
          UPDATE STATUS +30 PTS
        </button>
      </div>

      {Object.keys(currentStatuses).length > 0 && (
        <div className="space-y-4">
          <h3 className="font-black text-black flex items-center gap-3 px-3 text-lg uppercase tracking-tighter italic">
            <Activity className="text-orange-500" /> LIVE RANK STATUS
          </h3>
          <div className="space-y-3">
            {Object.values(currentStatuses).map(status => {
              const rank = TAXI_RANKS.find(r => r.id === status.rankId);
              if (!rank) return null;
              return (
                <div key={status.rankId} className="bg-white p-4 rounded-2xl border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black uppercase italic">{rank.name}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Updated by {status.marshalName}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase text-white ${getCapacityColor(status.capacity)}`}>
                    {getCapacityLabel(status.capacity)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Referral Rewards Section */}
      <ReferralRewards userId={user.id} onReferral={() => addPoints(POINT_VALUES.AFFILIATE_SHARE)} />

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
                <button type="submit" className="flex-1 py-3 rounded-xl border-2 border-black font-black uppercase text-xs bg-orange-500 text-white shadow-[3px_3px_0_0_rgba(0,0,0,1)]">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(MarshalDashboard);
