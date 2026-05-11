import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AcademyLayout } from '../layouts/AcademyLayout'
import { StudentLayout } from '../layouts/StudentLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { AcademyDashboardPage } from '../../features/academy/AcademyDashboardPage'
import { LoginPage } from '../../features/auth/LoginPage'
import { PasswordResetPage } from '../../features/auth/PasswordResetPage'
import { CheckinsPage } from '../../features/checkins/CheckinsPage'
import { CheckinReviewPage } from '../../features/checkins/CheckinReviewPage'
import { GraduationPage } from '../../features/graduation/GraduationPage'
import { PaymentsPage } from '../../features/payments/PaymentsPage'
import { StudentPaymentPage } from '../../features/payments/StudentPaymentPage'
import { SettingsPage } from '../../features/settings/SettingsPage'
import { StudentHomePage } from '../../features/student-home/StudentHomePage'
import { StudentProfilePage } from '../../features/student-home/StudentProfilePage'
import { StudentsPage } from '../../features/students/StudentsPage'
import { StudentCheckinPage } from '../../features/checkins/StudentCheckinPage'
import { StudentSchedulePage } from '../../features/student-home/StudentSchedulePage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />
  },
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/login/reset',
    element: <PasswordResetPage />
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={["academy_admin"]}>
        <AcademyLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AcademyDashboardPage /> },
      { path: 'alunos', element: <StudentsPage /> },
      { path: 'check-ins', element: <CheckinsPage /> },
      { path: 'check-ins/review/:sessionId', element: <CheckinReviewPage /> },
      { path: 'mensalidades', element: <PaymentsPage /> },
      { path: 'graduacao', element: <GraduationPage /> },
      { path: 'configuracoes', element: <SettingsPage /> }
    ]
  },
  {
    path: '/aluno',
    element: (
      <ProtectedRoute allowedRoles={["student"]}>
        <StudentLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <StudentHomePage /> },
      { path: 'check-in', element: <StudentCheckinPage /> },
      { path: 'mensalidade', element: <StudentPaymentPage /> },
      { path: 'graduacao', element: <GraduationPage /> },
      { path: 'horarios', element: <StudentSchedulePage /> },
      { path: 'perfil', element: <StudentProfilePage /> }
    ]
  }
])
