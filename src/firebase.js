import { initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const isFirebaseReady = Object.values(firebaseConfig).every(Boolean)

const app = isFirebaseReady ? initializeApp(firebaseConfig) : null
const auth = app ? getAuth(app) : null
const db = app ? getFirestore(app) : null

const usersCollection = db ? collection(db, 'users') : null
const coursesCollection = db ? collection(db, 'courses') : null
const enrollmentsCollection = db ? collection(db, 'enrollments') : null
const notificationsCollection = db ? collection(db, 'notifications') : null

const serializeDoc = (snapshot) => ({
  id: snapshot.id,
  ...snapshot.data(),
})

export { auth, db, isFirebaseReady }

export const subscribeToAuth = (callback) => {
  if (!auth) {
    callback(null)
    return () => {}
  }

  return onAuthStateChanged(auth, callback)
}

export const login = (email, password) => signInWithEmailAndPassword(auth, email, password)

export const logout = () => signOut(auth)

export const register = async ({ email, password, name, mobileNo, volunteerNumber }) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  const firstJoinDate = new Date().toISOString().slice(0, 10)

  await updateProfile(credential.user, {
    displayName: name,
  })

  await setDoc(doc(db, 'users', credential.user.uid), {
    name,
    mobileNo,
    volunteerNumber,
    firstJoinDate,
    email,
    isAdmin: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return credential
}

export const saveUserProfile = (uid, profile) =>
  setDoc(
    doc(db, 'users', uid),
    {
      ...profile,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )

export const fetchUserProfile = async (uid) => {
  const snapshot = await getDoc(doc(db, 'users', uid))
  return snapshot.exists() ? snapshot.data() : null
}

export const subscribeToCourses = (callback) =>
  onSnapshot(query(coursesCollection, orderBy('date', 'asc')), (snapshot) => {
    callback(snapshot.docs.map(serializeDoc))
  })

export const subscribeToEnrollments = (uid, callback) =>
  onSnapshot(query(enrollmentsCollection, where('uid', '==', uid)), (snapshot) => {
    callback(snapshot.docs.map(serializeDoc))
  })

export const subscribeToNotifications = (callback) =>
  onSnapshot(query(notificationsCollection, orderBy('createdAt', 'desc')), (snapshot) => {
    callback(snapshot.docs.map(serializeDoc))
  })

export const subscribeToUsers = (callback) =>
  onSnapshot(query(usersCollection, orderBy('name', 'asc')), (snapshot) => {
    callback(snapshot.docs.map(serializeDoc))
  })

export const createCourseSchedule = async ({ title, date }) => {
  const course = {
    title,
    date,
    createdAt: serverTimestamp(),
  }

  const courseRef = await addDoc(coursesCollection, course)

  await addDoc(notificationsCollection, {
    message: `New course scheduled: ${title} (${date})`,
    courseId: courseRef.id,
    createdAt: serverTimestamp(),
  })
}

export const enrollInCourse = (uid, courseId) =>
  setDoc(doc(db, 'enrollments', `${uid}_${courseId}`), {
    uid,
    courseId,
    enrolledDate: new Date().toISOString().slice(0, 10),
    paid: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

export const updateEnrollmentPaidStatus = (enrollmentId, paid) =>
  updateDoc(doc(db, 'enrollments', enrollmentId), {
    paid,
    updatedAt: serverTimestamp(),
  })

export const updateManagedUser = (uid, updates) =>
  updateDoc(doc(db, 'users', uid), {
    ...updates,
    updatedAt: serverTimestamp(),
  })
