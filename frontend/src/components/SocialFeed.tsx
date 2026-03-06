import React, { useState, useRef, useEffect } from 'react';
import type { UserProfile, SocialPost } from '../types';
import { useContentModeration } from '../hooks/useContentModeration';
import { Send, User as UserIcon, MessageSquare, ThumbsUp, Shield, Sparkles, Image as ImageIcon, X, AlertTriangle, CornerDownRight, Mic, Square } from 'lucide-react';

interface Props {
  user: UserProfile;
  addPoints: (amount: number) => void;
  posts: SocialPost[];
  onLikePost: (postId: string) => void;
  onReplyPost: (postId: string, content: string) => void;
  onCreatePost: (content: string, isAnonymous: boolean, image?: string, voiceNote?: string) => void;
}

const SocialFeed: React.FC<Props> = ({ user, addPoints, posts, onLikePost, onReplyPost, onCreatePost }) => {
  const [newPost, setNewPost] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [moderationWarning, setModerationWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const { containsLinks } = useContentModeration();

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
    // Check if MediaRecorder is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Voice recording is not supported in this browser. Please use Chrome, Firefox, or Safari.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Check supported MIME types
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else {
          mimeType = '';
        }
      }
      
      const mediaRecorder = mimeType 
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      const audioChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: mimeType || 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setVoiceNote(audioUrl);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      
      // Set recording state AFTER successful start
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch {
      alert('Could not access microphone. Please allow microphone access in your browser settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const removeVoiceNote = () => {
    setVoiceNote(null);
    setRecordingTime(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() && !selectedImage && !voiceNote) return;
    
    if (containsLinks(newPost)) {
      setModerationWarning('Links are not allowed in posts!');
      setTimeout(() => setModerationWarning(null), 3000);
      return;
    }
    
    // Create post with voice note if available
    onCreatePost(newPost, isAnonymous, selectedImage || undefined, voiceNote || undefined);
    setNewPost('');
    setSelectedImage(null);
    setVoiceNote(null);
    setIsAnonymous(false);
    addPoints(10);
  };

  const submitReply = (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    
    if (containsLinks(replyText)) {
      setModerationWarning('Links are not allowed in replies!');
      setTimeout(() => setModerationWarning(null), 3000);
      return;
    }
    
    onReplyPost(postId, replyText);
    setReplyText('');
    setReplyingTo(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {moderationWarning && (
        <div className="bg-red-500 text-white p-4 rounded-2xl border-2 border-black text-center text-sm font-black uppercase animate-pulse flex items-center justify-center gap-2">
          <AlertTriangle size={20} />
          {moderationWarning}
        </div>
      )}

      <div className="bg-yellow-400 p-6 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black relative overflow-hidden">
        <Sparkles className="absolute -right-4 -top-4 text-black/10 w-24 h-24 rotate-12" />
        <div className="relative z-10 text-center">
          <p className="text-black font-black text-[10px] uppercase tracking-[0.25em] mb-1">SA&apos;S #1 TAXI NETWORK</p>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter flex items-center justify-center gap-3">
            THE TAVERN <MessageSquare size={24} />
          </h2>
          <p className="text-black/70 font-black text-[9px] uppercase tracking-[0.2em]">Real-time Jozi Taxi Gossip</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[3rem] border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] space-y-4">
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="Ask about a route or rank... share the gossip! (No links allowed)"
          className="w-full p-5 bg-gray-50 border-4 border-black rounded-[2rem] font-bold focus:ring-4 ring-yellow-400/20 outline-none resize-none h-28 text-sm"
        />
        
        {containsLinks(newPost) && (
          <div className="bg-red-50 border-2 border-red-400 p-3 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold">
            <AlertTriangle size={16} />
            Links are not allowed in posts!
          </div>
        )}

        {selectedImage && (
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-black mb-2">
            <img src={selectedImage} alt="Selected" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}
        
        {voiceNote && (
          <div className="relative p-4 bg-blue-50 border-2 border-blue-400 rounded-2xl mb-2 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <Mic size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-blue-700">VOICE NOTE RECORDED</p>
              <audio src={voiceNote} controls className="w-full h-8 mt-1" />
            </div>
            <button
              type="button"
              onClick={removeVoiceNote}
              className="bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}
        
        {isRecording && (
          <div className="p-4 bg-red-50 border-2 border-red-400 rounded-2xl mb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-black text-red-600">RECORDING... {recordingTime}s</span>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="bg-red-500 text-white px-4 py-2 rounded-xl font-black text-xs uppercase flex items-center gap-2"
            >
              <Square size={14} /> STOP
            </button>
          </div>
        )}
        
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 border-black transition-all font-black text-[10px] uppercase tracking-widest
                ${isAnonymous ? 'bg-black text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              <Shield size={14} /> Anonymous
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-black transition-all font-black text-[10px] uppercase tracking-widest bg-white text-gray-500 hover:text-blue-600 hover:bg-gray-50"
            >
              <ImageIcon size={14} /> Photo
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
            <button
              data-testid="voice-note-btn"
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!!voiceNote}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 border-black transition-all font-black text-[10px] uppercase tracking-widest
                ${isRecording ? 'bg-red-500 text-white' : voiceNote ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-500 hover:text-red-600 hover:bg-gray-50'}`}
            >
              <Mic size={14} /> {isRecording ? 'Recording...' : 'Voice'}
            </button>
          </div>
          <button
            type="submit"
            disabled={containsLinks(newPost)}
            className="flex-1 bg-black text-white py-3.5 rounded-full font-black flex items-center justify-center gap-3 hover:bg-gray-800 active:scale-95 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] border-2 border-white/20 uppercase italic tracking-tighter min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            POST <Send size={18} />
          </button>
        </div>
      </form>

      <div className="space-y-5">
        {posts.map(post => (
          <div key={post.id} className={`bg-white rounded-[2.5rem] border-4 p-6 shadow-sm transition-all ${post.type === 'TAXI_WASH' ? 'border-blue-500 shadow-[6px_6px_0_0_rgba(59,130,246,0.1)]' : 'border-black/5 hover:border-black/10'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-2xl border-2 border-black/10 ${post.isAnonymous ? 'bg-gray-100 text-gray-400' : 'bg-yellow-100 text-yellow-600'}`}>
                  <UserIcon size={18} />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-gray-400 block leading-none">{post.author}</span>
                  <span className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">{new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}</span>
                </div>
              </div>
              {post.type === 'TAXI_WASH' && (
                <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase italic tracking-tighter flex items-center gap-1 border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                  <Sparkles size={10} /> FRESH WASH
                </div>
              )}
            </div>
            <p className="font-black text-lg text-gray-800 mb-4 leading-tight italic tracking-tight">&quot;{post.content}&quot;</p>
            {post.voiceNote && (
              <div className="mb-5 p-4 bg-blue-50 border-2 border-blue-400 rounded-2xl flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                  <Mic size={22} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase text-blue-700 mb-1">VOICE NOTE</p>
                  <audio src={post.voiceNote} controls className="w-full h-10" />
                </div>
              </div>
            )}
            {post.type === 'TAXI_WASH' && post.washPhotos && (
              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="aspect-square rounded-xl overflow-hidden border-2 border-black/5"><img src={post.washPhotos.front} className="w-full h-full object-cover grayscale" /></div>
                <div className="aspect-square rounded-xl overflow-hidden border-2 border-black/5"><img src={post.washPhotos.back} className="w-full h-full object-cover grayscale" /></div>
                <div className="aspect-square rounded-xl overflow-hidden border-2 border-black/5"><img src={post.washPhotos.side} className="w-full h-full object-cover grayscale" /></div>
              </div>
            )}
            {post.image && !post.type && (
              <div className="mb-5 rounded-2xl overflow-hidden border-2 border-black/5 aspect-video">
                <img src={post.image} alt="Post content" className="w-full h-full object-cover" />
              </div>
            )}
            {post.replies && post.replies.length > 0 && (
              <div className="mt-4 mb-4 ml-6 space-y-3 border-l-2 border-gray-100 pl-4">
                {post.replies.map(reply => (
                  <div key={reply.id} className="bg-gray-50 p-3 rounded-2xl border border-black/5">
                    <div className="flex items-center gap-2 mb-1">
                      <CornerDownRight size={12} className="text-gray-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">{reply.author}</span>
                    </div>
                    <p className="text-xs font-bold leading-tight">{reply.content}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-5 border-t-2 border-gray-50 pt-4">
              <button
                onClick={() => onLikePost(post.id)}
                className={`flex items-center gap-2 transition-colors ${post.likedBy.includes(user.id) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
              >
                <ThumbsUp size={18} fill={post.likedBy.includes(user.id) ? 'currentColor' : 'none'} />
                <span className="text-[11px] font-black uppercase tracking-widest">{post.likes}</span>
              </button>
              <button
                onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                className={`flex items-center gap-2 transition-colors ${replyingTo === post.id ? 'text-black' : 'text-gray-400 hover:text-black'}`}
              >
                <MessageSquare size={18} />
                <span className="text-[11px] font-black uppercase tracking-widest">{post.replies.length}</span>
              </button>
            </div>
            {replyingTo === post.id && (
              <form onSubmit={(e) => submitReply(e, post.id)} className="mt-4 flex gap-2 animate-in slide-in-from-top-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply... (no links)"
                  className="flex-1 bg-gray-50 border-2 border-black rounded-xl px-4 py-2 font-black text-[11px] outline-none"
                />
                <button type="submit" className="bg-black text-white p-2 rounded-xl border-2 border-black active:scale-95"><Send size={16} /></button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(SocialFeed);
