'use client';
import { motion } from 'framer-motion';

interface SignalLostProps {
  message?: string;
  code?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  minimal?: boolean;
}

export default function SignalLost({
  message = 'UNABLE TO ESTABLISH CONNECTION',
  code = 'ERR_SIGNAL_LOST',
  onRetry,
  onDismiss,
  minimal = false,
}: SignalLostProps) {
  if (minimal) {
    return (
      <motion.div
        className="text-center py-16 border border-[#E4002B]/20 bg-[#0d0d0d]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Glitch icon */}
        <div className="text-[#E4002B] text-4xl mb-4 animate-pulse font-retro">⚠</div>
        <div className="text-[#E4002B] text-sm tracking-[0.4em] mb-2 font-retro">SIGNAL LOST</div>
        <div className="text-[#444444] text-xs tracking-[0.2em] mb-6">{message}</div>
        <div className="flex justify-center gap-4">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-6 py-2 border border-[#E4002B] text-[#E4002B] text-[10px] tracking-[0.3em] hover:bg-[#E4002B] hover:text-[#0A0A0A] transition-all duration-300"
            >
              RETRY CONNECTION
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="px-6 py-2 border border-[#333333] text-[#666666] text-[10px] tracking-[0.3em] hover:text-[#E4002B] hover:border-[#E4002B]/50 transition-all duration-300"
            >
              DISMISS
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-[#0A0A0A] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(#E4002B 1px, transparent 1px), linear-gradient(90deg, #E4002B 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Animated red glow */}
      <motion.div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#E4002B]/5 rounded-full blur-[200px]"
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Content */}
      <div className="relative text-center max-w-lg px-8">
        {/* Error code */}
        <motion.div
          className="text-[#333333] text-[10px] tracking-[0.5em] font-mono mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {code}
        </motion.div>

        {/* Main error title with glitch effect */}
        <motion.div
          className="relative mb-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <h1 className="text-[#E4002B] text-5xl md:text-7xl tracking-[0.3em] font-retro text-glow-red">
            SIGNAL
          </h1>
          <h1 className="text-[#E4002B] text-5xl md:text-7xl tracking-[0.3em] font-retro text-glow-red -mt-2">
            LOST
          </h1>
          {/* Glitch bars */}
          <motion.div
            className="absolute -left-4 top-1/4 w-[110%] h-px bg-[#E4002B]/30"
            animate={{ x: [-2, 2, -1, 1, 0], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute -left-4 top-2/3 w-[110%] h-px bg-[#E4002B]/20"
            animate={{ x: [2, -2, 1, -1, 0], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
          />
        </motion.div>

        {/* Divider */}
        <motion.div
          className="w-24 h-px bg-[#E4002B]/50 mx-auto mb-6"
          initial={{ width: 0 }}
          animate={{ width: 96 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        />

        {/* Message */}
        <motion.p
          className="text-[#666666] text-sm tracking-[0.2em] mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {message}
        </motion.p>

        <motion.p
          className="text-[#444444] text-[10px] tracking-[0.3em] mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          ARCHIVE CONNECTION TERMINATED
        </motion.p>

        {/* System diagnostics animation */}
        <motion.div
          className="border border-[#1a1a1a] bg-[#0d0d0d] p-4 mb-8 text-left font-mono"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
        >
          <div className="text-[10px] space-y-1">
            <div className="text-[#444444]">{'>'} RUNNING DIAGNOSTICS...</div>
            <DiagnosticLine label="ARCHIVE.INTEGRITY" value="97.3%" delay={1.6} status="ok" />
            <DiagnosticLine label="NODE.STATUS" value="12/12 ACTIVE" delay={1.8} status="ok" />
            <DiagnosticLine label="NETWORK.LATENCY" value="TIMEOUT" delay={2.0} status="error" />
            <DiagnosticLine label="SIGNAL.STRENGTH" value="0%" delay={2.2} status="error" />
            <motion.div
              className="text-[#E4002B] mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.4 }}
            >
              {'>'} ERROR: CONNECTION REFUSED. RETRY RECOMMENDED.
            </motion.div>
          </div>
        </motion.div>

        {/* Buttons */}
        <motion.div
          className="flex justify-center gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.6 }}
        >
          {onRetry && (
            <motion.button
              onClick={onRetry}
              className="group relative px-8 py-3 border border-[#E4002B] text-[#E4002B] text-xs tracking-[0.3em] overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10 group-hover:text-[#0A0A0A] transition-colors duration-300">
                RETRY CONNECTION
              </span>
              <motion.div
                className="absolute inset-0 bg-[#E4002B]"
                initial={{ x: '-100%' }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="px-8 py-3 border border-[#333333] text-[#666666] text-xs tracking-[0.3em] hover:border-[#E4002B]/50 hover:text-[#E4002B] transition-colors"
            >
              DISMISS
            </button>
          )}
          {!onRetry && !onDismiss && (
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 border border-[#E4002B] text-[#E4002B] text-xs tracking-[0.3em] hover:bg-[#E4002B] hover:text-[#0A0A0A] transition-all duration-300"
            >
              RESTART SYSTEM
            </button>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

function DiagnosticLine({
  label,
  value,
  delay,
  status,
}: {
  label: string;
  value: string;
  delay: number;
  status: 'ok' | 'error';
}) {
  return (
    <motion.div
      className="flex items-center gap-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
    >
      <span className="text-[#555555]">{'>'} {label}:</span>
      <span className={status === 'ok' ? 'text-green-600' : 'text-[#E4002B]'}>{value}</span>
      <span className={status === 'ok' ? 'text-green-600' : 'text-[#E4002B]'}>[{status.toUpperCase()}]</span>
    </motion.div>
  );
}
