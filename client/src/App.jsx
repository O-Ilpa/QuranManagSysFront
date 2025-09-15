// App.jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,   // 👈 import Link
} from "react-router-dom";
import QuranLessonsHome from "./components/home";
import LogIn from "./components/login";
import AdminDashboard from "./components/adminDash";
import GroupDetail from "./components/GroupDetail";
import LessonSession from "./components/LessonSession";
import StudentDetail from "./components/StudentDetail";

function App() {
  return (
    <Router>
      {/* HEADER */}
      <header className="bg-white border-b border-emerald-300 py-4 px-6 shadow-sm flex justify-between items-center">
        <h1 className="text-2xl font-bold text-emerald-700">
          منصة الحلقات
        </h1>
        <nav className="flex gap-4">
          <Link to="/" className="text-sm text-emerald-600 hover:underline">
            الصفحة الرئيسية
          </Link>
          <Link to="/admin" className="text-sm text-emerald-600 hover:underline">
            لوحة التحكم
          </Link>
        </nav>
      </header>

      {/* ROUTES */}
      <Routes>
        <Route path="/" element={<QuranLessonsHome />} />
        <Route path="/login" element={<LogIn />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/groups/:id" element={<GroupDetail />} />
        <Route
          path="/groups/:groupId/lessons/:lessonId/"
          element={<LessonSession />}
        />
        <Route path="/students/:id" element={<StudentDetail />} />
      </Routes>

      {/* FOOTER */}
      <footer className="bg-white border-t border-emerald-300 text-emerald-700 py-4 text-center text-sm mt-auto">
        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ &copy; {new Date().getFullYear()}{" "}
        منصة الحلقات القرآنية
      </footer>
    </Router>
  );
}

export default App;
