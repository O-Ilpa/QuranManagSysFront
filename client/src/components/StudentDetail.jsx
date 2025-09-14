// src/components/StudentDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function StudentDetail() {
  const { id } = useParams(); // student id
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [student, setStudent] = useState(null);
  const [lessons, setLessons] = useState([]);

  const BACKAPI =
    import.meta.env.MODE === "production"
      ? import.meta.env.VITE_PRODUCTION_API
      : import.meta.env.VITE_DEVELOPMENT_API;

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

  if (loading) return <div className="p-4">جاري التحميل...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!student) return <div className="p-4">لم يتم العثور على الطالب.</div>;

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 p-6">
      {/* Header */}
      <header className="bg-emerald-700 text-white p-4 rounded shadow mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{student.name}</h1>
          <p className="text-sm text-emerald-100 mt-1">{student.notes || "لا توجد ملاحظات"}</p>
        </div>

        <div className="text-right">
          <button onClick={() => navigate(-1)} className="bg-white text-emerald-700 rounded px-3 py-1">
            رجوع
          </button>
          <button
            onClick={() => navigate(`/groups/${id}`)} // optional: adjust nav to open group or student editing
            className="ml-2 bg-emerald-600 text-white rounded px-3 py-1"
          >
            فتح الملف
          </button>
        </div>
      </header>

      {/* Lessons timeline (group-centric) */}
      <section className="bg-white p-4 rounded shadow mb-6 border border-emerald-200">
        <h2 className="text-lg font-semibold text-emerald-800 mb-3">سجل الحضور (الدروس)</h2>

        {lessons.length === 0 ? (
          <p className="text-sm text-emerald-500">لم يحضر هذا الطالب أي دروس حتى الآن.</p>
        ) : (
          <ul className="space-y-3">
            {lessons.map((l) => (
              <li key={l.lessonId} className="border rounded-md p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm text-emerald-600">
                      {new Date(l.lessonDate).toLocaleDateString()}{" "}
                      <span className="mx-2">•</span> {new Date(l.lessonDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="font-medium text-emerald-900">{l.groupTitle}</div>
                  </div>

                  <div className="text-right">
                    <div className={`text-sm ${l.attended ? "text-emerald-700" : "text-red-600"}`}>
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

                {l.notes && <p className="mt-2 text-sm text-emerald-700">ملاحظات: {l.notes}</p>}
                {l.nextRevision && <p className="mt-1 text-sm text-emerald-600">المراجعة القادمة: {l.nextRevision}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Student personal history (mirrors what we also push into Student.history) */}
      <section className="bg-white p-4 rounded shadow border border-emerald-200">
        <h2 className="text-lg font-semibold text-emerald-800 mb-3">سجل الطالب التفصيلي</h2>

        {(!student.history || student.history.length === 0) ? (
          <p className="text-sm text-emerald-500">لم تسجل أي ملاحظات تاريخية لهذا الطالب.</p>
        ) : (
          <ul className="space-y-3">
            {student.history.map((h, i) => (
              <li key={i} className="bg-emerald-50 p-3 rounded-md border">
                <div className="text-sm text-emerald-700 mb-1">
                  <strong>التاريخ:</strong> {new Date(h.date).toLocaleDateString()}
                </div>
                <div className="text-sm mb-1"><strong>المجموعة:</strong> {h.group?.title ?? "—"}</div>
                <div className="text-sm mb-1"><strong>راجع:</strong> {h.revised ? "✔️" : "❌"}</div>
                {h.notes && <div className="text-sm mb-1">ملاحظات: {h.notes}</div>}
                {h.nextRevision && <div className="text-sm">المراجعة القادمة: {h.nextRevision}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
