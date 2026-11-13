import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import { PublicLayout } from './components/site/PublicLayout';
import { Spinner } from './components/ui/Feedback';
import Home from './pages/public/Home';
import About from './pages/public/About';
import Classes from './pages/public/Classes';
import ClassDetail from './pages/public/ClassDetail';
import Camps from './pages/public/Camps';
import CampDetail from './pages/public/CampDetail';
import Honors from './pages/public/Honors';
import News from './pages/public/News';
import NewsDetail from './pages/public/NewsDetail';
import Contact from './pages/public/Contact';
import Login from './pages/public/Login';
import NotFound from './pages/public/NotFound';
import StudentPanel from './pages/student/StudentPanel';
import TeacherPanel from './pages/teacher/TeacherPanel';
import AdminPanel from './pages/admin/AdminPanel';

const panelPath = (role) => (role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/student');

function RoleGate({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={panelPath(user.role)} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/classes" element={<Classes />} />
        <Route path="/classes/:id" element={<ClassDetail />} />
        <Route path="/camps" element={<Camps />} />
        <Route path="/camps/:id" element={<CampDetail />} />
        <Route path="/honors" element={<Honors />} />
        <Route path="/news" element={<News />} />
        <Route path="/news/:id" element={<NewsDetail />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/login" element={<Login />} />
      <Route
        path="/student/*"
        element={
          <RoleGate role="student">
            <StudentPanel />
          </RoleGate>
        }
      />
      <Route
        path="/teacher/*"
        element={
          <RoleGate role="teacher">
            <TeacherPanel />
          </RoleGate>
        }
      />
      <Route
        path="/admin/*"
        element={
          <RoleGate role="admin">
            <AdminPanel />
          </RoleGate>
        }
      />
    </Routes>
  );
}
