import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  User,
  sendEmailVerification
} from 'firebase/auth';
import { auth } from '../firebase';

type AuthContextType = {
  currentUser: User | null;
  signup: (email: string, password: string) => Promise<any>;
  login: (email: string, password: string) => Promise<any>;
  loginWithGoogle: () => Promise<any>;
  logout: () => Promise<void>;
  userRole: string | null;
  isAdmin: () => boolean;
  sendVerificationEmail: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  async function signup(email: string, password: string) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Kirim email verifikasi setelah signup berhasil
    if (userCredential.user) {
      await sendEmailVerification(userCredential.user);
    }
    return userCredential;
  }

  function login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    // Add scopes to request user profile information including profile picture
    provider.addScope('profile');
    provider.addScope('email');
    // Set custom parameters for better user experience
    provider.setCustomParameters({
      prompt: 'select_account',
      login_hint: 'user@gmail.com',
      redirect_uri: window.location.origin + '/login'
    });
    
    try {
      const result = await signInWithPopup(auth, provider);
      // Get the Google user info
      const user = result.user;
      // Get credential for debugging if needed
      // const credential = GoogleAuthProvider.credentialFromResult(result);
      
      // Log the user information for debugging
      console.log("Google login successful:", user);
      console.log("User photo URL:", user.photoURL);
      console.log("User display name:", user.displayName);
      
      // If we have a user but no photoURL or displayName, try to update from Google data
      if (user && (!user.photoURL || !user.displayName)) {
        const googleUser = result.user;
        if (googleUser.photoURL || googleUser.displayName) {
          try {
            await updateProfile(user, {
              displayName: googleUser.displayName || user.displayName,
              photoURL: googleUser.photoURL || user.photoURL
            });
            console.log("Updated user profile with Google data");
          } catch (error) {
            console.error("Error updating profile:", error);
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error("Google login error:", error);
      throw error;
    }
  }

  // Fungsi untuk mengirim ulang email verifikasi
  async function sendVerificationEmail() {
    if (currentUser && !currentUser.emailVerified) {
      try {
        await sendEmailVerification(currentUser);
        console.log("Verification email sent");
      } catch (error) {
        console.error("Error sending verification email:", error);
        throw error;
      }
    } else if (!currentUser) {
      throw new Error("No user is currently logged in");
    } else {
      throw new Error("User email is already verified");
    }
  }

  function logout() {
    // After signing out, navigate to landing page
    return signOut(auth).then(() => {
      // Force navigation to landing page
      window.location.href = '/';
    });
  }

  function isAdmin() {
    return userRole === 'admin';
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      
      // For demonstration, set a default role
      // In a real app, you would fetch this from your database
      if (user) {
        // Log user info for debugging
        console.log("Auth state changed - user logged in:", user);
        console.log("User photo URL:", user.photoURL);
        console.log("User display name:", user.displayName);
        console.log("Email verified:", user.emailVerified);
        
        // Set user role (in a real app, fetch from database)
        setUserRole('user');
        
        // If user email contains admin, set as admin (for demo)
        if (user.email && user.email.includes('admin')) {
          setUserRole('admin');
        }
      } else {
        console.log("Auth state changed - user logged out");
        setUserRole(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    loginWithGoogle,
    logout,
    userRole,
    isAdmin,
    sendVerificationEmail
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
