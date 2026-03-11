import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, MicOff, Monitor, MonitorOff, Terminal, 
  Shield, Cpu, Activity, Zap, MessageSquare,
  Power, Settings, User, Lock, Volume2, VolumeX
} from 'lucide-react';
import { SyforLiveClient } from './services/syforService';
import { useAudioCapture, useAudioPlayback } from './hooks/useAudio';
import { useScreenCapture } from './hooks/useScreen';

const API_KEY = process.env.GEMINI_API_KEY || '';

const MatrixBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()*&^%";
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops: number[] = [];

    for (let i = 0; i < columns; i++) {
      drops[i] = 1;
    }

    const draw = () => {
      ctx.fillStyle = "rgba(0, 5, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#00ff41";
      ctx.font = fontSize + "px monospace";

      for (let i = 0; i < drops.length; i++) {
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);
    return () => clearInterval(interval);
  }, []);

  return <canvas ref={canvasRef} className="matrix-bg" />;
};

export default function App() {
  const [status, setStatus] = useState<'offline' | 'online' | 'connecting'>('offline');
  const [interactionMode, setInteractionMode] = useState<'voice' | 'text'>('voice');
  const [transcripts, setTranscripts] = useState<{ text: string, role: 'user' | 'model' }[]>([]);
  const [isHackingMode, setIsHackingMode] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [systemStats, setSystemStats] = useState({ cpu: 12, mem: 45, net: 120 });
  const [inputText, setInputText] = useState('');
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [remoteTarget, setRemoteTarget] = useState<string | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'Syfor Çekirdeği Başlatılıyor...',
    'Nöral modüller yükleniyor...',
    'Şifreli tünel kuruluyor...',
    'Komutlar için hazır.'
  ]);

  const hackedFiles = [
    { name: 'sifreler.txt', size: '1.2KB', type: 'metin' },
    { name: 'sistem_yapilandirma.bak', size: '45KB', type: 'yapilandirma' },
    { name: 'vt_dokumu.sql', size: '1.2GB', type: 'veritabani' },
    { name: 'ozel_anahtar.pem', size: '2KB', type: 'anahtar' }
  ];

  const addLog = (msg: string) => {
    setTerminalLogs(prev => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const syforRef = useRef<SyforLiveClient | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { playAudio, stopPlayback } = useAudioPlayback();
  
  const onAudioData = useCallback((base64: string) => {
    syforRef.current?.sendAudio(base64);
  }, []);

  const onFrameData = useCallback((base64: string) => {
    syforRef.current?.sendFrame(base64);
  }, []);

  const { isCapturing, startCapture, stopCapture } = useAudioCapture(onAudioData);
  const { isSharing, stream, startSharing, stopSharing } = useScreenCapture(onFrameData);

  const connectSyfor = async () => {
    if (!API_KEY) {
      alert("Gemini API Key eksik. Lütfen sırlar panelinden yapılandırın.");
      return;
    }

    setStatus('connecting');
    syforRef.current = new SyforLiveClient(API_KEY);
    
    await syforRef.current.connect({
      onAudioOutput: (data) => {
        if (!isMuted && interactionMode === 'voice') {
          playAudio(data);
        }
      },
      onTranscript: (text, role) => {
        setTranscripts(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === role && role === 'model') {
            // Append to last model message if it's recent (streaming)
            return [...prev.slice(0, -1), { ...last, text: last.text + text }];
          }
          return [...prev.slice(-20), { text, role }];
        });
      },
      onInterrupted: () => stopPlayback(),
      onError: (err) => {
        console.error("Syfor Hatası:", err);
        setStatus('offline');
      }
    });

    setStatus('online');
    if (interactionMode === 'voice') {
      startCapture();
    }
  };

  const toggleInteractionMode = () => {
    const newMode = interactionMode === 'voice' ? 'text' : 'voice';
    setInteractionMode(newMode);
    if (status === 'online') {
      if (newMode === 'voice') startCapture();
      else stopCapture();
    }
    addLog(`${newMode.toUpperCase()} protokolüne geçiliyor...`);
  };

  const disconnectSyfor = () => {
    syforRef.current?.disconnect();
    stopCapture();
    stopSharing();
    setStatus('offline');
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || status !== 'online') return;
    
    syforRef.current?.sendText(inputText);
    setTranscripts(prev => [...prev, { text: inputText, role: 'user' }]);
    setInputText('');
  };

  const runSimulatedTool = (tool: string) => {
    setActiveTool(tool);
    addLog(`${tool.toUpperCase()} yürütülüyor...`);
    
    if (tool === 'port_scan') {
      addLog('Hedef taranıyor 192.168.1.105...');
      addLog('Port 80: AÇIK (HTTP)');
      addLog('Port 443: AÇIK (HTTPS)');
      addLog('Port 22: AÇIK (SSH)');
      setRemoteTarget('192.168.1.105');
    } else if (tool === 'kernel_infiltrate') {
      addLog('Kernel alanına payload enjekte ediliyor...');
      addLog('Bellek koruması atlatılıyor...');
      addLog('ROOT ERİŞİMİ SAĞLANDI.');
    } else if (tool === 'brute_force') {
      addLog('SSH üzerinde sözlük saldırısı başlatılıyor...');
      addLog('Deneniyor: admin/admin...');
      addLog('Deneniyor: root/20110928...');
      addLog('ŞİFRE KIRILDI: 20110928');
    } else if (tool === 'ip_tracer') {
      addLog('Kaynağa giden rota izleniyor...');
      addLog('Köken: Moskova, RU (Proxy tespit edildi)');
    } else if (tool === 'vulnerability_check') {
      addLog('CVE veritabanı kontrol ediliyor...');
      addLog('CVE-2024-1234 bulundu: Kritik');
    }

    setTimeout(() => {
      setActiveTool(null);
      addLog(`${tool.toUpperCase()} başarıyla tamamlandı.`);
    }, 5000);
  };

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Simulate system stats
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStats({
        cpu: Math.floor(Math.random() * 40) + 20,
        mem: Math.floor(Math.random() * 20) + 60,
        net: Math.floor(Math.random() * 500) + 200
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const [isLocked, setIsLocked] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '20110928') {
      setIsLocked(false);
      setLoginError(false);
      addLog('SİSTEM_KİLİDİ_AÇILDI: Yönetici Yusuf\'a erişim verildi.', 'success');
    } else {
      setLoginError(true);
      addLog('YETKİ_HATASI: Geçersiz kimlik bilgileri tespit edildi.', 'error');
      setTimeout(() => setLoginError(false), 2000);
    }
  };

  if (isLocked) {
    return (
      <div className="fixed inset-0 bg-[#000500] z-[100] flex flex-col items-center justify-center font-mono p-4">
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <div className="matrix-bg h-full w-full" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-8 w-full max-w-md border border-green-500/30 relative z-10"
        >
          <div className="flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-full border-2 border-green-500 flex items-center justify-center animate-pulse">
              <Lock className="w-10 h-10 text-green-500" />
            </div>
            
            <div className="text-center">
              <h2 className="font-display text-2xl text-green-400 tracking-widest uppercase mb-2">Sistem Kilitli</h2>
              <p className="text-green-500/60 text-xs uppercase tracking-tighter">Sadece Yetkili Personel</p>
            </div>

            <form onSubmit={handleLogin} className="w-full space-y-4">
              <div className="relative">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="ERİŞİM ANAHTARINI GİRİN"
                  className={`w-full bg-black/50 border ${loginError ? 'border-red-500 animate-shake' : 'border-green-500/50'} p-3 text-green-400 placeholder:text-green-900 focus:outline-none focus:border-green-500 transition-all text-center tracking-[0.5em]`}
                  autoFocus
                />
                {loginError && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-500 text-[10px] uppercase mt-2 text-center font-bold"
                  >
                    Erişim Engellendi - Sızma Alarmı
                  </motion.p>
                )}
              </div>
              
              <button 
                type="submit"
                className="w-full bg-green-500/10 hover:bg-green-500/20 border border-green-500/50 text-green-400 py-3 text-sm uppercase tracking-widest transition-all active:scale-95"
              >
                Girişi Yürüt
              </button>
            </form>
          </div>
        </motion.div>
        
        <div className="mt-8 text-green-900 text-[10px] uppercase tracking-[0.3em]">
          Syfor Güvenlik Protokolü v4.0.2
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-green-500/30">
      <MatrixBackground />
      <div className="scanline" />
      
      {/* Header */}
      <header className="p-6 flex justify-between items-center border-b border-green-500/20 glass-panel z-20">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full animate-pulse ${status === 'online' ? 'bg-green-400' : status === 'connecting' ? 'bg-yellow-400' : 'bg-red-500'}`} />
          <h1 className="font-display text-2xl tracking-widest text-green-400 uppercase glitch-hover cursor-default">Syfor Root</h1>
        </div>
        
        <div className="flex items-center gap-6 text-xs font-mono text-green-500/60 uppercase tracking-tighter">
          <div className="flex items-center gap-2">
            <Cpu size={14} /> SİSTEM_YÜKÜ: {systemStats.cpu}%
          </div>
          <div className="flex items-center gap-2">
            <Activity size={14} /> BELLEK: {systemStats.mem}%
          </div>
          <div className="flex items-center gap-2">
            <Zap size={14} /> TRAFİK: {systemStats.net} KB/S
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsHackingMode(!isHackingMode)}
            className={`p-2 rounded border transition-all ${isHackingMode ? 'bg-green-500/20 border-green-500 text-green-500' : 'border-green-500/20 text-green-500 hover:bg-green-500/10'}`}
          >
            <Shield size={20} />
          </button>
          <button 
            onClick={toggleInteractionMode}
            className={`p-2 rounded border transition-all ${interactionMode === 'voice' ? 'bg-green-500/20 border-green-500 text-green-500' : 'border-white/10 text-white/40 hover:text-white/60'}`}
            title={interactionMode === 'voice' ? "Voice Mode Active" : "Text Mode Active"}
          >
            {interactionMode === 'voice' ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded border transition-all ${isMuted ? 'bg-red-500/20 border-red-500 text-red-500' : 'border-green-500/20 text-green-500 hover:bg-green-500/10'}`}
            title={isMuted ? "Unmute Syfor" : "Mute Syfor"}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <button 
            onClick={() => setIsLocked(true)}
            className="p-2 text-green-500/60 hover:text-green-400 transition-colors"
            title="Lock System"
          >
            <Lock size={20} />
          </button>
          <button className="p-2 text-green-500/60 hover:text-green-400 transition-colors">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex p-6 gap-6 overflow-hidden">
        {/* Left Panel - Visualizer & Controls */}
        <div className="w-1/3 flex flex-col gap-6">
          <div className="flex-1 glass-panel rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
            {/* Screen Preview */}
            {isSharing && stream && (
              <div className="absolute inset-0 z-0 opacity-20">
                <video 
                  autoPlay 
                  muted 
                  playsInline 
                  ref={el => { if(el) el.srcObject = stream; }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
              </div>
            )}

            {/* Syfor Core Visualizer */}
            <div className="relative w-48 h-48 flex items-center justify-center z-10">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-2 border-dashed border-green-500/30 rounded-full"
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-4 border border-green-400/20 rounded-full"
              />
              <motion.div 
                animate={{ 
                  scale: status === 'online' ? [1, 1.2, 1] : 1,
                  opacity: status === 'online' ? [0.6, 1, 0.6] : 0.3
                }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-24 h-24 bg-green-500 rounded-full syfor-glow flex items-center justify-center"
              >
                <div className="w-20 h-20 border-4 border-black/40 rounded-full flex items-center justify-center">
                   <div className="w-12 h-12 bg-black/60 rounded-full" />
                </div>
              </motion.div>
            </div>
            
            <div className="mt-8 text-center z-10">
              <p className="font-display text-green-400 tracking-widest text-sm uppercase mb-1">
                {status === 'online' ? 'Syfor Root Erişimi' : status === 'connecting' ? 'Güvenlik Duvarları Aşılıyor...' : 'Sistem Kilitli'}
              </p>
              <p className="text-xs font-mono text-green-500/40 uppercase">Biyometrik Kimlik Doğrulama Aktif</p>
            </div>

            {/* Controls */}
            <div className="absolute bottom-8 flex gap-4 z-10">
              <button 
                onClick={status === 'online' ? disconnectSyfor : connectSyfor}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${status === 'online' ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-green-500/20 text-green-400 border border-green-500/50'}`}
              >
                <Power size={24} />
              </button>
              
              <button 
                disabled={status !== 'online'}
                onClick={isSharing ? stopSharing : startSharing}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isSharing ? 'bg-green-400 text-black' : 'bg-green-500/10 text-green-500 border border-green-500/20 disabled:opacity-30'}`}
              >
                {isSharing ? <Monitor size={24} /> : <MonitorOff size={24} />}
              </button>
            </div>
          </div>

          <div className="h-1/3 glass-panel rounded-2xl p-4 font-mono text-[10px] text-green-500/60 overflow-hidden relative">
            <div className="flex items-center justify-between mb-2 border-b border-green-500/10 pb-2">
              <div className="flex items-center gap-2">
                <Terminal size={12} /> ROOT_KONSOLU
              </div>
              <div className="text-[8px] opacity-40">TTY1</div>
            </div>
            <div className="space-y-1 overflow-y-auto h-[calc(100%-30px)] custom-scrollbar">
              {terminalLogs.map((log, i) => (
                <p key={i} className={log.includes('[WARN]') ? 'text-red-500' : log.includes('[LIVE]') ? 'text-green-400' : ''}>
                  {log}
                </p>
              ))}
              {isSharing && <p className="text-green-400">[LIVE] SCREEN_CAPTURE_STREAMING</p>}
              {status === 'online' && <p className="text-green-400">[AUTH] USER_VERIFIED_BY_VOICE</p>}
              {isHackingMode && <p className="text-red-500">[WARN] SECURITY_BYPASS_ENABLED</p>}
              {activeTool && <p className="text-yellow-500 animate-pulse">[RUN] {activeTool.toUpperCase()}...</p>}
            </div>
          </div>
        </div>

        {/* Right Panel - Terminal & Transcripts */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="flex-1 glass-panel rounded-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-green-500/10 pb-4">
              <div className="flex items-center gap-2 text-green-400">
                <MessageSquare size={18} />
                <span className="font-display text-sm uppercase tracking-widest">Nöral Terminal</span>
              </div>
              <div className="text-[10px] font-mono text-green-500/40 uppercase">Kanal: 0xDEADBEEF</div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar mb-4">
              <AnimatePresence initial={false}>
                {transcripts.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-green-500/20 italic font-mono text-sm">
                    Komut bekleniyor...
                  </div>
                ) : (
                  transcripts.map((t, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col ${t.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className={`px-4 py-2 rounded-lg max-w-[80%] text-sm font-mono ${t.role === 'user' ? 'bg-green-500/10 text-green-300 border border-green-500/20' : 'bg-white/5 text-green-100 border border-white/10'}`}>
                        <span className="text-[10px] block opacity-40 mb-1 uppercase tracking-tighter">
                          {t.role === 'user' ? 'Yönetici' : 'Syfor'}
                        </span>
                        {t.text}
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            {/* Text Input */}
            <form onSubmit={handleSendText} className="relative">
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={status === 'online' ? "Komut girin..." : "Sistem kilitli"}
                disabled={status !== 'online'}
                className="w-full bg-black/60 border border-green-500/20 rounded-lg py-3 px-4 text-sm font-mono text-green-100 placeholder:text-green-500/20 focus:outline-none focus:border-green-500/50 transition-all terminal-cursor"
              />
              <button 
                type="submit"
                disabled={status !== 'online' || !inputText.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-green-500 hover:text-green-400 disabled:opacity-0 transition-all"
              >
                <Zap size={16} />
              </button>
            </form>
          </div>

          {/* Hacking / Security Module */}
          <AnimatePresence>
            {isHackingMode && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="glass-panel rounded-2xl p-4 border-green-500/30 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-green-500 font-display text-xs uppercase tracking-widest">
                    <Lock size={14} /> Güvenlik Araç Kiti
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => runSimulatedTool('port_scan')}
                      className="text-[10px] px-2 py-1 border border-green-500/20 hover:bg-green-500/10 rounded uppercase"
                    >
                      Uzaktan Bağlantı
                    </button>
                    <button 
                      onClick={() => runSimulatedTool('kernel_infiltrate')}
                      className="text-[10px] px-2 py-1 border border-red-500/20 hover:bg-red-500/10 text-red-400 rounded uppercase"
                    >
                      Çekirdek Sızması
                    </button>
                    <button 
                      onClick={() => runSimulatedTool('brute_force')}
                      className="text-[10px] px-2 py-1 border border-yellow-500/20 hover:bg-yellow-500/10 text-yellow-400 rounded uppercase"
                    >
                      Kaba Kuvvet
                    </button>
                    <button 
                      onClick={() => runSimulatedTool('vulnerability_check')}
                      className="text-[10px] px-2 py-1 border border-green-500/20 hover:bg-green-500/10 rounded uppercase"
                    >
                      Yetki Atlatma
                    </button>
                  </div>
                </div>

                {remoteTarget && (
                  <div className="mb-4 p-2 bg-green-500/5 border border-green-500/20 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-green-400 uppercase font-bold">Remote: {remoteTarget}</span>
                      <span className="text-[8px] text-green-500/40">İŞLETİM SİSTEMİ: Linux 5.15.0-generic</span>
                    </div>
                    <div className="space-y-1">
                      {hackedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[10px] font-mono hover:bg-green-500/10 p-1 rounded cursor-pointer group">
                          <span className="text-green-500/80 group-hover:text-green-400">📄 {file.name}</span>
                          <span className="text-green-500/30">{file.size}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-green-500/5 border border-green-500/10 rounded p-2">
                      <div className="text-[8px] text-green-500/40 uppercase mb-1">Node 0{i}</div>
                      <div className="h-1 bg-green-500/20 rounded-full overflow-hidden">
                        <motion.div 
                          animate={{ width: ['0%', '100%', '0%'] }}
                          transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                          className="h-full bg-green-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer / Status Bar */}
      <footer className="px-6 py-2 border-t border-green-500/10 glass-panel flex justify-between items-center text-[10px] font-mono text-green-500/40 uppercase tracking-widest">
        <div>Root: SYFOR@YEREL_HOST</div>
        <div className="flex gap-4">
          <span>PING: 12MS</span>
          <span>OTURUM: {status === 'online' ? 'KURULDU' : 'KAPALI'}</span>
          <span>ERİŞİM: {isHackingMode ? 'ROOT' : 'KULLANICI'}</span>
        </div>
      </footer>
    </div>
  );
}
