"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Send, Paperclip, Smile, Image as ImageIcon, File, MoreVertical, Phone, Video, Search, ChevronLeft, MapPin, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUserData } from "@/context/UserDataProvider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type MessageType = 'text' | 'listing_card' | 'file';

interface DBMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  type: MessageType;
  listing_details?: any;
  file_details?: any;
  created_at: string;
}

interface Contact {
  id: string;
  name: string;
  avatar: string | null;
  online: boolean;
  lastMsg: string;
  time: string;
}

export default function MessagePage() {
  const searchParams = useSearchParams();
  const { user, loading: userLoading } = useUserData();
  const supabase = createClient();

  const [messages, setMessages] = useState<DBMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Parse deep link params on load
  useEffect(() => {
    if (!user || userLoading) return;

    const initDeepLink = async () => {
      const listingId = searchParams.get('listingId');
      if (listingId) {
        const farmerId = searchParams.get('farmerId');
        const farmerName = searchParams.get('farmerName') || 'Farmer';
        
        if (farmerId && farmerId !== user.id) {
          // Set active contact
          setActiveContact({
            id: farmerId,
            name: farmerName,
            avatar: null,
            online: true,
            lastMsg: 'Inquiry',
            time: 'Now'
          });

          // Create the listing card message in Supabase
          const newMsg = {
            sender_id: user.id,
            receiver_id: farmerId,
            content: 'Hi, I am interested in this listing.',
            type: 'listing_card' as MessageType,
            listing_details: {
              listingId: listingId,
              title: searchParams.get('title') || 'Untitled',
              price: searchParams.get('price') || '0',
              unit: searchParams.get('unit') || 'hr',
              image: searchParams.get('image') || '/rent.jpg',
              type: searchParams.get('type') || 'rent',
            }
          };

          const { error } = await supabase.from('messages').insert([newMsg]);
          if (error) console.error("Error creating listing message:", error);
        }
      }
    };
    initDeepLink();
  }, [searchParams, user, userLoading]);

  // Fetch messages & setup realtime
  useEffect(() => {
    if (!user || userLoading) return;

    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
      } else if (data) {
        setMessages(data);
        
        // Derive unique contacts from messages
        const contactMap = new Map<string, Contact>();
        data.forEach(msg => {
          const otherId = msg.sender_id === String(user.id) ? msg.receiver_id : msg.sender_id;
          if (!contactMap.has(otherId)) {
            // Basic fallback info
            contactMap.set(otherId, {
              id: otherId,
              name: `User ${otherId.substring(0, 4)}`,
              avatar: null,
              online: true,
              lastMsg: msg.type === 'text' ? msg.content : `Sent a ${msg.type}`,
              time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
          } else {
            // Update last msg to the latest one
            const c = contactMap.get(otherId)!;
            c.lastMsg = msg.type === 'text' ? msg.content : `Sent a ${msg.type}`;
            c.time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
        });

        // Fetch actual user profiles from 'users' table
        const contactIds = Array.from(contactMap.keys());
        if (contactIds.length > 0) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, userName, avatar')
            .in('id', contactIds);
          
          if (!userError && userData) {
            userData.forEach(u => {
              const cid = String(u.id);
              if (contactMap.has(cid)) {
                const c = contactMap.get(cid)!;
                c.name = u.userName || c.name;
                c.avatar = u.avatar || c.avatar;
              }
            });
          }
        }

        const derivedContacts = Array.from(contactMap.values());
        setContacts(derivedContacts);
        
        setActiveContact(prevActive => {
          if (!prevActive && derivedContacts.length > 0) {
            return derivedContacts[0];
          }
          if (prevActive) {
            const updatedProfile = derivedContacts.find(c => c.id === prevActive.id);
            if (updatedProfile) {
              return { ...prevActive, avatar: updatedProfile.avatar, name: updatedProfile.name };
            }
          }
          return prevActive;
        });
      }
      setLoading(false);
    };

    fetchMessages();

    // Setup Realtime Subscription
    const channel = supabase
      .channel('messages_changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${user.id}` // Only listen for messages sent TO me
        }, 
        (payload) => {
          const newMsg = payload.new as DBMessage;
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `sender_id=eq.${user.id}` // Also listen for messages I sent (if sent from another tab)
        }, 
        (payload) => {
          const newMsg = payload.new as DBMessage;
          setMessages(prev => {
            // Avoid duplicates if we already added it optimistically
            if (!prev.find(m => m.id === newMsg.id)) {
               return [...prev, newMsg];
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !user || !activeContact) return;

    const content = inputText.trim();
    setInputText("");

    const newMsg = {
      sender_id: user.id,
      receiver_id: activeContact.id,
      content: content,
      type: 'text' as MessageType,
    };

    const { data, error } = await supabase.from('messages').insert([newMsg]).select();
    
    if (error) {
      console.error("Error sending message:", error);
    } else if (data && data.length > 0) {
      // Optimistic addition if needed, or rely on the realtime channel.
      // Usually relying on the channel is safer to avoid duplicates if setup correctly, 
      // but we handled duplicates in the channel listener.
    }
  };

  const handleFileAttachment = async () => {
    if (!user || !activeContact) return;
    
    // Simulate file attachment
    const newMsg = {
      sender_id: user.id,
      receiver_id: activeContact.id,
      content: 'Attached a document for reference.',
      type: 'file' as MessageType,
      file_details: {
        name: 'field_map.pdf',
        size: '2.4 MB'
      }
    };
    
    await supabase.from('messages').insert([newMsg]);
  };

  const handleDeleteChat = async () => {
    if (!user || !activeContact) return;
    
    // Optimistic UI update
    setMessages(prev => prev.filter(m => 
      !( (m.sender_id === user.id && m.receiver_id === activeContact.id) || 
         (m.receiver_id === user.id && m.sender_id === activeContact.id) )
    ));
    setContacts(prev => prev.filter(c => c.id !== activeContact.id));
    setActiveContact(null);

    // Database deletion
    const { error } = await supabase
      .from('messages')
      .delete()
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeContact.id}),and(sender_id.eq.${activeContact.id},receiver_id.eq.${user.id})`);

    if (error) {
      console.error("Error deleting chat:", error);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex h-[calc(100vh-120px)] w-full items-center justify-center bg-white dark:bg-[#0A0E1A] rounded-[32px] border border-slate-200 dark:border-[#1E293B] shadow-sm">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Filter messages for the active contact
  const activeMessages = messages.filter(m => 
    (m.sender_id === user?.id && m.receiver_id === activeContact?.id) ||
    (m.receiver_id === user?.id && m.sender_id === activeContact?.id)
  );

  return (
    <div className="flex h-[calc(100vh-120px)] w-full bg-white dark:bg-[#0A0E1A] rounded-[32px] border border-slate-200 dark:border-[#1E293B] shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      
      {/* ── SIDEBAR (Contacts) ── */}
      <div className="w-full md:w-[320px] lg:w-[360px] border-r border-slate-200 dark:border-[#1E293B] flex-col bg-slate-50/50 dark:bg-[#06080d]/50 hidden md:flex">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-200 dark:border-[#1E293B]">
          <h2 className="text-2xl font-sora font-black text-slate-900 dark:text-white mb-5">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#131B2C] border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow font-medium"
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {contacts.length === 0 ? (
            <div className="text-center p-4 text-slate-500 text-sm mt-10">No messages yet.</div>
          ) : contacts.map(contact => (
            <div 
              key={contact.id} 
              onClick={() => setActiveContact(contact)}
              className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                activeContact?.id === contact.id 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 shadow-sm' 
                  : 'hover:bg-slate-100 dark:hover:bg-[#131B2C] border border-transparent'
              }`}
            >
              <div className="relative">
                {contact.avatar ? (
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200">
                    <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = '/placeholder-user.jpg')} />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg shadow-sm">
                    {contact.name.charAt(0)}
                  </div>
                )}
                {contact.online && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#0A0E1A] rounded-full"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className="font-bold text-slate-900 dark:text-white truncate text-[15px]">{contact.name}</h4>
                  <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0">{contact.time}</span>
                </div>
                <p className="text-xs font-medium text-slate-500 truncate">{contact.lastMsg}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN CHAT AREA ── */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#0A0E1A] min-w-0 relative">
        
        {activeContact ? (
          <>
            {/* Chat Header */}
            <div className="h-[80px] px-6 border-b border-slate-200 dark:border-[#1E293B] flex items-center justify-between bg-white/80 dark:bg-[#0A0E1A]/80 backdrop-blur-md absolute top-0 left-0 right-0 z-20">
              <div className="flex items-center gap-4">
                <button className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full">
                  <ChevronLeft size={24} />
                </button>
                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg shadow-sm">
                    {activeContact.name.charAt(0)}
                  </div>
                  {activeContact.online && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#0A0E1A] rounded-full"></div>
                  )}
                </div>
                <div>
                  <h3 className="font-sora font-bold text-slate-900 dark:text-white text-base leading-tight">{activeContact.name}</h3>
                  <p className="text-xs font-medium text-green-500 mt-0.5">{activeContact.online ? 'Online now' : 'Offline'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors">
                  <Phone size={20} />
                </button>
                <button className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors">
                  <Video size={20} />
                </button>
                <div className="w-[1px] h-6 bg-slate-200 dark:bg-[#1E293B] mx-1"></div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-[#1E293B] rounded-full transition-colors">
                      <MoreVertical size={20} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-48 p-2 rounded-xl border border-slate-200 dark:border-[#1E293B] shadow-lg">
                    <button 
                      onClick={handleDeleteChat}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium flex items-center gap-2"
                    >
                      <Trash2 size={16} /> Delete Chat
                    </button>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 pt-[100px] space-y-6 bg-slate-50/50 dark:bg-[#06080d]/50 bg-[url('/pattern-light.svg')] dark:bg-[url('/pattern-dark.svg')] bg-repeat opacity-100">
              <div className="text-center my-6">
                <span className="bg-white/80 dark:bg-[#1E293B]/80 backdrop-blur-sm text-slate-500 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-sm">
                  Conversation Started
                </span>
              </div>

              {activeMessages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                const timestamp = msg.created_at ? new Date(msg.created_at) : new Date();

                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    
                    {/* LISTING CARD MESSAGE */}
                    {msg.type === 'listing_card' && msg.listing_details && (
                      <div className={`mb-2 w-full max-w-[280px] sm:max-w-[340px] bg-white dark:bg-[#0A0E1A] rounded-[24px] overflow-hidden border ${isMe ? 'border-blue-200 dark:border-blue-900/50 shadow-lg shadow-blue-500/10' : 'border-slate-200 dark:border-[#1E293B] shadow-sm'}`}>
                        <div className="relative h-[160px] w-full bg-slate-100">
                          <Image src={msg.listing_details.image} alt="listing" fill className="object-cover" />
                          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-slate-900 text-[9px] font-bold px-2.5 py-1 rounded-full shadow-sm uppercase tracking-wide">
                            {msg.listing_details.type}
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-[15px] text-slate-900 dark:text-white line-clamp-2 mb-2 leading-tight">{msg.listing_details.title}</h4>
                          <p className="font-black text-blue-600 dark:text-blue-400 text-lg">₹{Number(msg.listing_details.price).toLocaleString()} <span className="text-[11px] text-slate-500 font-medium">/ {msg.listing_details.unit}</span></p>
                        </div>
                      </div>
                    )}

                    {/* FILE ATTACHMENT MESSAGE */}
                    {msg.type === 'file' && msg.file_details && (
                      <div className={`mb-2 flex items-center gap-3 p-3.5 rounded-[20px] ${isMe ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-500/20' : 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white rounded-bl-none shadow-sm border border-slate-100 dark:border-[#2A3441]'}`}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${isMe ? 'bg-white/20 text-white' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'}`}>
                          <File size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-bold truncate max-w-[180px]">{msg.file_details.name}</p>
                          <p className={`text-[11px] font-medium mt-0.5 ${isMe ? 'text-blue-100' : 'text-slate-500'}`}>{msg.file_details.size} • PDF</p>
                        </div>
                      </div>
                    )}

                    {/* TEXT MESSAGE */}
                    <div 
                      className={`relative px-5 py-3.5 max-w-[85%] sm:max-w-[70%] text-[15px] shadow-sm leading-relaxed ${
                        isMe 
                          ? 'bg-blue-600 text-white rounded-[24px] rounded-br-[8px] shadow-blue-500/20' 
                          : 'bg-white dark:bg-[#1E293B] text-slate-800 dark:text-slate-100 rounded-[24px] rounded-bl-[8px] border border-slate-100 dark:border-[#2A3441]'
                      }`}
                    >
                      {msg.content}
                    </div>
                    
                    {/* TIMESTAMP */}
                    <span className="text-[10px] font-semibold text-slate-400 mt-2 px-2 flex items-center gap-1">
                      {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isMe && <CheckCircle2 size={12} className="text-blue-500" />}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Area */}
            <div className="p-5 bg-white dark:bg-[#0A0E1A] border-t border-slate-200 dark:border-[#1E293B] z-10">
              <form 
                onSubmit={handleSendMessage}
                className="flex items-center gap-2 bg-slate-50 dark:bg-[#131B2C] p-2 rounded-[32px] border border-slate-200 dark:border-[#1E293B] focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-400 transition-all shadow-sm"
              >
                <button type="button" onClick={handleFileAttachment} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-[#1E293B] rounded-full transition-all flex-shrink-0 cursor-pointer shadow-sm ml-1">
                  <Paperclip size={20} className="drop-shadow-sm" />
                </button>
                
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type your message..." 
                  className="flex-1 bg-transparent px-2 py-2 text-[15px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
                
                <button type="button" className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-amber-500 transition-colors flex-shrink-0 hidden sm:flex">
                  <Smile size={22} />
                </button>
                
                <button 
                  type="submit" 
                  disabled={!inputText.trim()}
                  className="w-11 h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-full flex items-center justify-center transition-all flex-shrink-0 shadow-lg shadow-blue-500/30 disabled:shadow-none mr-0.5 active:scale-95"
                >
                  <Send size={18} className="ml-1" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-full">
            <div className="w-24 h-24 bg-slate-50 dark:bg-[#131B2C] rounded-full flex items-center justify-center mb-6 shadow-sm">
              <MoreVertical size={40} className="text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="font-sora font-bold text-xl text-slate-900 dark:text-white mb-2">No active conversation</h3>
            <p className="text-sm font-medium text-slate-500 max-w-sm">Select a contact from the sidebar or start a new conversation by inquiring about a listing.</p>
          </div>
        )}
      </div>
    </div>
  );
}
