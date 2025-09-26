import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const BACKAPI =
  import.meta.env.MODE === "production"
    ? import.meta.env.VITE_PRODUCTION_API
    : import.meta.env.VITE_DEVELOPMENT_API;

function QuranLessonsHome() {
  const [date, setDate] = useState(() => {
    // default to now in datetime-local format
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().slice(0, 16);
  });

  const [loadingGroups, setLoadingGroups] = useState(true); // new state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = localStorage.getItem("token");

  const [groups, setGroups] = useState([]);
  const navigate = useNavigate();

  async function fetchGroups() {
    try {
      setLoadingGroups(true);
      const res = await axios.get(`${BACKAPI}/api/groups`);
      const list = res.data?.groups ?? [];
      setGroups(list);
    } catch (err) {
      console.warn("Couldn't fetch groups:", err.message);
      setGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  }

  useEffect(() => {
    fetchGroups();
    if (!token) {
      navigate("/login");
    }
  }, []);

  async function handleStartLesson(group) {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await axios.post(
        `${BACKAPI}/api/groups/${group._id ?? group.id}/lessons`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      const lesson = res.data?.lesson ?? res.data?.createdLesson ?? null;
      if (!lesson) {
        setError("لم يتم إنشاء الدرس — استجابة غير متوقعة");
        return;
      }

      navigate(`/groups/${group._id}/lessons/${lesson._id}`);

      setSuccess("تم بدء الدرس — جاهز للتعامل مع الحضور");
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error(err);
      setError("فشل بدء الدرس — تحقق من الخادم أو صلاحيات المستخدم");
    } finally {
      setLoading(false);
    }
  }
  const decoded = jwtDecode(token);
  return (
    <>
      <header className="bg-white border-b border-emerald-300 py-4 px-6 shadow-sm flex justify-between items-center">
        <h1 className="text-2xl font-bold text-emerald-700">منصة الحلقات</h1>
        <nav className="flex gap-4">
          <Link to="/" className="text-sm text-emerald-600 underline">
            الرئيسية
          </Link>
          <Link to="/admin" className="text-sm text-emerald-600 underline">
            التحكم
          </Link>
        </nav>
      </header>

      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&display=swap"
      />

      <div
        className="text-right min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-emerald-100"
        style={{ fontFamily: "'Cairo', sans-serif" }}
        dir="rtl"
      >
        <main className="p-6 flex-1">
          <div className="text-center text-3xl text-emerald-800 font-bold mb-6">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </div>
          <h2 className="text-4xl text-center font-extrabold text-emerald-800 mb-10 border-b border-emerald-400 inline-block pb-3">
            الحلقات القرآنية المباركة
          </h2>
          <div className="text-center text-red-600 mb-3">
            {decoded.name == "Visitor" ? "Unauthorized" : ""}
          </div>

          {/* LOADER */}
          {loadingGroups ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-16 h-16 border-4 border-emerald-500 border-dashed rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {groups.map((group) => (
                <div
                  key={group._id}
                  className="bg-white border border-emerald-200 shadow-lg rounded-xl p-6 transition-transform hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden"
                >
                  <h3 className="text-2xl font-bold text-emerald-800 mb-2">
                    {group.title}
                  </h3>
                  <p className="text-emerald-700 mb-2">
                    🕓 {group.time.split(" ")}
                  </p>
                  <p className="text-emerald-700 mb-4">📅 {group.day}</p>
                  <button
                    onClick={() => handleStartLesson(group)}
                    disabled={loading}
                    className={`w-full py-2 rounded-lg text-white ${
                      loading
                        ? "bg-emerald-400 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {loading ? "جارٍ..." : "بدء"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
      <footer className="bg-white border-t border-emerald-300 text-emerald-700 py-4 text-center text-sm mt-auto">
        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ &copy; {new Date().getFullYear()}{" "}
        منصة الحلقات القرآنية
      </footer>
    </>
  );
}

export default QuranLessonsHome;
