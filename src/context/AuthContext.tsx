import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Role, UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
    return null;
  };

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchProfile(user.uid);
      setProfile(p);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userProfile = await fetchProfile(user.uid);
        
        // If profile doesn't exist, we don't automatically create it anymore with default role
        // except for the super admin email for bootstrapping if needed.
        // Actually, if we use a register function, it will create the profile.
        // But for safety, keep the bootstrap logic but make it stricter.
        if (!userProfile && user.email === 'bhagyoday.export@gmail.com') {
          const bootstrapProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            role: 'admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await setDoc(doc(db, 'users', user.uid), bootstrapProfile);
          setProfile(bootstrapProfile);
        } else {
          setProfile(userProfile);
        }

        if (userProfile || user.email === 'bhagyoday.export@gmail.com') {
          // Start Heartbeat
          const updatePresence = async () => {
            try {
              await updateDoc(doc(db, 'users', user.uid), {
                lastSeen: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            } catch (e) {
              // Ignore updates if permission denied (might happen if profile deleted)
            }
          };
          updatePresence();
          interval = setInterval(updatePresence, 60000);
        }
      } else {
        setProfile(null);
        if (interval) clearInterval(interval);
      }
      setUser(user);
      setLoading(false);
    });

    return () => {
      unsub();
      if (interval) clearInterval(interval);
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
