// src/components/StudentDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Link } from "react-router-dom";

export default function StudentDetail() {
  const { id } = useParams(); // student id
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [student, setStudent] = useState(null);
  const [lessons, setLessons] = useState([]);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  });
  const BACKAPI =
    import.meta.env.MODE === "production"
      ? import.meta.env.VITE_PRODUCTION_API
      : import.meta.env.VITE_DEVELOPMENT_API;
  const formatNextRevision = (rev) => {
    if (!rev) return "—";

    // Single revision (string surah)
    if (typeof rev.surah === "string") {
      return `${rev.surah}: ${rev.fromAyah} → ${rev.toAyah} (${rev.count} آيات)`;
    }

    // Arrays case, but check they exist and have values
    if (Array.isArray(rev.surah)) {
      return rev.surah
        .map((s, idx) => {
          const from = rev.fromAyah?.[idx] ?? "؟";
          const to = rev.toAyah?.[idx] ?? "؟";
          return `${s}: ${from} ← ${to} `;
        })
        .join("، ");
    }

    // Fallback: stringify object
    return JSON.stringify(rev);
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKAPI}/api/students/${id}/history`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.data.success) throw new Error(res.data.message || "No data");
        setStudent(res.data.student);
        setLessons(res.data.lessons || []);
      } catch (err) {
        console.error(err);
        setError("فشل تحميل سجل الطالب. تحقق من الخادم.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-emerald-50">
        <svg
          className="animate-spin h-16 w-16 text-emerald-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      </div>
    );
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!student) return <div className="p-4">لم يتم العثور على الطالب.</div>;

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
      <div
        dir="rtl"
        className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 p-6"
      >
        {/* Header */}
        <header className="bg-emerald-700 text-white p-4 rounded shadow mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{student.name}</h1>
            <p className="text-sm text-emerald-100 mt-1">
              {student.notes || "لا توجد ملاحظات"}
            </p>
          </div>

          <div className="text-right">
            <button
              onClick={() => navigate(-1)}
              className="bg-white text-emerald-700 rounded px-3 py-1"
            >
              رجوع
            </button>
          </div>
        </header>

        {/* Lessons timeline (group-centric) */}
        <section className="bg-white p-4 rounded shadow mb-6 border border-emerald-200">
          <h2 className="text-lg font-semibold text-emerald-800 mb-3">
            سجل الحضور (الدروس)
          </h2>

          {lessons.length === 0 ? (
            <p className="text-sm text-emerald-500">
              لم يحضر هذا الطالب أي دروس حتى الآن.
            </p>
          ) : (
            <ul className="space-y-3">
              {lessons.map((l) => (
                <li key={l.lessonId} className="border rounded-md p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm text-emerald-600">
                        {new Date(l.lessonDate).toLocaleDateString()}
                        <br />
                        {new Date(l.lessonDate).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="font-medium text-emerald-900">
                        {l.groupTitle}
                      </div>
                      <div className="font-medium text-emerald-900">
                        {l.note}
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-sm ${
                          l.attended ? "text-emerald-700" : "text-red-600"
                        }`}
                      >
                        {l.attended ? "حضر" : "غائب"}
                      </div>
                      <button
                        onClick={() => navigate(`/groups/${l.groupId}`)}
                        className="mt-2 text-xs bg-gray-100 text-emerald-700 px-2 py-1 rounded"
                      >
                        تفاصيل المجموعة
                      </button>
                    </div>
                  </div>

                  {l.notes && (
                    <p className="mt-2 text-sm text-emerald-700">
                      ملاحظات: {l.notes}
                    </p>
                  )}
                  {l.nextRevision && (
                    <p className="mt-1 text-sm text-emerald-600">
                      المراجعة القادمة:{" "}
                      {formatNextRevision(l.nextRevision) + "\n"}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
