// App.jsx

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import QuranLessonsHome from "./components/home";
import LogIn from "./components/login";
import AdminDashboard from "./components/adminDash";
import GroupDetail from "./components/GroupDetail";
import LessonSession from "./components/LessonSession";
import StudentDetail from "./components/StudentDetail";

function App() {
  return (
    <Router>
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
    </Router>
  );
}

export default App;
