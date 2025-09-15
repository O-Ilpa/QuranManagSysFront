import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

// Same BACKAPI logic as homepage for dev/prod
const BACKAPI =
  import.meta.env.MODE === "production"
    ? import.meta.env.VITE_PRODUCTION_API
    : import.meta.env.VITE_DEVELOPMENT_API;

function StudentShow() {
  // Grab studentId from URL, navigate for redirects
  const { studentId } = useParams();
  const navigate = useNavigate();

  // States: student data, lessons from group aggregation, loading/error
  const [student, setStudent] = useState(null);
  const [studentLessons, setStudentLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch student data on mount or ID change
  useEffect(() => {
    if (!studentId) {
      setError("معرف الطالب غير موجود");
      setLoading(false);
      navigate("/");
      return;
    }

    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");
if (!token) {
    navigate("/login")
  }
    // Hit your Express route with auth header if token exists
    axios
      .get(`${BACKAPI}/api/students/${studentId}/history`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      .then((res) => {
        if (res.data.success) {
          setStudent(res.data.student);
          setStudentLessons(res.data.lessons || []);
        } else {
          setError(res.data.message || "لم يتم العثور على بيانات الطالب");
          navigate("/");
        }
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setError("خطأ في جلب البيانات – تحقق من الاتصال");
        navigate("/");
      })
      .finally(() => setLoading(false));
  }, [studentId, navigate]);

  // Format date in Arabic (e.g., "١٤ سبتمبر ٢٠٢٥")
  const formatDate = (date) =>
    new Date(date).toLocaleDateString("ar-SA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  // Format nextRevision if exists, handle arrays safely
  const formatRevision = (revision) =>
    revision
      ? `سورة ${revision.surah?.[0] || "غير محدد"} (من الآية ${
          revision.fromAyah?.[0] || "-"
        } إلى ${revision.toAyah?.[0] || "-"})`
      : "لا مراجعة مقررة";

  return (
    <>
      {/* Google Fonts for Cairo, same as homepage */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&display=swap"
      />
      <div
        className="text-right min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-emerald-100"
        style={{ fontFamily: "'Cairo', sans-serif" }}
        dir="rtl"
      >
        {/* Header – matches homepage, personalized greet */}
        <header className="bg-white border-b border-emerald-300 py-4 px-6 shadow-sm flex justify-between items-center">
          <h1 className="text-2xl font-bold text-emerald-700">منصة الحلقات</h1>
          <span className="text-sm text-emerald-600">
            مرحبا، {student?.name || "طالب العلم"} 🌙
          </span>
        </header>

        {/* Main Content */}
        <main className="p-6 flex-1">
          <div className="text-center text-3xl text-emerald-800 font-bold mb-6">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </div>
          <h2 className="text-4xl text-center font-extrabold text-emerald-800 mb-10 border-b border-emerald-400 inline-block pb-3">
            بيانات الطالب: {student?.name || "جاري التحميل..."}
          </h2>

          {/* Loading State */}
          {loading && (
            <div className="text-center text-emerald-600">
              جاري التحميل...{" "}
              <div className="inline-block w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-center">
              {error}
            </div>
          )}

          {/* Student Data – only show if loaded */}
          {!loading && !error && student && (
            <div className="max-w-4xl mx-auto">
              {/* Student Info Card */}
              <div className="bg-white border border-emerald-200 shadow-lg rounded-xl p-6 text-center mb-8 transition-transform hover:scale-[1.02]">
                <h3 className="text-3xl font-bold text-emerald-800 mb-2">
                  {student.name}
                </h3>
                <p className="text-emerald-700 text-lg mb-4">
                  {student.notes || "لا توجد ملاحظات خاصة"}
                </p>
                <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm">
                  عدد الدروس: {student.history?.length || 0}
                </span>
              </div>

              {/* History Timeline */}
              <h4 className="text-2xl font-bold text-emerald-700 mb-4">
                سجل الدروس
              </h4>
              {student.history?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {student.history.map((entry) => (
                    <div
                      key={entry._id}
                      className="bg-white border border-emerald-200 shadow-lg rounded-xl p-4 transition-transform hover:scale-[1.02]"
                    >
                      <h5 className="text-lg font-bold text-emerald-800">
                        المجموعة: {entry.group?.title || "غير محدد"}
                      </h5>
                      <p className="text-emerald-700">
                        التاريخ: {formatDate(entry.date)}
                      </p>
                      <p className="text-emerald-700">
                        المراجعة: {entry.revised ? "✅ تم" : "❌ لم يتم"}
                      </p>
                      <p className="text-emerald-600 italic">
                        {entry.notes || "بدون ملاحظات"}
                      </p>
                      <p className="text-emerald-700">
                        المراجعة القادمة: {formatRevision(entry.nextRevision)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-emerald-500 italic mb-8">
                  لا توجد دروس بعد – ابدأ رحلتك القرآنية! 📖
                </p>
              )}

              {/* Lesson Log Table */}
              <h4 className="text-2xl font-bold text-emerald-700 mb-4">
                سجل الحضور الكامل
              </h4>
              {studentLessons.length > 0 ? (
                <table className="w-full bg-white rounded-xl shadow-lg overflow-hidden">
                  <thead className="bg-emerald-100">
                    <tr>
                      <th className="p-3 text-right">المجموعة</th>
                      <th className="p-3 text-right">التاريخ</th>
                      <th className="p-3 text-right">الحضور</th>
                      <th className="p-3 text-right">ملاحظات</th>
                      <th className="p-3 text-right">المراجعة القادمة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentLessons.map((entry) => (
                      <tr key={entry.lessonId} className="border-t">
                        <td className="p-3">
                          {entry.groupTitle || "غير محدد"}
                        </td>
                        <td className="p-3">{formatDate(entry.lessonDate)}</td>
                        <td className="p-3">
                          {entry.attended ? "حضر ✅" : "غاب ❌"}
                        </td>
                        <td className="p-3">{entry.notes || "بدون ملاحظات"}</td>
                        <td className="p-3">
                          {formatRevision(entry.nextRevision)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-center text-emerald-500 italic">
                  لا توجد سجلات حضور بعد – استمر في التقدم! 📚
                </p>
              )}
            </div>
          )}
        </main>

        {/* Footer – identical to homepage */}
        <footer className="bg-white border-t border-emerald-300 text-emerald-700 py-4 text-center text-sm mt-auto">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ &copy;{" "}
          {new Date().getFullYear()} منصة الحلقات القرآنية
        </footer>
      </div>
    </>
  );
}

export default StudentShow;
