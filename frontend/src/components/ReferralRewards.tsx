import React from 'react';
import { Share2, Twitter, Facebook, MessageCircle, Instagram, Copy, Check } from 'lucide-react';
import { POINT_VALUES } from '../constants';

interface Props {
  userId: string;
  onReferral: () => void;
}

const ReferralRewards: React.FC<Props> = ({ userId, onReferral }) => {
  const [copied, setCopied] = React.useState(false);
  const referralLink = `https://bhubez.co.za/ref/${userId}`;
  
  const brandedMessage = `BHUBEZI - SA's #1 Taxi Network

Join me on Bhubezi and track routes live. Score rewards for every trip! ${referralLink}

Sharp!`;

  const handleShare = (platform: string) => {
    const encodedMsg = encodeURIComponent(brandedMessage);
    const encodedUrl = encodeURIComponent(referralLink);
    
    if (platform === 'Twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodedMsg}`, '_blank');
    } else if (platform === 'WhatsApp') {
      window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
    } else if (platform === 'Facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedMsg}`, '_blank');
    } else if (platform === 'Instagram') {
      // Copy text and open Instagram
      copyTextToClipboard(brandedMessage);
      alert('Message copied! Opening Instagram - paste it to your Story or post.');
      window.open('https://www.instagram.com/', '_blank');
    }
    
    onReferral();
  };

  const copyTextToClipboard = (text: string) => {
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        fallbackCopyText(text);
      });
    } else {
      fallbackCopyText(text);
    }
  };

  const fallbackCopyText = (text: string) => {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch {
      // Fallback copy failed - silently fail
    }
    document.body.removeChild(textArea);
  };

  const copyToClipboard = () => {
    copyTextToClipboard(brandedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onReferral();
  };

  return (
    <div className="bg-white p-8 rounded-[3.5rem] border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] mt-8 space-y-6">
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
        Tell SA how cool it is to use <span className="bg-black text-yellow-400 px-1 font-black">BHUBEZI</span>. Score <span className="text-yellow-600 font-black">+{POINT_VALUES.AFFILIATE_SHARE} POINTS</span> per signup!
      </p>
      
      <div className="grid grid-cols-4 gap-3">
        <button
          data-testid="share-twitter-btn"
          onClick={() => handleShare('Twitter')}
          className="bg-[#1DA1F2] aspect-square rounded-2xl border-4 border-black flex flex-col items-center justify-center shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-1 transition-all"
        >
          <Twitter size={24} className="text-white" />
          <span className="text-[7px] font-black text-white mt-1">TWITTER</span>
        </button>
        <button
          data-testid="share-whatsapp-btn"
          onClick={() => handleShare('WhatsApp')}
          className="bg-[#25D366] aspect-square rounded-2xl border-4 border-black flex flex-col items-center justify-center shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-1 transition-all"
        >
          <MessageCircle size={24} className="text-white" />
          <span className="text-[7px] font-black text-white mt-1">WHATSAPP</span>
        </button>
        <button
          data-testid="share-facebook-btn"
          onClick={() => handleShare('Facebook')}
          className="bg-[#1877F2] aspect-square rounded-2xl border-4 border-black flex flex-col items-center justify-center shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-1 transition-all"
        >
          <Facebook size={24} className="text-white" />
          <span className="text-[7px] font-black text-white mt-1">FACEBOOK</span>
        </button>
        <button
          data-testid="share-instagram-btn"
          onClick={() => handleShare('Instagram')}
          className="bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] aspect-square rounded-2xl border-4 border-black flex flex-col items-center justify-center shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-1 transition-all"
        >
          <Instagram size={24} className="text-white" />
          <span className="text-[7px] font-black text-white mt-1">INSTAGRAM</span>
        </button>
      </div>
      
      <button
        data-testid="copy-invite-link-btn"
        onClick={copyToClipboard}
        className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase transition-all border-4 ${copied ? 'bg-green-500 text-white border-green-700' : 'bg-gray-50 border-black text-black hover:bg-yellow-400'} shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-1`}
      >
        {copied ? <><Check size={16} /> COPIED!</> : <><Copy size={16} /> COPY MY UNIQUE INVITE LINK</>}
      </button>
    </div>
  );
};

export default ReferralRewards;
