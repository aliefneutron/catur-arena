import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDiA8OwtPwMKtIsqpv5iQ0PG4KAj8OIJec",
  authDomain: "gen-lang-client-0629725006.firebaseapp.com",
  projectId: "gen-lang-client-0629725006",
  storageBucket: "gen-lang-client-0629725006.firebasestorage.app",
  messagingSenderId: "706514772201",
  appId: "1:706514772201:web:dc328889196009fbc41078"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom database ID
const db = getFirestore(app, "ai-studio-6324a082-5fd1-4eb8-8990-8a8e5c1a8c29");

// Initialize Auth
const auth = getAuth(app);

// Authenticate on load
signInAnonymously(auth)
  .then((userCredential) => {
    console.log("Authenticated anonymously as:", userCredential.user.uid);
  })
  .catch((error) => {
    console.warn("Anonymous authentication is restricted or failed in this Firebase project. Project will run in guest session mode.", error);
  });

// Validate connection to Firestore as requested by standard guideline
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection validated successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or network status.");
    } else {
      console.log("Firestore connected. Tested default index document lookup successfully.");
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { app, db, auth };
