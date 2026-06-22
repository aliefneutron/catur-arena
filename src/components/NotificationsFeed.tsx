import { Notification } from '../types';
import { Bell, Trophy, Calendar, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationsFeedProps {
  notifications: Notification[];
  clearNotifications?: () => void;
}

export default function NotificationsFeed({ notifications, clearNotifications }: NotificationsFeedProps) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col h-[500px]">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-5 h-5 text-indigo-400" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
            )}
          </div>
          <h3 className="font-sans font-semibold text-lg text-slate-100">Live Notifikasi</h3>
        </div>
        
        {notifications.length > 0 && clearNotifications && (
          <button
            onClick={clearNotifications}
            className="text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        <AnimatePresence initial={false}>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
              <div className="p-4 bg-white/5 border border-white/10 rounded-full mb-3 text-indigo-400">
                <Bell className="w-8 h-8" />
              </div>
              <p className="text-sm font-sans tracking-tight">Tidak ada notifikasi baru</p>
              <p className="text-xs text-slate-400 mt-1">Hasil tanding real-time akan muncul disini.</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const getIcon = () => {
                switch (notif.type) {
                  case 'match_result':
                    return (
                      <div className="p-2 bg-indigo-500/10 text-indigo-300 rounded-xl border border-indigo-500/15">
                        <Trophy className="w-4 h-4" />
                      </div>
                    );
                  case 'round_started':
                    return (
                      <div className="p-2 bg-emerald-500/10 text-emerald-300 rounded-xl border border-emerald-500/15">
                        <Calendar className="w-4 h-4" />
                      </div>
                    );
                  default:
                    return (
                      <div className="p-2 bg-sky-500/10 text-sky-300 rounded-xl border border-sky-500/15">
                        <Info className="w-4 h-4" />
                      </div>
                    );
                }
              };

              const getBorderColor = () => {
                switch (notif.type) {
                  case 'match_result':
                    return 'border-indigo-500/20 bg-indigo-500/5';
                  case 'round_started':
                    return 'border-emerald-500/20 bg-emerald-500/5';
                  default:
                    return 'border-sky-500/20 bg-sky-500/5';
                }
              };

              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: -15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-3 p-3 border rounded-2xl hover:bg-white/5 transition-all ${getBorderColor()}`}
                  id={`notif-${notif.id}`}
                >
                  <div className="flex-shrink-0">{getIcon()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100 font-sans truncate">
                      {notif.title}
                    </p>
                    <p className="text-xs text-slate-300 font-sans mt-0.5 leading-relaxed break-words">
                      {notif.message}
                    </p>
                    <span className="text-[10px] font-mono text-slate-400 mt-1.5 inline-block">
                      {new Date(notif.createdAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
