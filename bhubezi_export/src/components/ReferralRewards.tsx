import React from 'react';
import { Share2, Twitter, MessageCircle, Copy } from 'lucide-react';
import { POINT_VALUES } from '../constants';

interface Props {
  userId: string;
  onReferral: () => void;
}

const ReferralRewards: React.FC<Props> = ({ userId, onReferral }) => {
  const referralLink = `https://bhubez.co.za/ref/${userId}`;
  
  const brandedMessage = `BHUBEZI - Jozi's #1 Taxi Network\n\nJoin me on Bhubezi and track routes live. Score rewards for every trip! ${referralLink}\n\nSharp!`;

  const handleShare = async (platform: string) => {
    const encodedMsg = encodeURIComponent(brandedMessage);
    
    if (platform === 'Native' && navigator.share) {
      try {
        await navigator.share({
          title: 'BHUBEZI - Jozi\'s #1 Taxi Network',
          text: brandedMessage,
          url: referralLink
        });
        onReferral();
      } catch (err) {
        console.log('Share cancelled');
      }
      return;
    }

    if (platform === 'Twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodedMsg}`, '_blank');
    } else if (platform === 'WhatsApp') {
      // Use wa.me which works better across devices
      window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
    } else if (platform === 'SMS') {
      window.location.href = `sms:?body=${encodedMsg}`;
    }
    
    onReferral();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(brandedMessage);
    alert('Invite text copied! Paste it to your status or stories.');
    onReferral();
  };

  return (
    <div className="bg-white p-8 rounded-[3.5rem] border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] mt-12 space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-yellow-400 p-2 rounded-xl border-2 border-black">
          <Share2 size={24} />
        </div>
        <div>
          <h4 className="text-xl font-black italic uppercase tracking-tighter leading-none">REFERRAL REWARDS</h4>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">BHUBEZI NETWORK GROWTH</p>
        </div>
      </div>
      <p className="text-xs font-bold text-gray-700 leading-tight">
        Tell Jozi how cool it is to use <span className="bg-black text-yellow-400 px-1 font-black">BHUBEZI</span>. Score <span className="text-yellow-600 font-black">+{POINT_VALUES.AFFILIATE_SHARE} POINTS</span> per signup!
      </p>
      
      {/* Native Share Button (works best on mobile) */}
      {'share' in navigator && (
        <button
          onClick={() => handleShare('Native')}
          className="w-full bg-yellow-400 py-4 rounded-2xl border-4 border-black font-black uppercase text-sm flex items-center justify-center gap-2 shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-1"
        >
          <Share2 size={18} /> SHARE WITH FRIENDS
        </button>
      )}
      
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => handleShare('Twitter')}
          className="bg-[#1DA1F2] aspect-square rounded-2xl border-4 border-black flex flex-col items-center justify-center shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-1 transition-all"
        >
          <Twitter size={24} className="text-white" />
          <span className="text-[8px] font-black text-white mt-1">TWITTER</span>
        </button>
        <button
          onClick={() => handleShare('WhatsApp')}
          className="bg-[#25D366] aspect-square rounded-2xl border-4 border-black flex flex-col items-center justify-center shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-1 transition-all"
        >
          <MessageCircle size={24} className="text-white" />
          <span className="text-[8px] font-black text-white mt-1">WHATSAPP</span>
        </button>
        <button
          onClick={() => handleShare('SMS')}
          className="bg-gray-800 aspect-square rounded-2xl border-4 border-black flex flex-col items-center justify-center shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-1 transition-all"
        >
          <MessageCircle size={24} className="text-white" />
          <span className="text-[8px] font-black text-white mt-1">SMS</span>
        </button>
      </div>
      
      <button
        onClick={copyToClipboard}
        className="w-full bg-gray-50 border-2 border-dashed border-gray-300 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase text-gray-400 hover:border-black hover:text-black transition-all"
      >
        <Copy size={14} /> COPY MY UNIQUE INVITE LINK
      </button>
    </div>
  );
};

export default ReferralRewards;
