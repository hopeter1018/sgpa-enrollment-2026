import { useEffect, useMemo, useState } from 'react'
import {
  createCourseSchedule,
  enrollInCourse,
  fetchUserProfile,
  isFirebaseReady,
  login,
  logout,
  register,
  saveUserProfile,
  subscribeToAuth,
  subscribeToCourses,
  subscribeToEnrollments,
  subscribeToNotifications,
  subscribeToUsers,
  updateEnrollmentPaidStatus,
  updateManagedUser,
} from './firebase'

const demoCourses = [
  { id: 'course-a', title: 'Basic Aid & Response', date: '2026-05-03' },
  { id: 'course-b', title: 'Community Safety Drill', date: '2026-05-10' },
]

const demoNotifications = [
  {
    id: 'note-a',
    message: 'New course scheduled: Basic Aid & Response (2026-05-03)',
  },
]

const inputStyle =
  'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200'

const cardStyle = 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm'

const getToday = () => new Date().toISOString().slice(0, 10)

function App() {
  const [authMode, setAuthMode] = useState('login')
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    name: '',
    mobileNo: '',
    volunteerNumber: '',
  })
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [courses, setCourses] = useState(demoCourses)
  const [enrollments, setEnrollments] = useState([])
  const [notifications, setNotifications] = useState(demoNotifications)
  const [managedUsers, setManagedUsers] = useState([])
  const [courseForm, setCourseForm] = useState({ title: '', date: getToday() })
  const [error, setError] = useState('')

  const isDemo = !isFirebaseReady

  useEffect(() => {
    if (isDemo) {
      return
    }

    const unsubscribe = subscribeToAuth(async (firebaseUser) => {
      setUser(firebaseUser)

      if (!firebaseUser) {
        setProfile(null)
        return
      }

      const loadedProfile = await fetchUserProfile(firebaseUser.uid)
      setProfile(loadedProfile)
    })

    return unsubscribe
  }, [isDemo])

  useEffect(() => {
    if (isDemo || !user) {
      return
    }

    const unsubCourses = subscribeToCourses(setCourses)
    const unsubNotifications = subscribeToNotifications(setNotifications)
    const unsubEnrollments = subscribeToEnrollments(user.uid, setEnrollments)

    return () => {
      unsubCourses()
      unsubNotifications()
      unsubEnrollments()
    }
  }, [isDemo, user])

  useEffect(() => {
    if (isDemo || !profile?.isAdmin) {
      return
    }

    const unsubUsers = subscribeToUsers(setManagedUsers)

    return () => {
      unsubUsers()
    }
  }, [isDemo, profile?.isAdmin])

  const enrollmentMap = useMemo(
    () => new Map(enrollments.map((enrollment) => [enrollment.courseId, enrollment])),
    [enrollments],
  )

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (isDemo) {
      const demoUser = {
        uid: 'demo-user',
        email: authData.email || 'demo@local.test',
      }

      setUser(demoUser)
      setProfile({
        name: authData.name || 'Demo Volunteer',
        mobileNo: authData.mobileNo || '0123456789',
        volunteerNumber: authData.volunteerNumber || 'V-0001',
        firstJoinDate: '2026-01-01',
        isAdmin: true,
      })
      return
    }

    try {
      if (authMode === 'login') {
        await login(authData.email, authData.password)
      } else {
        await register(authData)
      }
    } catch (caughtError) {
      setError(caughtError.message)
    }
  }

  const handleProfileChange = (field, value) => {
    setProfile((currentProfile) => ({ ...currentProfile, [field]: value }))
  }

  const handleProfileSave = async () => {
    if (!profile) {
      return
    }

    setError('')

    if (isDemo) {
      return
    }

    try {
      await saveUserProfile(user.uid, profile)
    } catch (caughtError) {
      setError(caughtError.message)
    }
  }

  const handleEnroll = async (courseId) => {
    setError('')

    if (isDemo) {
      setEnrollments((currentEnrollments) => {
        if (currentEnrollments.some((item) => item.courseId === courseId)) {
          return currentEnrollments
        }

        return [
          ...currentEnrollments,
          {
            id: `demo-${courseId}`,
            courseId,
            enrolledDate: getToday(),
            paid: false,
          },
        ]
      })
      return
    }

    try {
      await enrollInCourse(user.uid, courseId)
    } catch (caughtError) {
      setError(caughtError.message)
    }
  }

  const handleCreateCourse = async (event) => {
    event.preventDefault()
    setError('')

    if (!courseForm.title.trim() || !courseForm.date) {
      setError('Course title and date are required.')
      return
    }

    if (isDemo) {
      const courseId = `course-${Date.now()}`
      const title = courseForm.title.trim()

      setCourses((currentCourses) => [...currentCourses, { id: courseId, title, date: courseForm.date }])
      setNotifications((currentNotifications) => [
        { id: `note-${Date.now()}`, message: `New course scheduled: ${title} (${courseForm.date})` },
        ...currentNotifications,
      ])
      setCourseForm({ title: '', date: getToday() })
      return
    }

    try {
      await createCourseSchedule({ title: courseForm.title.trim(), date: courseForm.date })
      setCourseForm({ title: '', date: getToday() })
    } catch (caughtError) {
      setError(caughtError.message)
    }
  }

  const handleTogglePaid = async (enrollmentId, paid) => {
    if (isDemo) {
      setEnrollments((currentEnrollments) =>
        currentEnrollments.map((enrollment) =>
          enrollment.id === enrollmentId ? { ...enrollment, paid } : enrollment,
        ),
      )
      return
    }

    try {
      await updateEnrollmentPaidStatus(enrollmentId, paid)
    } catch (caughtError) {
      setError(caughtError.message)
    }
  }

  const handleUserAdminUpdate = async (uid, isAdmin) => {
    if (isDemo) {
      setManagedUsers((currentUsers) =>
        currentUsers.map((managedUser) =>
          managedUser.id === uid ? { ...managedUser, isAdmin } : managedUser,
        ),
      )
      return
    }

    try {
      await updateManagedUser(uid, { isAdmin })
    } catch (caughtError) {
      setError(caughtError.message)
    }
  }

  const handleLogout = async () => {
    if (isDemo) {
      setUser(null)
      setProfile(null)
      return
    }

    await logout()
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <header className="rounded-xl bg-indigo-700 p-6 text-white shadow-lg">
          <h1 className="text-2xl font-semibold md:text-3xl">SGPA Course Enrollment System</h1>
          <p className="mt-2 text-sm text-indigo-100">
            Firebase auth + firestore powered enrollment, calendar tracking and schedule alerts.
          </p>
          {isDemo && (
            <p className="mt-3 rounded-md bg-indigo-600 px-3 py-2 text-xs text-indigo-100">
              Demo mode is enabled because Firebase environment variables are missing.
            </p>
          )}
        </header>

        {error && <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

        {!user ? (
          <section className={cardStyle}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Volunteer Login</h2>
              <button
                type="button"
                className="text-sm font-medium text-indigo-600"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              >
                {authMode === 'login' ? 'Need an account? Register' : 'Already registered? Login'}
              </button>
            </div>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={handleAuthSubmit}>
              <label className="text-sm font-medium md:col-span-1">
                Email
                <input
                  required
                  type="email"
                  autoComplete="email"
                  className={inputStyle}
                  value={authData.email}
                  onChange={(event) => setAuthData({ ...authData, email: event.target.value })}
                />
              </label>
              <label className="text-sm font-medium md:col-span-1">
                Password
                <input
                  required
                  type="password"
                  minLength={6}
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  className={inputStyle}
                  value={authData.password}
                  onChange={(event) => setAuthData({ ...authData, password: event.target.value })}
                />
              </label>
              {authMode === 'register' && (
                <>
                  <label className="text-sm font-medium">
                    Name
                    <input
                      required
                      className={inputStyle}
                      value={authData.name}
                      onChange={(event) => setAuthData({ ...authData, name: event.target.value })}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Mobile No
                    <input
                      required
                      className={inputStyle}
                      value={authData.mobileNo}
                      onChange={(event) => setAuthData({ ...authData, mobileNo: event.target.value })}
                    />
                  </label>
                  <label className="text-sm font-medium md:col-span-2">
                    Volunteer Number
                    <input
                      required
                      className={inputStyle}
                      value={authData.volunteerNumber}
                      onChange={(event) =>
                        setAuthData({ ...authData, volunteerNumber: event.target.value })
                      }
                    />
                  </label>
                </>
              )}
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 md:col-span-2"
              >
                {authMode === 'login' ? 'Login' : 'Create account'}
              </button>
            </form>
          </section>
        ) : (
          <>
            <section className={cardStyle}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">My Profile</h2>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm font-medium">
                  Name
                  <input
                    className={inputStyle}
                    value={profile?.name ?? ''}
                    onChange={(event) => handleProfileChange('name', event.target.value)}
                  />
                </label>
                <label className="text-sm font-medium">
                  Mobile No
                  <input
                    className={inputStyle}
                    value={profile?.mobileNo ?? ''}
                    onChange={(event) => handleProfileChange('mobileNo', event.target.value)}
                  />
                </label>
                <label className="text-sm font-medium">
                  Volunteer Number
                  <input
                    className={inputStyle}
                    value={profile?.volunteerNumber ?? ''}
                    onChange={(event) => handleProfileChange('volunteerNumber', event.target.value)}
                  />
                </label>
                <label className="text-sm font-medium">
                  First Join Date (readonly)
                  <input
                    className={`${inputStyle} bg-slate-100`}
                    readOnly
                    value={profile?.firstJoinDate ?? getToday()}
                  />
                </label>
              </div>
              <button
                type="button"
                className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                onClick={handleProfileSave}
              >
                Save Profile
              </button>
            </section>

            <section className={`${cardStyle} overflow-x-auto`}>
              <h2 className="mb-4 text-lg font-semibold">Course Calendar</h2>
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    <th className="px-3 py-2">Course</th>
                    <th className="px-3 py-2">Available Date</th>
                    <th className="px-3 py-2">Enrolled Date</th>
                    <th className="px-3 py-2">Paid Status</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => {
                    const enrollment = enrollmentMap.get(course.id)

                    return (
                      <tr key={course.id} className="border-t border-slate-200">
                        <td className="px-3 py-2">{course.title}</td>
                        <td className="px-3 py-2">{course.date}</td>
                        <td className="px-3 py-2">{enrollment?.enrolledDate ?? '-'}</td>
                        <td className="px-3 py-2">
                          {enrollment ? (enrollment.paid ? 'Paid' : 'Pending') : '-'}
                        </td>
                        <td className="px-3 py-2">
                          {!enrollment ? (
                            <button
                              type="button"
                              className="rounded-md bg-indigo-600 px-3 py-1 text-white"
                              onClick={() => handleEnroll(course.id)}
                            >
                              Enroll
                            </button>
                          ) : (
                            <span className="text-emerald-600">Enrolled</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </section>

            <section className={cardStyle}>
              <h2 className="mb-4 text-lg font-semibold">Notifications</h2>
              <ul className="space-y-2 text-sm">
                {notifications.length === 0 ? (
                  <li className="rounded-md bg-slate-100 px-3 py-2 text-slate-500">
                    No schedule notifications yet.
                  </li>
                ) : (
                  notifications.map((notification) => (
                    <li key={notification.id} className="rounded-md bg-slate-100 px-3 py-2">
                      {notification.message}
                    </li>
                  ))
                )}
              </ul>
            </section>

            {profile?.isAdmin && (
              <section className={`${cardStyle} space-y-6`}>
                <h2 className="text-lg font-semibold">Admin Console</h2>

                <form className="grid gap-3 md:grid-cols-3" onSubmit={handleCreateCourse}>
                  <h3 className="md:col-span-3 text-base font-semibold">Manage Course Schedule</h3>
                  <label className="text-sm font-medium md:col-span-2">
                    Course Title
                    <input
                      className={inputStyle}
                      value={courseForm.title}
                      onChange={(event) =>
                        setCourseForm({ ...courseForm, title: event.target.value })
                      }
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Available Date
                    <input
                      type="date"
                      className={inputStyle}
                      value={courseForm.date}
                      onChange={(event) => setCourseForm({ ...courseForm, date: event.target.value })}
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 md:col-span-3"
                  >
                    Add Course Schedule
                  </button>
                </form>

                <div className="overflow-x-auto">
                  <h3 className="mb-3 text-base font-semibold">Manage Users & Paid Status</h3>
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-left">
                        <th className="px-3 py-2">User</th>
                        <th className="px-3 py-2">Volunteer No.</th>
                        <th className="px-3 py-2">Admin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {managedUsers.map((managedUser) => (
                        <tr key={managedUser.id} className="border-t border-slate-200">
                          <td className="px-3 py-2">{managedUser.name || managedUser.email}</td>
                          <td className="px-3 py-2">{managedUser.volunteerNumber || '-'}</td>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={Boolean(managedUser.isAdmin)}
                              onChange={(event) =>
                                handleUserAdminUpdate(managedUser.id, event.target.checked)
                              }
                            />
                          </td>
                        </tr>
                      ))}
                      {managedUsers.length === 0 && (
                        <tr>
                          <td className="px-3 py-2 text-slate-500" colSpan={3}>
                            No user records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-left">
                        <th className="px-3 py-2">Enrollment</th>
                        <th className="px-3 py-2">Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrollments.map((enrollment) => {
                        const course = courses.find((item) => item.id === enrollment.courseId)

                        return (
                          <tr key={enrollment.id} className="border-t border-slate-200">
                            <td className="px-3 py-2">{course?.title || enrollment.courseId}</td>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={Boolean(enrollment.paid)}
                                onChange={(event) =>
                                  handleTogglePaid(enrollment.id, event.target.checked)
                                }
                              />
                            </td>
                          </tr>
                        )
                      })}
                      {enrollments.length === 0 && (
                        <tr>
                          <td className="px-3 py-2 text-slate-500" colSpan={2}>
                            No enrollments yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}

export default App
