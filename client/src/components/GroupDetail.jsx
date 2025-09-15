import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import axios from "axios";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";

export default function GroupDetail() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [success, setSuccess] = useState()
  const navigate = useNavigate();

  const BACKAPI =
    import.meta.env.MODE === "production"
      ? import.meta.env.VITE_PRODUCTION_API
      : import.meta.env.VITE_DEVELOPMENT_API;
  const token = localStorage.getItem("token");

    useEffect(() => {
      if (!token) {
      navigate("/login")
    }
    })

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
      console.log("Started lesson", lesson);
    } catch (err) {
      console.error(err);
      setError("فشل بدء الدرس — تحقق من الخادم أو صلاحيات المستخدم");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    async function fetchGroup() {
      try {
        const res = await axios.get(`${BACKAPI}/api/groups/${id}`);
        setGroup(res.data.group);
      } catch (err) {
        setError("تعذر تحميل بيانات الحلقة");
      } finally {
        setLoading(false);
      }
    }
    fetchGroup();
  }, [id]);
  async function startLesson() {
    setError("");
    setStarting(true);
    try {
      const res = await axios.post(
        `${BACKAPI}/api/groups/${id}/lessons`,
        {}, // no body required
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const lesson = res.data?.lesson ?? res.data?.createdLesson;
      if (!lesson) throw new Error("لم يتم إنشاء الدرس");

      // Navigate to session page
      navigate(`/groups/${id}/lessons/${lesson._id}/`);
    } catch (err) {
      console.error(err);
      setError("فشل بدء الدرس — حاول مرة أخرى");
    } finally {
      setStarting(false);
    }
  }
  if (loading) return <p className="p-4">جاري التحميل...</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;
  if (!group) return <p className="p-4">لم يتم العثور على الحلقة.</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100">
      {/* Header */}
      <header className="bg-emerald-700 text-white p-4 shadow-md">
        <h1 className="text-xl font-bold">تفاصيل الحلقة</h1>
      </header>


      {/* show inline error */}
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      {/* Main Content */}
      <main dir="rtl" className="p-6 space-y-6">
        {/* Group Info */}
        <section className="bg-white p-6 rounded-xl text-center shadow-md border border-emerald-200">
          <h2 className="text-lg font-bold text-emerald-800 mb-2">
            {group.title}
          </h2>
          <p className="text-sm text-emerald-600">
            {group.day} - {console.log(group)}
          </p>
          <button
                  onClick={() => handleStartLesson(group)}
                  className="w-full bg-emerald-600 text-white py-2 mt-2 rounded-lg hover:bg-emerald-700"
                >
                  بدء
                </button>
        </section>

        {/* Students */}
        <section className="bg-white p-6 rounded-xl shadow-md border border-emerald-200">
          <h3 className="text-lg font-semibold text-emerald-800 mb-4">
            الطلاب
          </h3>
          
          {group.students.length === 0 ? (
            <p className="text-sm text-emerald-500">
              لا يوجد طلاب في هذه الحلقة.
            </p>
            
          ) : (
            <ul className="space-y-3">
              {group.students.map((s) => (
                <StudentAccordion key={s._id} student={s} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
function StudentAccordion({ student }) {
  const [open, setOpen] = useState(false);
const navigate = useNavigate()
  function formatNextRevision(nextRev) {
    if (!nextRev || !nextRev.surah || !Array.isArray(nextRev.surah)) return "";
    return nextRev.surah.map((sur, i) => `${sur}: ${nextRev.fromAyah[i]}-${nextRev.toAyah[i]}`).join("، ");
  }

  return (
    <li className="border rounded-lg overflow-hidden shadow-sm">
      {/* Accordion Button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center p-3 bg-emerald-100 hover:bg-emerald-200 transition text-emerald-900 font-medium"
      >
        <div onClick={() =>{ navigate(`/students/${student._id}`)}}><span className="underline cursor-pointer p-1" >{student.name}</span></div>
        {open ? (
          <ChevronUpIcon className="w-5 h-5 text-emerald-700" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-emerald-700" />
        )}
      </button>

      {/* Accordion Content */}
      {open && (
        <div className="p-3 bg-emerald-50 border-t space-y-3 text-sm">
          {student.history.length === 0 ? (
            <p className="text-emerald-500">لا يوجد سجل لهذا الطالب.</p>
          ) : (
            student.history.map((h) => (
              <div
                key={h._id}
                className="bg-white p-3 rounded-lg shadow border border-emerald-100"
              >
                <p>
                  <span className="font-semibold">📅 التاريخ: </span>
                  {new Date(h.date).toLocaleDateString()}
                </p>
                <p>
                  <span className="font-semibold">📖 راجع: </span>
                  {h.revised ? "✔️" : "❌"}
                </p>
                {h.notes && <p>📝 ملاحظات: {h.notes}</p>}
                {h.nextRevision && <p>➡️ المراجعة القادمة: {formatNextRevision(h.nextRevision)}</p>}
              </div>
            ))
          )}
        </div>
      )}
    </li>
  );
}