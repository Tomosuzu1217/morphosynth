import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { auth, loginWithGoogle, logout } from '../services/firebase';

const AuthButton: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((u) => {
            setUser(u);
        });
        return () => unsubscribe();
    }, []);

    if (user) {
        return (
            <div className="fixed top-4 right-4 z-50 flex items-center gap-4">
                <div className="text-[10px] text-white/50 font-mono tracking-wider hidden md:block">
                    USER: {user.displayName || 'ANONYMOUS'}
                </div>
                <button
                    onClick={logout}
                    className="px-3 py-1 border border-white/20 bg-black/50 text-[10px] text-white/60 
                   hover:text-white hover:border-white/50 transition-all uppercase tracking-widest"
                >
                    Logout
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={loginWithGoogle}
            className="fixed top-4 right-4 z-50 px-4 py-2 bg-white text-black text-[10px] font-bold 
               hover:bg-gray-200 transition-all uppercase tracking-[0.2em]"
        >
            Login / Sign Up
        </button>
    );
};

export default AuthButton;
