import React, { useState } from 'react';
import type { UserProfile, Suggestion, FAQ, RoutePath } from '../types';
import { UserRole } from '../types';
import { TAXI_RANKS } from '../constants';
import { X, Send, HelpCircle, Sparkles, Banknote, TrendingUp, MessageCircle, CheckCircle2, Star } from 'lucide-react';

interface Props {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  suggestions: Suggestion[];
  faqs: FAQ[];
  routes: RoutePath[];
  onSubmitSuggestion: (suggestion: Partial<Suggestion>) => void;
  onAnswerFAQ: (faqId: string, answer: string, priceUpdate?: { routeId: string; newPrice: number }) => void;
  onSubmitQuestion?: (question: string, questionType: 'TEMPLATE' | 'CUSTOM', routeInfo?: { originId: string; destinationId: string }) => void;
  onVerifyAnswer?: (faqId: string, isCorrect: boolean, corrections?: string, priceUpdate?: { routeId: string; newPrice: number }) => void;
}

const FeedbackHub: React.FC<Props> = ({ user, isOpen, onClose, suggestions, faqs, routes, onSubmitSuggestion, onAnswerFAQ, onSubmitQuestion, onVerifyAnswer }) => {
  const [activeTab, setActiveTab] = useState<'SUGGEST' | 'QUESTIONS'>('SUGGEST');
  const [suggestionText, setSuggestionText] = useState('');
  const [suggestionType, setSuggestionType] = useState<'IMPROVE' | 'REMOVE'>('IMPROVE');
  const [selectedFAQ, setSelectedFAQ] = useState<string | null>(null);
  const [faqAnswerText, setFaqAnswerText] = useState('');
  const [selectedRouteForPrice, setSelectedRouteForPrice] = useState<string>('');
  const [priceUpdateValue, setPriceUpdateValue] = useState<string>('');
  
  // Question submission states
  const [questionType, setQuestionType] = useState<'TEMPLATE' | 'CUSTOM'>('TEMPLATE');
  const [customQuestion, setCustomQuestion] = useState('');
  const [questionOrigin, setQuestionOrigin] = useState('');
  const [questionDestination, setQuestionDestination] = useState('');
  const [questionOriginTab, setQuestionOriginTab] = useState('CBD');
  const [questionDestTab, setQuestionDestTab] = useState('CBD');
  
  // Verification states
  const [verifyingFAQ, setVerifyingFAQ] = useState<string | null>(null);
  const [verificationCorrections, setVerificationCorrections] = useState('');
  
  const categories = ['CBD', 'Soweto', 'Alexandra', 'Greater Joburg', 'East Rand', 'West Rand', 'Northern Suburbs', 'Long Distance'];
  const filteredOriginRanks = TAXI_RANKS.filter(r => r.category === questionOriginTab);
  const filteredDestRanks = TAXI_RANKS.filter(r => r.category === questionDestTab);

  if (!isOpen) return null;

  const handleSubmitSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionText.trim()) return;
    onSubmitSuggestion({
      content: suggestionText,
      type: suggestionType
    });
    setSuggestionText('');
    alert("Sharp! 50 Points awarded for your feedback. We're on it.");
  };

  const handleFAQSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqAnswerText.trim() || !selectedFAQ) return;
    
    const priceUpdate = selectedRouteForPrice && priceUpdateValue 
      ? { routeId: selectedRouteForPrice, newPrice: parseInt(priceUpdateValue) }
      : undefined;
    
    onAnswerFAQ(selectedFAQ, faqAnswerText, priceUpdate);
    setFaqAnswerText('');
    setSelectedFAQ(null);
    setSelectedRouteForPrice('');
    setPriceUpdateValue('');
    alert("Sharp! 25 Points awarded for answering!");
  };

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (questionType === 'TEMPLATE') {
      if (!questionOrigin || !questionDestination) return;
      const originName = TAXI_RANKS.find(r => r.id === questionOrigin)?.name || questionOrigin;
      const destName = TAXI_RANKS.find(r => r.id === questionDestination)?.name || questionDestination;
      const questionText = `How much is the fare from ${originName} to ${destName}?`;
      onSubmitQuestion?.(questionText, 'TEMPLATE', { originId: questionOrigin, destinationId: questionDestination });
    } else {
      if (!customQuestion.trim()) return;
      onSubmitQuestion?.(customQuestion, 'CUSTOM');
    }
    setCustomQuestion('');
    setQuestionOrigin('');
    setQuestionDestination('');
    alert("Sharp! 15 Points awarded for asking a question!");
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingFAQ) return;
    
    const priceUpdate = selectedRouteForPrice && priceUpdateValue 
      ? { routeId: selectedRouteForPrice, newPrice: parseInt(priceUpdateValue) }
      : undefined;
    
    const isCorrect = !verificationCorrections.trim();
    onVerifyAnswer?.(verifyingFAQ, isCorrect, verificationCorrections || undefined, priceUpdate);
    setVerifyingFAQ(null);
    setVerificationCorrections('');
    setSelectedRouteForPrice('');
    setPriceUpdateValue('');
    alert(isCorrect ? "Sharp! 50 Points for first verification!" : "Sharp! 10 Points for verification with corrections!");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col animate-in fade-in duration-300">
      <header className="p-6 bg-yellow-400 border-b-4 border-black flex justify-between items-center shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-black text-yellow-400 p-1.5 rounded-lg font-black italic text-xl shadow-[3px_3px_0_0_rgba(0,0,0,1)]">B</div>
          <h2 className="text-2xl font-black tracking-tighter text-black uppercase italic">BHUBEZI BACKEND</h2>
        </div>
        <button onClick={onClose} className="bg-white p-2 rounded-xl border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:scale-90"><X size={24}/></button>
      </header>
      
      <div className="p-4 flex gap-2">
        <button onClick={() => setActiveTab('SUGGEST')} className={`flex-1 py-3 rounded-2xl font-black uppercase italic border-2 border-black transition-all ${activeTab === 'SUGGEST' ? 'bg-yellow-400 text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]' : 'bg-black text-white'}`}>SUGGESTIONS</button>
        <button onClick={() => setActiveTab('QUESTIONS')} className={`flex-1 py-3 rounded-2xl font-black uppercase italic border-2 border-black transition-all ${activeTab === 'QUESTIONS' ? 'bg-yellow-400 text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]' : 'bg-black text-white'}`}>COMMUNITY QUESTIONS</button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {activeTab === 'SUGGEST' ? (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[2.5rem] border-4 border-black shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
              <h3 className="font-black text-lg uppercase italic tracking-tighter mb-4 flex items-center gap-2"><Sparkles className="text-yellow-500"/> FEEDBACK SYSTEM</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Help us make Bhubezi better</p>
              <form onSubmit={handleSubmitSuggestion} className="space-y-4">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSuggestionType('IMPROVE')} className={`flex-1 py-2 rounded-xl font-black text-[10px] border-2 border-black ${suggestionType === 'IMPROVE' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>IMPROVE</button>
                  <button type="button" onClick={() => setSuggestionType('REMOVE')} className={`flex-1 py-2 rounded-xl font-black text-[10px] border-2 border-black ${suggestionType === 'REMOVE' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'}`}>REMOVE</button>
                </div>
                <textarea
                  value={suggestionText}
                  onChange={(e) => setSuggestionText(e.target.value)}
                  placeholder="What should we change? Be honest, skhokho."
                  className="w-full p-4 bg-gray-50 border-2 border-black rounded-xl h-24 font-bold text-sm outline-none resize-none"
                />
                <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-black uppercase italic tracking-tighter flex items-center justify-center gap-2">
                  SUBMIT FEEDBACK <Send size={18}/>
                </button>
              </form>
            </div>
            <div className="space-y-4">
              <h4 className="font-black text-[10px] uppercase text-gray-400 tracking-widest px-2">RECENT COMMUNITY FEEDBACK</h4>
              {suggestions.map(s => (
                <div key={s.id} className="p-4 bg-white/5 border-2 border-white/20 rounded-2xl">
                  <div className="flex justify-between mb-2">
                    <span className="text-[9px] font-black text-yellow-400 uppercase tracking-widest">{s.userName}</span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-black ${s.type === 'IMPROVE' ? 'bg-green-500' : 'bg-red-500'}`}>{s.type}</span>
                  </div>
                  <p className="text-xs text-white/80 font-bold italic">"{s.content}"</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* PASSENGER QUESTION SUBMISSION */}
            {user.role === UserRole.PASSENGER && (
              <div className="bg-white p-6 rounded-[2.5rem] border-4 border-black shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
                <h3 className="font-black text-lg uppercase italic tracking-tighter mb-4 flex items-center gap-2"><MessageCircle className="text-green-500"/> ASK A QUESTION</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase leading-tight mb-4">Ask about fares or routes and earn 15 PTS!</p>
                
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setQuestionType('TEMPLATE')} className={`flex-1 py-2 rounded-xl font-black text-[10px] border-2 border-black ${questionType === 'TEMPLATE' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>ROUTE PRICE</button>
                  <button onClick={() => setQuestionType('CUSTOM')} className={`flex-1 py-2 rounded-xl font-black text-[10px] border-2 border-black ${questionType === 'CUSTOM' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>CUSTOM QUESTION</button>
                </div>
                
                <form onSubmit={handleQuestionSubmit} className="space-y-4">
                  {questionType === 'TEMPLATE' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2">FROM RANK</label>
                        <div className="flex overflow-x-auto gap-1 no-scrollbar pb-1">
                          {categories.map(c => <button key={c} onClick={() => setQuestionOriginTab(c)} className={`flex-shrink-0 px-3 py-1.5 rounded-xl border-2 border-black text-[8px] font-black uppercase transition-all ${questionOriginTab === c ? 'bg-yellow-400 text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]' : 'bg-gray-50 text-gray-400'}`}>{c}</button>)}
                        </div>
                        <select value={questionOrigin} onChange={(e) => setQuestionOrigin(e.target.value)} className="w-full p-3 bg-gray-50 border-2 border-black rounded-xl font-black text-sm outline-none mt-2">
                          <option value="">Select origin rank...</option>
                          {filteredOriginRanks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2">TO RANK</label>
                        <div className="flex overflow-x-auto gap-1 no-scrollbar pb-1">
                          {categories.map(c => <button key={c} onClick={() => setQuestionDestTab(c)} className={`flex-shrink-0 px-3 py-1.5 rounded-xl border-2 border-black text-[8px] font-black uppercase transition-all ${questionDestTab === c ? 'bg-blue-400 text-white shadow-[2px_2px_0_0_rgba(0,0,0,1)]' : 'bg-gray-50 text-gray-400'}`}>{c}</button>)}
                        </div>
                        <select value={questionDestination} onChange={(e) => setQuestionDestination(e.target.value)} className="w-full p-3 bg-gray-50 border-2 border-black rounded-xl font-black text-sm outline-none mt-2">
                          <option value="">Select destination rank...</option>
                          {filteredDestRanks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <textarea
                      value={customQuestion}
                      onChange={(e) => setCustomQuestion(e.target.value)}
                      placeholder="Type your question here... (e.g., What time do taxis stop running?)"
                      className="w-full p-4 bg-gray-50 border-2 border-black rounded-xl h-24 font-bold text-sm outline-none resize-none"
                    />
                  )}
                  <button type="submit" disabled={questionType === 'TEMPLATE' ? (!questionOrigin || !questionDestination) : !customQuestion.trim()} className="w-full bg-green-600 text-white py-4 rounded-xl font-black uppercase italic tracking-tighter border-2 border-black disabled:opacity-50 disabled:cursor-not-allowed">
                    SUBMIT QUESTION +15 PTS
                  </button>
                </form>
              </div>
            )}
            
            <div className="bg-white p-6 rounded-[2.5rem] border-4 border-black shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
              <h3 className="font-black text-lg uppercase italic tracking-tighter mb-4 flex items-center gap-2"><HelpCircle className="text-blue-500"/> COMMUNITY QUESTIONS</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase leading-tight mb-4">
                {user.role === UserRole.PASSENGER 
                  ? 'See answers from expert drivers and marshals.' 
                  : 'Answer questions (+25 PTS) or verify answers (1st: +50 PTS, others: +10 PTS)'}
              </p>
              
              {/* ANSWER FORM FOR DRIVERS/MARSHALS */}
              {user.role !== UserRole.PASSENGER && selectedFAQ ? (
                <form onSubmit={handleFAQSubmit} className="space-y-4 animate-in slide-in-from-top-4">
                  <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-xs font-black italic">&quot;{faqs.find(f => f.id === selectedFAQ)?.question}&quot;</div>
                  <textarea
                    value={faqAnswerText}
                    onChange={(e) => setFaqAnswerText(e.target.value)}
                    placeholder="Type your expert answer..."
                    className="w-full p-4 bg-gray-50 border-2 border-black rounded-xl h-24 font-bold text-sm outline-none resize-none"
                  />
                  <div className="bg-yellow-50 p-4 rounded-xl border-2 border-yellow-200 space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-yellow-700">
                      <Banknote size={14} />
                      <span>Update Price Board (Optional)</span>
                    </div>
                    <select
                      value={selectedRouteForPrice}
                      onChange={(e) => setSelectedRouteForPrice(e.target.value)}
                      className="w-full p-3 bg-white border-2 border-black rounded-xl font-bold text-xs outline-none"
                    >
                      <option value="">Select route to update price...</option>
                      {routes.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.originId === 'my-location' ? 'My Location' : r.originId} → {r.destinationId === 'custom' ? r.customDestinationName : r.destinationId} (R{r.price})
                        </option>
                      ))}
                    </select>
                    {selectedRouteForPrice && (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black">R</span>
                        <input
                          type="number"
                          value={priceUpdateValue}
                          onChange={(e) => setPriceUpdateValue(e.target.value)}
                          placeholder="New price"
                          className="flex-1 p-3 bg-white border-2 border-black rounded-xl font-black text-sm outline-none"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => {setSelectedFAQ(null); setSelectedRouteForPrice(''); setPriceUpdateValue('');}} className="flex-1 py-3 rounded-xl font-black text-xs uppercase italic border-2 border-black">CANCEL</button>
                    <button type="submit" className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-black uppercase italic tracking-tighter border-2 border-black flex items-center justify-center gap-2">
                      <TrendingUp size={16} /> POST ANSWER +25 PTS
                    </button>
                  </div>
                </form>
              ) : user.role !== UserRole.PASSENGER && verifyingFAQ ? (
                /* VERIFICATION FORM */
                <form onSubmit={handleVerify} className="space-y-4 animate-in slide-in-from-top-4">
                  <div className="p-3 bg-orange-50 border-2 border-orange-200 rounded-xl">
                    <p className="text-xs font-black italic">&quot;{faqs.find(f => f.id === verifyingFAQ)?.question}&quot;</p>
                    <p className="text-[10px] font-bold text-gray-500 mt-2">Answer: {faqs.find(f => f.id === verifyingFAQ)?.answer}</p>
                  </div>
                  <textarea
                    value={verificationCorrections}
                    onChange={(e) => setVerificationCorrections(e.target.value)}
                    placeholder="If answer needs corrections, type them here. Leave empty if correct."
                    className="w-full p-4 bg-gray-50 border-2 border-black rounded-xl h-24 font-bold text-sm outline-none resize-none"
                  />
                  <div className="bg-yellow-50 p-4 rounded-xl border-2 border-yellow-200 space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-yellow-700">
                      <Banknote size={14} />
                      <span>Update Price Board if needed</span>
                    </div>
                    <select
                      value={selectedRouteForPrice}
                      onChange={(e) => setSelectedRouteForPrice(e.target.value)}
                      className="w-full p-3 bg-white border-2 border-black rounded-xl font-bold text-xs outline-none"
                    >
                      <option value="">Select route...</option>
                      {routes.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.originId === 'my-location' ? 'My Location' : r.originId} → {r.destinationId === 'custom' ? r.customDestinationName : r.destinationId} (R{r.price})
                        </option>
                      ))}
                    </select>
                    {selectedRouteForPrice && (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black">R</span>
                        <input
                          type="number"
                          value={priceUpdateValue}
                          onChange={(e) => setPriceUpdateValue(e.target.value)}
                          placeholder="Correct price"
                          className="flex-1 p-3 bg-white border-2 border-black rounded-xl font-black text-sm outline-none"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => {setVerifyingFAQ(null); setVerificationCorrections('');}} className="flex-1 py-3 rounded-xl font-black text-xs uppercase italic border-2 border-black">CANCEL</button>
                    <button type="submit" className="flex-[2] bg-orange-600 text-white py-3 rounded-xl font-black uppercase italic tracking-tighter border-2 border-black flex items-center justify-center gap-2">
                      <CheckCircle2 size={16} /> VERIFY ANSWER
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  {faqs.map(f => (
                    <div key={f.id} className="p-4 bg-gray-50 rounded-2xl border-2 border-black/5 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <p className="text-xs font-black italic">Q: {f.question}</p>
                        {f.verifiedBy && f.verifiedBy.length > 0 && (
                          <div className="flex items-center gap-1 text-[9px] font-black text-green-600">
                            <Star size={10} fill="currentColor" />
                            {f.verifiedBy.length} verify
                          </div>
                        )}
                      </div>
                      {f.answer ? (
                        <div className="p-3 bg-green-50 border-2 border-green-200 rounded-xl text-[10px] font-bold">
                          <span className="text-green-600 font-black uppercase block mb-1">Answer from {f.answeredBy}:</span>
                          {f.answer}
                          {/* VERIFICATION BUTTON FOR DRIVERS/MARSHALS */}
                          {user.role !== UserRole.PASSENGER && !f.verifiedBy?.includes(user.id) && (
                            <button 
                              onClick={() => setVerifyingFAQ(f.id)} 
                              className="mt-2 text-[9px] font-black text-orange-600 uppercase italic hover:underline flex items-center gap-1"
                            >
                              <CheckCircle2 size={10} /> Verify & Earn Points →
                            </button>
                          )}
                        </div>
                      ) : (
                        user.role !== UserRole.PASSENGER && (
                          <button onClick={() => setSelectedFAQ(f.id)} className="text-[10px] font-black text-blue-600 uppercase italic self-end hover:underline">Answer & Score +25 PTS →</button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackHub;
