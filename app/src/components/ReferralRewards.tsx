import React from 'react';
import { Share2, Twitter, Facebook, MessageCircle, Instagram, Copy } from 'lucide-react';
import { POINT_VALUES } from '../constants';

interface Props {
  userId: string;
  onReferral: () => void;
}

const ReferralRewards: React.FC<Props> = ({ userId, onReferral }) => {
  const referralLink = `https://bhubez.co.za/ref/${userId}`;
  
  const brandedMessage = `BHUBEZI - Jozi's #1 Taxi Network\n\nJoin me on Bhubezi and track routes live. Score rewards for every trip! ${referralLink}\n\nSharp!`;

  const handleShare = (platform: string) => {
    const encodedMsg = encodeURIComponent(brandedMessage);
    const encodedUrl = encodeURIComponent(referralLink);
    
    const urls: Record<string, string> = {
      'Twitter': `https://twitter.com/intent/tweet?text=${encodedMsg}`,
      'Facebook': `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedMsg}`,
      'WhatsApp': `https://api.whatsapp.com/send?text=${encodedMsg}`,
      'Instagram': 'instagram://camera'
    };

    if (platform === 'Instagram') {
      const start = Date.now();
      window.location.href = urls[platform];
      setTimeout(() => {
        if (Date.now() - start < 1500) {
          window.open('https://www.instagram.com/', '_blank');
        }
      }, 500);
    } else if (platform === 'Facebook') {
      const fbAppUrl = `fb://facewebmodal/f?href=${encodedUrl}`;
      const start = Date.now();
      window.location.href = fbAppUrl;
      setTimeout(() => {
        if (Date.now() - start < 1500) {
          window.open(urls[platform], '_blank');
        }
      }, 500);
    } else {
      window.open(urls[platform] || urls['WhatsApp'], '_blank');
    }
    
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
      <div className="grid grid-cols-4 gap-4">
        {[
          { name: 'Twitter', icon: Twitter, color: 'bg-[#1DA1F2]', textColor: 'text-white' },
          { name: 'Facebook', icon: Facebook, color: 'bg-[#1877F2]', textColor: 'text-white' },
          { name: 'WhatsApp', icon: MessageCircle, color: 'bg-[#25D366]', textColor: 'text-white' },
          { name: 'Instagram', icon: Instagram, color: 'bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]', textColor: 'text-white' }
        ].map(platform => (
          <button
            key={platform.name}
            onClick={() => handleShare(platform.name)}
            className={`${platform.color} aspect-square rounded-2xl border-4 border-black flex items-center justify-center shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-1 transition-all group`}
          >
            <platform.icon size={24} className={platform.textColor} />
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          navigator.clipboard.writeText(brandedMessage);
          alert('Invite text copied! Paste it to your status or stories.');
          onReferral();
        }}
        className="w-full bg-gray-50 border-2 border-dashed border-gray-300 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase text-gray-400 hover:border-black hover:text-black transition-all"
      >
        <Copy size={14} /> COPY MY UNIQUE INVITE LINK
      </button>
    </div>
  );
};

export default ReferralRewards;
