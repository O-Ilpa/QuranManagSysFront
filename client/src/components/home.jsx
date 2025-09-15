import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

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
  
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
  
    const token = localStorage.getItem("token");
  
  const [groups, setGroups] = useState([]);
  const navigate = useNavigate();

  async function fetchGroups() {
    try {
      const res = await axios.get(`${BACKAPI}/api/groups`);
      const list = res.data?.groups ?? [];
      console.log(res);
      setGroups(list);
    } catch (err) {
      console.warn("Couldn't fetch groups:", err.message);
      setGroups([]);
    }
  }

  useEffect(() => {
    fetchGroups();
    if (!token) {
    navigate("/login")
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

      // If you have a route for lesson flow, navigate there:
      navigate(`/groups/${group._id}/lessons/${lesson._id}`);

      // Otherwise just open console and show a quick success:
      setSuccess("تم بدء الدرس — جاهز للتعامل مع الحضور");
      console.log("Started lesson", lesson);
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error(err);
      setError("فشل بدء الدرس — تحقق من الخادم أو صلاحيات المستخدم");
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      {/* Google Fonts Link */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&display=swap"
      />

      <div
        className="text-right min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-emerald-100"
        style={{ fontFamily: "'Cairo', sans-serif" }}
        dir="rtl"
      >
        {/* HEADER */}
        

        {/* MAIN CONTENT */}
        <main className="p-6 flex-1">
          <div className="text-center text-3xl text-emerald-800 font-bold mb-6">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </div>
          <h2 className="text-4xl text-center font-extrabold text-emerald-800 mb-10 border-b border-emerald-400 inline-block pb-3">
            الحلقات القرآنية المباركة
          </h2>

          {/* GROUP LIST */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {groups.map((group) => (
              <div
                key={group._id}
                className="bg-white border border-emerald-200 shadow-lg rounded-xl p-6 transition-transform hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden"
              >
                <h3 className="text-2xl font-bold text-emerald-800 mb-2">
                  {group.title}
                </h3>
                <p className="text-emerald-700 mb-2">🕓 {group.time.split(" ") }</p>
                <p className="text-emerald-700 mb-4">📅 {group.day}</p>
                <button
                  onClick={() => handleStartLesson(group)}
                  className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700"
                >
                  بدء
                </button>
              </div>
            ))}
          </div>
        </main>

        {/* FOOTER */}
        
      </div>
    </>
  );
}

export default QuranLessonsHome;