import React, { useState } from 'react';
import { registerUser, loginAdminOrDj, loginListener, signInWithGoogle, resetUserPassword } from '../services/firebase';
import { Music, Headphones, User as UserIcon, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const AuthPage: React.FC = () => {
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER' | 'RESET'>('LOGIN');
    const [resetSent, setResetSent] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');

    const { user } = useAuth();
    const navigate = useNavigate();

    // Redirect if already logged in
    React.useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError(null);

        if (authMode === 'REGISTER' && password !== confirmPassword) {
            setLoginError("Passwords do not match.");
            return;
        }

        setIsLoggingIn(true);

        try {
            if (authMode === 'REGISTER') {
                await registerUser(email, password, displayName);
            } else if (authMode === 'LOGIN') {
                await loginAdminOrDj(email, password, 'LISTENER');
            } else if (authMode === 'RESET') {
                await resetUserPassword(email);
                setResetSent(true);
            }
        } catch (err: any) {
            console.error(err);
            if (authMode === 'RESET') {
                setLoginError("Failed to send reset email. Please check the email address.");
            } else if (err.code === 'auth/email-already-in-use') {
                setLoginError("This email is already registered. Please log in instead.");
            } else if (err.code === 'auth/weak-password') {
                setLoginError("Password must be at least 6 characters.");
            } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-email') {
                setLoginError("Invalid email or password.");
            } else if (err.message) {
                setLoginError(err.message);
            } else {
                setLoginError("Action failed. Please try again.");
            }
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleGuestLogin = async () => {
        setLoginError(null);
        setIsLoggingIn(true);
        try {
            await loginListener('Guest');
        } catch (err) {
            setLoginError("Guest login failed.");
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoginError(null);
        setIsLoggingIn(true);
        try {
            await signInWithGoogle();
        } catch (err: any) {
            console.error("Google Login Error", err);
            setLoginError(err.message || "Google Sign-In failed.");
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 relative flex flex-col items-center justify-center p-4 overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-md flex flex-col items-center animate-fade-in-up">
                {/* Logo Section */}
                <div className="text-center mb-8 space-y-2">
                    <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-indigo-500/30 mb-6 rotate-3 hover:rotate-6 transition-transform duration-500">
                        <Music className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-lg">PassTheAux</h1>
                    <p className="text-slate-400 text-lg font-medium">The social jukebox for modern events.</p>
                </div>

                {/* Main Auth Card */}
                <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl w-full shadow-2xl shadow-black/50 overflow-hidden relative">
                    {/* Top Decor Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />

                    {/* Toggle Switch */}
                    {authMode !== 'RESET' ? (
                        <div className="flex gap-1.5 mb-8 bg-slate-950/50 p-1.5 rounded-xl border border-white/5">
                            <button
                                type="button"
                                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${authMode === 'LOGIN' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                onClick={() => setAuthMode('LOGIN')}
                            >
                                Sign In
                            </button>
                            <button
                                type="button"
                                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${authMode === 'REGISTER' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                onClick={() => setAuthMode('REGISTER')}
                            >
                                Create Account
                            </button>
                        </div>
                    ) : (
                        <div className="mb-6 flex items-center">
                            <button
                                onClick={() => { setAuthMode('LOGIN'); setResetSent(false); setLoginError(null); }}
                                className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back to Sign In
                            </button>
                        </div>
                    )}

                    {loginError && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm animate-shake">
                            <div className="w-2 h-2 mt-1.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                            {loginError}
                        </div>
                    )}

                    {resetSent ? (
                        <div className="text-center py-4 animate-fade-in-up">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <div className="text-green-400 text-2xl">✓</div>
                            </div>
                            <h3 className="text-white font-bold text-lg mb-2">Check your email</h3>
                            <p className="text-slate-400 text-sm mb-6">We've sent a password reset link to <span className="text-white">{email}</span>.</p>
                            <button
                                onClick={() => { setAuthMode('LOGIN'); setResetSent(false); }}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition-all"
                            >
                                Back to Login
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleAuth} className="space-y-5">
                            {authMode === 'REGISTER' && (
                                <div className="animate-slide-down">
                                    <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Display Name</label>
                                    <div className="relative group">
                                        <UserIcon className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                        <input
                                            type="text"
                                            className="w-full bg-slate-950/50 border border-slate-800/60 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium placeholder:text-slate-600"
                                            placeholder="DJ Cool Guy"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full bg-slate-950/50 border border-slate-800/60 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium placeholder:text-slate-600"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            {authMode !== 'RESET' && (
                                <div className="animate-slide-down">
                                    <div className="flex justify-between items-center mb-2 ml-1">
                                        <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider">Password</label>
                                        {authMode === 'LOGIN' && (
                                            <button
                                                type="button"
                                                onClick={() => setAuthMode('RESET')}
                                                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                            >
                                                Forgot Password?
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        type="password"
                                        className="w-full bg-slate-950/50 border border-slate-800/60 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium placeholder:text-slate-600"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            )}

                            {authMode === 'REGISTER' && (
                                <div className="animate-slide-down">
                                    <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Confirm Password</label>
                                    <input
                                        type="password"
                                        className="w-full bg-slate-950/50 border border-slate-800/60 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium placeholder:text-slate-600"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoggingIn}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed mt-4 transform active:scale-[0.98] border border-white/10"
                            >
                                {isLoggingIn ? 'Processing...' : (
                                    authMode === 'LOGIN' ? 'Sign In' :
                                        authMode === 'REGISTER' ? 'Create Account' :
                                            'Send Reset Link'
                                )}
                            </button>
                        </form>
                    )}

                    {authMode !== 'RESET' && (
                        <>
                            <div className="relative my-8">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-800/80"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 text-slate-500 bg-[#0f1420] rounded-full text-xs font-medium uppercase tracking-wider">Or continue with</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={handleGoogleLogin}
                                    disabled={isLoggingIn}
                                    className="w-full bg-white text-slate-900 font-bold py-3.5 rounded-xl transition-all hover:bg-slate-100 flex items-center justify-center gap-3 transform active:scale-[0.98] shadow-md"
                                >
                                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                                    Google
                                </button>

                                <button
                                    onClick={handleGuestLogin}
                                    disabled={isLoggingIn}
                                    className="w-full bg-slate-800/80 hover:bg-slate-700/80 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3 transform active:scale-[0.98] border border-white/5"
                                >
                                    <Headphones className="w-5 h-5" />
                                    Guest Access
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <p className="mt-8 text-slate-500 text-sm font-medium">
                    By continuing, you agree to our <a href="#" className="text-indigo-400 hover:text-indigo-300">Terms of Service</a>.
                </p>
            </div>
        </div>
    );
};
