import React, { useState } from 'react';
import { registerUser, loginAdminOrDj, loginListener, signInWithGoogle } from '../services/firebase';
import { Music, Headphones, User as UserIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const AuthPage: React.FC = () => {
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

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
            } else {
                await loginAdminOrDj(email, password, 'LISTENER');
            }
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setLoginError("This email is already registered. Please log in instead.");
            } else if (err.code === 'auth/weak-password') {
                setLoginError("Password must be at least 6 characters.");
            } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-email') {
                setLoginError("Invalid email or password.");
            } else if (err.message) {
                setLoginError(err.message);
            } else {
                setLoginError("Login failed. Please try again.");
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
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="text-center mb-8 space-y-2">
                <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-indigo-500/20 mb-6 rotate-3">
                    <Music className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-black text-white tracking-tight">PassTheAux</h1>
                <p className="text-slate-400 text-lg">The social jukebox for modern events.</p>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl">
                <div className="flex gap-2 mb-8 bg-slate-800/50 p-1 rounded-xl">
                    <button
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${authMode === 'LOGIN' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        onClick={() => setAuthMode('LOGIN')}
                    >
                        Sign In
                    </button>
                    <button
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${authMode === 'REGISTER' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        onClick={() => setAuthMode('REGISTER')}
                    >
                        Create Account
                    </button>
                </div>

                {loginError && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        {loginError}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    {authMode === 'REGISTER' && (
                        <div>
                            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1.5 ml-1">Display Name</label>
                            <div className="relative group">
                                <UserIcon className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                <input
                                    type="text"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium placeholder:text-slate-600"
                                    placeholder="DJ Cool Guy"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1.5 ml-1">Email</label>
                        <input
                            type="email"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium placeholder:text-slate-600"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1.5 ml-1">Password</label>
                        <input
                            type="password"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium placeholder:text-slate-600"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {authMode === 'REGISTER' && (
                        <div>
                            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1.5 ml-1">Confirm Password</label>
                            <input
                                type="password"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium placeholder:text-slate-600"
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
                        className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed mt-2 transform active:scale-95"
                    >
                        {isLoggingIn ? 'Please wait...' : (authMode === 'LOGIN' ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-800"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 text-slate-500 bg-slate-900/50 backdrop-blur-xl">Or continue with</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoggingIn}
                        className="w-full bg-white text-slate-900 font-bold py-3.5 rounded-xl transition-all hover:bg-slate-100 flex items-center justify-center gap-3 transform active:scale-95"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                        Google
                    </button>

                    <button
                        onClick={handleGuestLogin}
                        disabled={isLoggingIn}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3 transform active:scale-95"
                    >
                        <Headphones className="w-5 h-5" />
                        Guest Access
                    </button>
                </div>
            </div>

            <p className="mt-8 text-slate-600 text-sm">
                By continuing, you agree to our Terms of Service.
            </p>
        </div>
    );
};
