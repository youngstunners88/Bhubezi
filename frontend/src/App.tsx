import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { UserProfile, ActivePing, RoutePath, RankStatus, DriverStatus, ChatMessage, SocialPost, Suggestion, FAQ, LogEntry, UserRoleType, Review, MarshalInfo } from './types';
import { UserRole, OnboardingStatus } from './types';
import { TAXI_RANKS, INITIAL_ROUTES, POINT_VALUES, BIBLE_VERSES } from './constants';
import DriverDashboard from './components/DriverDashboard';
import PassengerDashboard from './components/PassengerDashboard';
import SocialFeed from './components/SocialFeed';
import Leaderboard from './components/Leaderboard';
import MarshalDashboard from './components/MarshalDashboard';
import OnboardingFlow from './components/Onboarding/OnboardingFlow';
import FeedbackHub from './components/FeedbackHub';
import SuspensionModal from './components/SuspensionModal';
import GeoTrackingModal from './components/GeoTrackingModal';
import { MapPin, MessageSquare, Trophy, SwitchCamera, ShieldAlert, Sparkles, X, History, HelpCircle } from 'lucide-react';
import { useContentModeration } from './hooks/useContentModeration';
import { useOfflineStorage } from './hooks/useOfflineStorage';
import { useGeolocation } from './hooks/useGeolocation';

// Static data - defined outside component to prevent recreation on every render
const INITIAL_OTHER_DRIVERS: { id: string; name: string; coords: {x: number, y: number} }[] = [
  { id: 'driver_1', name: 'Baba Joe', coords: { x: 30, y: 45 } },
  { id: 'driver_2', name: 'Sis Thuli', coords: { x: 55, y: 60 } },
  { id: 'driver_3', name: 'Malume John', coords: { x: 70, y: 35 } },
];

const INITIAL_MARSHALS: MarshalInfo[] = [
  { id: 'marshal_1', name: 'Baba Joe', rankId: 'bree', rankName: 'Bree Street', rating: 4.8, isOnline: true },
  { id: 'marshal_2', name: 'Sis Thuli', rankId: 'bree', rankName: 'Bree Street', rating: 4.9, isOnline: true },
  { id: 'marshal_3', name: 'Malume John', rankId: 'noord', rankName: 'Noord Street', rating: 4.7, isOnline: true },
  { id: 'marshal_4', name: 'Bra Peter', rankId: 'park', rankName: 'Park Station', rating: 4.6, isOnline: false },
];

const INITIAL_SUGGESTIONS: Suggestion[] = [
  { id: '1', userId: 'system', userName: 'Bhubezi Bot', content: 'We need a dark mode for night trips!', type: 'IMPROVE', timestamp: Date.now() }
];

const INITIAL_FAQS: FAQ[] = [
  { id: '1', question: 'How much is the fare from Bree to Bara?', timestamp: Date.now(), verifiedBy: [], verificationCount: 0 },
  { id: '2', question: 'Where is the best rank for Soweto taxis?', answer: 'Noord is best for Soweto, boss. Always moving.', answeredBy: 'Baba Joe', timestamp: Date.now(), verifiedBy: [], verificationCount: 0 }
];

const INITIAL_POSTS: SocialPost[] = [
  {
    id: '1',
    author: 'JoziKing',
    authorId: 'u_jk',
    content: 'Bree Rank is moving sharp today! No queues for Bara.',
    isAnonymous: false,
    timestamp: Date.now() - 1800000,
    likes: 24,
    likedBy: [],
    replies: [{ id: 'r1', author: 'Bhubezi Bot', authorId: 'bot', content: 'Sharp! Keep it moving, Boss.', timestamp: Date.now() - 1500000 }]
  }
];

const App: React.FC = () => {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [role, setRole] = useState<UserRoleType>(UserRole.PASSENGER);
  const [errorFlash, setErrorFlash] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [showGeoModal, setShowGeoModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  const { moderateContent, getSuspensionEndDate } = useContentModeration();
  const { isOnline, pendingCount, queueAction, saveOfflineData } = useOfflineStorage();
  const { startTracking, stopTracking, isTracking } = useGeolocation();

  const [user, setUser] = useState<UserProfile>({
    id: 'user_' + uuidv4().slice(0, 8), // SECURITY FIX: Using uuid instead of Math.random()
    name: '',
    role: UserRole.PASSENGER,
    points: 0,
    rankTitle: 'New Scout',
    isVerified: false,
    warningCount: 0,
    isBanned: false,
    onboardingStatus: OnboardingStatus.NOT_STARTED,
    approvingDrivers: [],
    onboardingDate: Date.now(),
    tripsCompleted: 0,
    averageRating: 5.0,
    monthlyLogs: [],
    currentStreak: 0,
    lastActiveDate: '',
    geoTrackingEnabled: false
  });

  const [activeTab, setActiveTab] = useState<'home' | 'social' | 'leaderboard' | 'security'>('home');
  const [showFeedbackHub, setShowFeedbackHub] = useState(false);
  const [routes, setRoutes] = useState<RoutePath[]>(INITIAL_ROUTES);
  const [activePings, setActivePings] = useState<ActivePing[]>([]);
  const [globalDriverStatus, setGlobalDriverStatus] = useState<DriverStatus | null>(null);
  const [otherDriversOnRoute] = useState(INITIAL_OTHER_DRIVERS);
  const [marshals] = useState(INITIAL_MARSHALS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [rankStatuses, setRankStatuses] = useState<Record<string, RankStatus>>({});
  const [_reviews, setReviews] = useState<Review[]>([]);
  
  const [suggestions, setSuggestions] = useState<Suggestion[]>(INITIAL_SUGGESTIONS);
  const [faqs, setFaqs] = useState<FAQ[]>(INITIAL_FAQS);
  const [posts, setPosts] = useState<SocialPost[]>(INITIAL_POSTS);
  
  const [_marshalsPendingApproval, setMarshalsPendingApproval] = useState<UserProfile[]>([]);

  // Save offline data when routes change
  useEffect(() => {
    saveOfflineData({ routes, ranks: TAXI_RANKS, lastSync: Date.now() });
  }, [routes, saveOfflineData]);

  // Streak Logic
  useEffect(() => {
    if (isOnboarded) {
      const today = new Date().toISOString().split('T')[0];
      const lastActive = user.lastActiveDate;
      if (lastActive !== today) {
        let newStreak = 1;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        if (lastActive === yesterdayStr) {
          newStreak = (user.currentStreak || 0) + 1;
        }
        setUser(prev => ({
          ...prev,
          currentStreak: newStreak,
          lastActiveDate: today
        }));
        if (newStreak >= 3) {
          const bonus = (newStreak - 2) * POINT_VALUES.DAILY_STREAK_BONUS;
          addLog(`Daily Streak Bonus (${newStreak} Days!)`, bonus);
        }
      }
    }
  }, [isOnboarded, user.lastActiveDate, user.currentStreak]);

  // Check if user is suspended
  useEffect(() => {
    if (user.suspensionEndDate && user.suspensionEndDate > Date.now()) {
      setShowSuspensionModal(true);
    }
  }, [user.suspensionEndDate]);

  const triggerError = (msg: string) => {
    setErrorFlash(true);
    alert(msg);
    setTimeout(() => setErrorFlash(false), 600);
  };

  const addLog = (action: string, points: number) => {
    const entry: LogEntry = {
      id: uuidv4().slice(0, 9), // SECURITY FIX: Using uuid instead of Math.random()
      action,
      timestamp: Date.now(),
      pointsEarned: points
    };
    setUser(prev => ({
      ...prev,
      points: prev.points + points,
      monthlyLogs: [entry, ...(prev.monthlyLogs || [])].slice(0, 50)
    }));
  };

  const addPoints = (amount: number) => {
    let finalAmount = amount;
    if (user.currentStreak && user.currentStreak >= 3) {
      const streakBonus = (user.currentStreak - 2) * POINT_VALUES.DAILY_STREAK_BONUS;
      finalAmount += streakBonus;
    }
    addLog('Activity Points', finalAmount);
  };

  const handleUpdateRoute = (updatedRoute: RoutePath) => {
    setRoutes(prev => prev.map(r => r.id === updatedRoute.id ? updatedRoute : r));
  };

  const handleOnboardingComplete = (onboardedUser: Partial<UserProfile>) => {
    const newUser = {
      ...user,
      ...onboardedUser,
      id: 'user_' + uuidv4().slice(0, 8), // SECURITY FIX: Using uuid instead of Math.random()
      isVerified: onboardedUser.role === UserRole.DRIVER,
      onboardingStatus: onboardedUser.onboardingStatus!,
      role: onboardedUser.role!,
      onboardingDate: Date.now(),
      approvingDrivers: [],
      tripsCompleted: 0,
      averageRating: 5.0,
      monthlyLogs: [{ id: 'init', action: 'Account Verified in Jozi Network', timestamp: Date.now(), pointsEarned: 0 }],
      currentStreak: 1,
      lastActiveDate: new Date().toISOString().split('T')[0]
    };
    setUser(newUser);
    setRole(onboardedUser.role!);
    setIsOnboarded(true);
    setShowTutorial(true);
    if (onboardedUser.role === UserRole.MARSHAL) {
      setMarshalsPendingApproval(prev => [...prev, newUser]);
    }
  };

  const incrementTrips = () => {
    setUser(prev => ({ ...prev, tripsCompleted: (prev.tripsCompleted || 0) + 1 }));
    addPoints(20);
  };

  const handleApproveMarshal = (marshalId: string) => {
    setMarshalsPendingApproval(prev => prev.map(m => {
      if (m.id === marshalId && !m.approvingDrivers?.includes(user.id)) {
        const drivers = [...(m.approvingDrivers || []), user.id];
        if (drivers.length <= 3) {
          addPoints(POINT_VALUES.MARSHAL_APPROVE_LEGIT);
        }
        return { ...m, approvingDrivers: drivers };
      }
      return m;
    }));
    alert("Marshal Approved! You helped keep the rank safe.");
  };

  const handleUploadWash = (photos: { front: string, back: string, side: string }) => {
    const washPost: SocialPost = {
      id: 'wash_' + Date.now(),
      author: user.name,
      authorId: user.id,
      content: "Just finished washing my traansie! Keeping it clean for the passengers.",
      isAnonymous: false,
      timestamp: Date.now(),
      likes: 0,
      likedBy: [],
      replies: [],
      type: 'TAXI_WASH',
      washPhotos: photos
    };
    setPosts([washPost, ...posts]);
    addPoints(POINT_VALUES.TAXI_WASH_UPLOAD);
  };

  const handleLikePost = (postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId && !p.likedBy.includes(user.id)) {
        return { ...p, likes: p.likes + 1, likedBy: [...p.likedBy, user.id] };
      }
      return p;
    }));
    addPoints(1);
  };

  const handleReplyPost = (postId: string, content: string) => {
    const moderation = moderateContent(content);
    if (!moderation.isAllowed) {
      if (moderation.action === 'suspend') {
        setUser(prev => ({
          ...prev,
          isBanned: true,
          suspensionEndDate: getSuspensionEndDate(),
          suspensionReason: moderation.reason
        }));
        setShowSuspensionModal(true);
        return;
      }
      alert(moderation.reason);
      return;
    }

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const newReply = {
          id: 'reply_' + Date.now(),
          author: user.name,
          authorId: user.id,
          content,
          timestamp: Date.now()
        };
        return { ...p, replies: [...p.replies, newReply] };
      }
      return p;
    }));
    addPoints(5);
  };

  const handleSendMessage = (content: string, routeId?: string, isAlert: boolean = false, alertType: ChatMessage['alertType'] = 'GENERAL', channel: ChatMessage['channel'] = 'PASSENGERS', rankTag?: string) => {
    if (user.isBanned) return;
    
    const moderation = moderateContent(content);
    if (!moderation.isAllowed) {
      if (moderation.action === 'suspend') {
        setUser(prev => ({
          ...prev,
          isBanned: true,
          suspensionEndDate: getSuspensionEndDate(),
          suspensionReason: moderation.reason
        }));
        setShowSuspensionModal(true);
        return;
      }
      alert(moderation.reason);
      return;
    }

    const newMessage: ChatMessage = {
      id: uuidv4().slice(0, 9), // SECURITY FIX: Using uuid instead of Math.random()
      senderId: user.id,
      senderName: user.name,
      role: user.role,
      content,
      timestamp: Date.now(),
      channel,
      rankTag,
      routeId,
      isAlert,
      alertType
    };

    if (!isOnline) {
      queueAction({ type: 'message', data: newMessage });
    }

    setChatMessages(prev => [newMessage, ...prev].slice(0, 50));
  };

  const handleUpdateRankStatus = (status: RankStatus) => {
    const rank = TAXI_RANKS.find(r => r.id === status.rankId);
    if (!rank) return;
    setRankStatuses(prev => ({ ...prev, [status.rankId]: status }));
    addPoints(POINT_VALUES.MARSHAL_POST_STATUS);
  };

  const handleAddPing = (ping: ActivePing) => {
    if (!isOnline) {
      queueAction({ type: 'ping', data: ping });
    }
    // Add destination and price to ping
    const enrichedPing = {
      ...ping,
      destinationId: '', // Will be set by passenger
      price: undefined,
      acceptedBy: [],
      acceptedDriverNames: []
    };
    setActivePings(prev => [enrichedPing, ...prev].slice(0, 10));
    addPoints(POINT_VALUES.PASSENGER_PING);
  };

  const handleAcceptPing = (pingId: string, driverId: string, driverName: string, price: number) => {
    setActivePings(prev => prev.map(p => {
      if (p.id === pingId) {
        return {
          ...p,
          acceptedBy: [...(p.acceptedBy || []), driverId],
          acceptedDriverNames: [...(p.acceptedDriverNames || []), driverName],
          price: p.price || price
        };
      }
      return p;
    }));
  };

  const handleConfirmPickup = useCallback((pingId: string, userRole: UserRoleType) => {
    setActivePings(prev => prev.filter(p => p.id !== pingId));
    if (userRole === UserRole.PASSENGER) {
      addPoints(POINT_VALUES.PASSENGER_CONFIRM_PICKUP);
    } else if (userRole === UserRole.DRIVER) {
      addPoints(POINT_VALUES.DRIVER_CONFIRM_PICKUP);
    }
  }, [addPoints]);

  const handleConfirmDelivery = () => {
    if (user.role === UserRole.PASSENGER) {
      addPoints(POINT_VALUES.PASSENGER_DELIVERY_CONFIRM);
      setUser(prev => ({ ...prev, tripsCompleted: (prev.tripsCompleted || 0) + 1 }));
    }
  };

  const handleSubmitSuggestion = (s: Partial<Suggestion>) => {
    const newSug: Suggestion = {
      id: uuidv4().slice(0, 5),
      userId: user.id,
      userName: user.name,
      content: s.content!,
      type: s.type!,
      timestamp: Date.now()
    };
    setSuggestions([newSug, ...suggestions]);
    addPoints(POINT_VALUES.SUBMIT_SUGGESTION);
  };

  const handleSubmitReview = (review: Omit<Review, 'id' | 'timestamp'>) => {
    const newReview: Review = {
      ...review,
      id: 'review_' + Date.now(),
      timestamp: Date.now()
    };
    setReviews(prev => [newReview, ...prev]);
    addPoints(15);
  };

  const handleAnswerFAQ = (id: string, answer: string, priceUpdate?: { routeId: string; newPrice: number }) => {
    setFaqs(prev => prev.map(f => {
      if (f.id === id) {
        return { ...f, answer, answeredBy: user.name, priceUpdate, verifiedBy: [user.id], verificationCount: 1 };
      }
      return f;
    }));
    
    // Auto-update price board if price update is provided
    if (priceUpdate) {
      setRoutes(prev => prev.map(r => {
        if (r.id === priceUpdate.routeId) {
          return { ...r, price: priceUpdate.newPrice, lastUpdatedBy: `${user.role} ${user.name}` };
        }
        return r;
      }));
    }
    
    addPoints(POINT_VALUES.ANSWER_FAQ);
  };

  const handleSubmitQuestion = (question: string, questionType: 'TEMPLATE' | 'CUSTOM', routeInfo?: { originId: string; destinationId: string }) => {
    const newFAQ: FAQ = {
      id: 'faq_' + Date.now(),
      question,
      timestamp: Date.now(),
      verifiedBy: [],
      verificationCount: 0,
      questionType,
      routeInfo
    };
    setFaqs(prev => [newFAQ, ...prev]);
    addPoints(15);
  };

  const handleVerifyAnswer = (faqId: string, _isCorrect: boolean, corrections?: string, priceUpdate?: { routeId: string; newPrice: number }) => {
    // _isCorrect parameter kept for API compatibility but not used in current implementation
    setFaqs(prev => prev.map(f => {
      if (f.id === faqId) {
        const currentVerified = f.verifiedBy || [];
        
        // Update answer if corrections provided
        const updatedAnswer = corrections ? `${f.answer}\n\n[Correction by ${user.name}]: ${corrections}` : f.answer;
        
        return { 
          ...f, 
          answer: updatedAnswer,
          verifiedBy: [...currentVerified, user.id],
          verificationCount: (f.verificationCount || 0) + 1
        };
      }
      return f;
    }));
    
    // Auto-update price board if price update is provided
    if (priceUpdate) {
      setRoutes(prev => prev.map(r => {
        if (r.id === priceUpdate.routeId) {
          return { ...r, price: priceUpdate.newPrice, lastUpdatedBy: `${user.role} ${user.name}` };
        }
        return r;
      }));
    }
    
    // First verifier gets 50 points, subsequent get 10
    const faq = faqs.find(f => f.id === faqId);
    const isFirstVerifier = !faq?.verifiedBy || faq.verifiedBy.length === 0;
    addPoints(isFirstVerifier ? 50 : 10);
  };

  const handleCreatePost = (content: string, isAnonymous: boolean, image?: string, voiceNote?: string) => {
    const moderation = moderateContent(content);
    if (!moderation.isAllowed) {
      if (moderation.action === 'suspend') {
        setUser(prev => ({
          ...prev,
          isBanned: true,
          suspensionEndDate: getSuspensionEndDate(),
          suspensionReason: moderation.reason
        }));
        setShowSuspensionModal(true);
        return;
      }
      alert(moderation.reason);
      return;
    }

    const newPost: SocialPost = {
      id: 'post_' + Date.now(),
      author: isAnonymous ? 'Anonymous' : user.name,
      authorId: user.id,
      content,
      isAnonymous,
      timestamp: Date.now(),
      likes: 0,
      likedBy: [],
      replies: [],
      image,
      voiceNote
    };

    setPosts([newPost, ...posts]);
    addPoints(10);
  };

  const handleEnableGeoTracking = useCallback(() => {
    const success = startTracking();
    if (success) {
      setUser(prev => ({ ...prev, geoTrackingEnabled: true }));
      setShowGeoModal(false);
    }
  }, [startTracking]);

  const handleDisableGeoTracking = useCallback(() => {
    stopTracking();
    setUser(prev => ({ ...prev, geoTrackingEnabled: false }));
  }, [stopTracking]);

  const handleCloseTutorial = useCallback(() => {
    setShowTutorial(false);
  }, []);

  if (!isOnboarded) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        if (role === UserRole.DRIVER) {
          return (
            <DriverDashboard
              user={user}
              pings={activePings}
              addPoints={addPoints}
              routes={routes}
              onUpdateRoute={handleUpdateRoute}
              onConfirmPickup={(id) => handleConfirmPickup(id, UserRole.DRIVER)}
              onLocationUpdate={() => {}}
              onStatusUpdate={setGlobalDriverStatus}
              onTripComplete={incrementTrips}
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              onUploadWash={handleUploadWash}
              onApproveMarshal={handleApproveMarshal}
              showTutorial={showTutorial}
              onCloseTutorial={handleCloseTutorial}
              isOnline={isOnline}
              otherDriversOnRoute={otherDriversOnRoute}
              onAcceptPing={handleAcceptPing}
              onSubmitReview={handleSubmitReview}
            />
          );
        } else if (role === UserRole.MARSHAL) {
          return (
            <MarshalDashboard
              user={user}
              addPoints={addPoints}
              routes={routes}
              onUpdateStatus={handleUpdateRankStatus}
              currentStatuses={rankStatuses}
              onSendMessage={handleSendMessage}
              isOnline={isOnline}
              messages={chatMessages}
              onSubmitReview={handleSubmitReview}
            />
          );
        } else {
          return (
            <PassengerDashboard
              user={user}
              addPoints={addPoints}
              routes={routes}
              onPing={handleAddPing}
              onConfirmPickup={(id) => handleConfirmPickup(id, UserRole.PASSENGER)}
              onConfirmDelivery={handleConfirmDelivery}
              rankStatuses={rankStatuses}
              heroDriverStatus={globalDriverStatus}
              onCheatingDetected={() => triggerError("Warning: Check Location Consistency.")}
              showTutorial={showTutorial}
              onCloseTutorial={handleCloseTutorial}
              isOnline={isOnline}
              marshals={marshals}
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              onSubmitReview={handleSubmitReview}
              activePings={activePings}
              otherDriversOnRoute={otherDriversOnRoute}
            />
          );
        }
      case 'social':
        return (
          <SocialFeed 
            user={user} 
            addPoints={addPoints} 
            posts={posts} 
            onLikePost={handleLikePost} 
            onReplyPost={handleReplyPost}
            onCreatePost={handleCreatePost}
          />
        );
      case 'leaderboard':
        return <Leaderboard user={user} />;
      default:
        return null;
    }
  };

  // SECURITY NOTE: Math.random() is acceptable here for non-cryptographic UI randomization (Bible verse selection)
  const randomVerse = BIBLE_VERSES[Math.floor(Math.random() * BIBLE_VERSES.length)];

  return (
    <div className={`min-h-screen bg-[#f0f0f0] flex flex-col max-w-md mx-auto relative border-x-4 border-black shadow-[20px_0_60px_rgba(0,0,0,1)] overflow-hidden font-sans ${errorFlash ? 'animate-flash-red' : ''}`}>
      {showSuspensionModal && (
        <SuspensionModal 
          user={user} 
          onClose={() => setShowSuspensionModal(false)} 
        />
      )}

      {showGeoModal && (
        <GeoTrackingModal 
          onEnable={handleEnableGeoTracking}
          onCancel={() => setShowGeoModal(false)}
        />
      )}

      <header className="bg-yellow-400 p-5 shadow-md flex justify-between items-center sticky top-0 z-50 border-b-4 border-black">
        <button onClick={() => setShowFeedbackHub(true)} className="flex items-center gap-3 active:scale-95 transition-transform group">
          <div className="bg-black text-yellow-400 p-1.5 rounded-lg font-black italic text-2xl shadow-[3px_3px_0_0_rgba(0,0,0,1)] group-hover:bg-yellow-500 group-hover:text-black transition-all">B</div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-black uppercase italic">BHUBEZI</h1>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => isTracking ? handleDisableGeoTracking() : setShowGeoModal(true)}
            className={`p-2 rounded-xl border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:scale-95 transition-all ${isTracking ? 'bg-green-500 text-white' : 'bg-white text-gray-600'}`}
          >
            <MapPin size={18} />
          </button>
          
          <button
            onClick={() => {
              if (activeTab === 'home') {
                setShowTutorial(true);
              } else {
                setShowHelpModal(true);
              }
            }}
            className="bg-white p-2 rounded-xl border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:scale-95 text-black hover:bg-yellow-50"
          >
            <HelpCircle size={20} />
          </button>
          <button
            onClick={() => setShowStatsModal(true)}
            className="bg-black text-white px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 border-2 border-white shadow-lg active:scale-90"
          >
            <Trophy size={14} className="text-yellow-400" />
            {user.points}
          </button>
          <button
            onClick={() => setIsOnboarded(false)}
            className="bg-white p-2 rounded-xl border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:scale-95 transition-all flex items-center gap-1"
          >
            <SwitchCamera size={20} className="text-black" />
          </button>
        </div>
      </header>

      {!isOnline && pendingCount > 0 && (
        <div className="bg-orange-500 text-white px-4 py-2 text-center text-xs font-black uppercase animate-pulse">
          {pendingCount} action{pendingCount > 1 ? 's' : ''} queued for sync
        </div>
      )}

      {isTracking && (
        <div className="bg-green-500 text-white px-4 py-1 text-center text-[10px] font-black uppercase flex items-center justify-center gap-2">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          GPS Tracking Active
        </div>
      )}

      {showStatsModal && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in-95">
          <div className="bg-white w-full max-w-sm rounded-[3rem] border-4 border-black overflow-hidden flex flex-col max-h-[80vh] shadow-[15px_15px_0_0_rgba(0,0,0,1)]">
            <div className="bg-yellow-400 p-6 border-b-4 border-black flex justify-between items-center">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">MONTHLY RECORD</h2>
              <button onClick={() => setShowStatsModal(false)} className="bg-black text-white p-2 rounded-xl border-2 border-white"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {user.currentStreak && user.currentStreak >= 3 && (
                <div className="bg-green-100 border-2 border-green-600 p-4 rounded-2xl flex items-center gap-3">
                  <Sparkles className="text-green-600" />
                  <div>
                    <p className="text-xs font-black uppercase">STREAK ACTIVE: {user.currentStreak} DAYS</p>
                    <p className="text-[10px] font-bold text-green-700">Points are compounding! (+{(user.currentStreak-2)*10} BONUS)</p>
                  </div>
                </div>
              )}
              {user.monthlyLogs?.length ? user.monthlyLogs.map(log => (
                <div key={log.id} className="p-4 bg-gray-50 border-2 border-black/5 rounded-2xl flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-800">{log.action}</p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><History size={8} /> {new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="text-green-600 font-black text-sm">+{log.pointsEarned}</div>
                </div>
              )) : <p className="text-center text-xs font-bold text-gray-400 py-10 uppercase italic tracking-widest">No service record yet.</p>}
            </div>
            <div className="p-8 bg-green-50 border-t-4 border-black text-center space-y-3">
              <Sparkles className="text-yellow-500 mx-auto" size={24} />
              <p className="text-xs font-black italic tracking-tight text-green-900 leading-relaxed px-4">
                "{randomVerse}"
              </p>
              <p className="text-[9px] font-bold uppercase text-green-700/60">A message of grace for your service</p>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-24 p-5 no-scrollbar">
        {user.role === UserRole.MARSHAL && (user.approvingDrivers?.length || 0) < 3 && (
          <div className="mb-4 bg-orange-600 border-4 border-black p-4 rounded-3xl flex items-center gap-4 text-white shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
            <ShieldAlert size={28} className="shrink-0 animate-pulse" />
            <div className="text-xs font-black uppercase">
              <p>LEGITIMACY PENDING</p>
              <p className="opacity-70 mt-0.5 leading-tight">Need {3 - (user.approvingDrivers?.length || 0)} more driver approvals.</p>
            </div>
          </div>
        )}
        {renderContent()}
      </main>

      <FeedbackHub
        user={user}
        isOpen={showFeedbackHub}
        onClose={() => setShowFeedbackHub(false)}
        suggestions={suggestions}
        faqs={faqs}
        routes={routes}
        onSubmitSuggestion={handleSubmitSuggestion}
        onAnswerFAQ={handleAnswerFAQ}
        onSubmitQuestion={handleSubmitQuestion}
        onVerifyAnswer={handleVerifyAnswer}
      />

      {/* Global Help Modal for Tavern and Ranks */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in-95">
          <div className="bg-white w-full max-w-sm rounded-[3rem] border-4 border-black overflow-hidden flex flex-col max-h-[80vh] shadow-[15px_15px_0_0_rgba(0,0,0,1)]">
            <div className="bg-yellow-400 p-6 border-b-4 border-black flex justify-between items-center">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">HELP</h2>
              <button onClick={() => setShowHelpModal(false)} className="bg-black text-white p-2 rounded-xl border-2 border-white"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {activeTab === 'social' && (
                <>
                  <div className="bg-yellow-50 p-4 rounded-2xl border-2 border-yellow-300">
                    <h3 className="font-black text-sm uppercase mb-2">TAVERN - Community Hub</h3>
                    <ul className="text-xs font-bold space-y-2 text-gray-700">
                      <li>• Share updates with the Jozi taxi community</li>
                      <li>• Post text, images, or voice notes</li>
                      <li>• Like and reply to other posts</li>
                      <li>• Use Anonymous mode for privacy</li>
                      <li>• Earn 10 points per post!</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-300">
                    <h3 className="font-black text-sm uppercase mb-2">Voice Notes</h3>
                    <ul className="text-xs font-bold space-y-2 text-gray-700">
                      <li>• Click the Voice button to start recording</li>
                      <li>• Click STOP when done</li>
                      <li>• Everyone can listen to your voice note!</li>
                    </ul>
                  </div>
                </>
              )}
              {activeTab === 'leaderboard' && (
                <>
                  <div className="bg-yellow-50 p-4 rounded-2xl border-2 border-yellow-300">
                    <h3 className="font-black text-sm uppercase mb-2">RANKS - Leaderboard</h3>
                    <ul className="text-xs font-bold space-y-2 text-gray-700">
                      <li>• See top contributors in the Jozi Network</li>
                      <li>• Compete for the highest points</li>
                      <li>• Rankings update in real-time</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 p-4 rounded-2xl border-2 border-green-300">
                    <h3 className="font-black text-sm uppercase mb-2">How to Earn Points</h3>
                    <ul className="text-xs font-bold space-y-2 text-gray-700">
                      <li>• Update rank status: +30 pts</li>
                      <li>• Submit price updates: +15 pts</li>
                      <li>• Post in Tavern: +10 pts</li>
                      <li>• Leave reviews: +10 pts</li>
                      <li>• Complete trips: +20 pts</li>
                    </ul>
                  </div>
                </>
              )}
              <button 
                onClick={() => setShowHelpModal(false)}
                className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase text-sm border-2 border-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
              >
                GOT IT!
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t-4 border-black flex justify-around p-4 z-50">
        {[
          { id: 'home', icon: MapPin, label: 'MAPS' },
          { id: 'social', icon: MessageSquare, label: 'TAVERN' },
          { id: 'leaderboard', icon: Trophy, label: 'RANKS' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center gap-1 transition-all transform ${activeTab === tab.id ? 'text-yellow-600 scale-110' : 'text-gray-400'}`}
          >
            <tab.icon size={26} strokeWidth={activeTab === tab.id ? 3 : 2} />
            <span className="text-[10px] font-black tracking-widest uppercase">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
