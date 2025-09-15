// src/components/GroupsPanel.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function GroupsPanel() {
  const [title, setTitle] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null); // null = no modal

  const [date, setDate] = useState(() => {
    // default to now in datetime-local format
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().slice(0, 16);
  });
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");

  const [notes, setNotes] = useState("");
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expanded, setExpanded] = useState(false); // track which group's students are expanded

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const BACKAPI =
    import.meta.env.MODE === "production"
      ? import.meta.env.VITE_PRODUCTION_API
      : import.meta.env.VITE_DEVELOPMENT_API;

  useEffect(() => {
    fetchStudents();
    fetchGroups();
    if (!token) {
      navigate("/login")
    }
  }, []);

  async function fetchStudents() {
    try {
      const res = await axios.get(`${BACKAPI}/api/students`);
      const list = res.data?.students ?? res.data?.Students ?? [];
      setStudents(list);
    } catch (err) {
      console.warn("Couldn't fetch students:", err.message);
      setError("تعذر تحميل قائمة الطلاب — تأكد من تشغيل الخادم");
    }
  }

  async function fetchGroups() {
    try {
      const res = await axios.get(`${BACKAPI}/api/groups`);
      const list = res.data?.groups ?? [];
      setGroups(list);
    } catch (err) {
      console.warn("Couldn't fetch groups:", err.message);
    }
  }

  function toggleStudent(id) {
    setSelected((s) => {
      const copy = new Set(s);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  }

  function selectAllToggle() {
    if (selected.size === students.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(students.map((s) => s._id ?? s.id)));
    }
  }
const to12HourFormat = (time24) => {
  if (!time24) return "";
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12; // 0 becomes 12 for midnight
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
};
  async function handleCreateGroup(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!title.trim()) {
      setError("الرجاء إدخال اسم الحلقة");
      return;
    }
    setLoading(true);
    try {
      const studentIds = Array.from(selected);
      const payload = {
        title: title.trim(),
        studentIds,
        notes: notes.trim(),
        day,
        time: to12HourFormat(time),
      };

      const res = await axios.post(`${BACKAPI}/api/groups`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const created = res.data?.group ?? res.data?.createdGroup ?? null;
      if (!created) {
        setError("لم يتم إنشاء الحلقة — استجابة غير متوقعة من الخادم");
        return;
      }

      setGroups((g) => [created, ...g]);
      setSuccess("تم إنشاء الحلقة بنجاح");
      setTitle("");
      setNotes("");
      setSelected(new Set());
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setError("خطأ أثناء إنشاء الحلقة — تأكد من الخادم والصلاحيات");
    } finally {
      setLoading(false);
    }
  }
  async function handleDeleteGroup(group) {

    try {
      await axios.delete(`${BACKAPI}/api/groups/${group._id ?? group.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      setGroups((prev) =>
        prev.filter((g) => (g._id ?? g.id) !== (group._id ?? group.id))
      );
      setSuccess("تم حذف الحلقة بنجاح");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setError("فشل حذف الحلقة — تحقق من الخادم أو الصلاحيات");
    }
  }

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
    <div dir="rtl" className="space-y-6">
      <section className="bg-white p-4 md:p-6 rounded-md shadow border border-emerald-200">
        {/* Header / toggle */}
        <button
          type="button"
          onClick={() => setExpanded((s) => !s)}
          className="w-full text-right flex items-center justify-between"
          aria-expanded={expanded}
        >
          <h2 className="text-base md:text-lg font-semibold text-emerald-800">
            إنشاء حلقة جديدة
          </h2>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-5 h-5 text-emerald-800 transform transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 01.707.293l6 6a1 1 0 01-1.414 1.414L10 5.414 4.707 10.707A1 1 0 013.293 9.293l6-6A1 1 0 0110 3z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Expandable content */}
        <div
          className={`overflow-hidden transition-all duration-300 ${
            expanded ? "max-h-[1500px] mt-4" : "max-h-0"
          }`}
        >
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 px-4 py-2 rounded mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleCreateGroup} className="space-y-4">
            {/* اسم الحلقة */}
            <div>
              <label className="block text-sm mb-1">اسم الحلقة</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                type="text"
                className="w-full border px-3 py-2 rounded"
                placeholder="مثال: حلقة الجمعة"
              />
            </div>

            {/* اليوم */}
            <div>
              <label className="block text-sm mb-1">اليوم</label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="w-full border px-3 py-2 rounded"
              >
                <option value="">اختر اليوم</option>
                <option value="السبت">السبت</option>
                <option value="الأحد">الأحد</option>
                <option value="الاثنين">الاثنين</option>
                <option value="الثلاثاء">الثلاثاء</option>
                <option value="الأربعاء">الأربعاء</option>
                <option value="الخميس">الخميس</option>
                <option value="الجمعة">الجمعة</option>
              </select>
            </div>

            {/* الساعة */}
            <div>
              <label className="block text-sm mb-1">الساعة</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full border px-3 py-2 rounded"
              />
            </div>

            {/* اختيار الطلاب */}
            <div>
              <label className="block text-sm mb-1">اختيار الطلاب</label>
              <div className="flex items-center gap-3 mb-2">
                <button
                  type="button"
                  onClick={selectAllToggle}
                  className="text-sm text-emerald-700 underline"
                >
                  {selected.size === students.length
                    ? "إلغاء تحديد الكل"
                    : "تحديد الكل"}
                </button>
                <span className="text-xs text-emerald-500">
                  ({students.length} طالب)
                </span>
              </div>

              <div className="max-h-44 overflow-auto border rounded p-2">
                {students.length === 0 && (
                  <p className="text-sm text-emerald-500">لا يوجد طلاب.</p>
                )}
                {students.map((s) => {
                  const id = s._id ?? s.id;
                  const checked = selected.has(id);
                  return (
                    <label key={id} className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStudent(id)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{s.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* ملاحظات */}
            <div>
              <label className="block text-sm mb-1">ملاحظات (اختياري)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border px-3 py-2 rounded"
                rows={2}
              />
            </div>

            {/* زر الإنشاء */}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-700 text-white px-4 py-2 rounded-full disabled:opacity-60"
              >
                {loading ? "جاري الإنشاء..." : "إنشاء الحلقة"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="bg-white p-4 rounded-md shadow border border-emerald-200">
        <h3 className="text-sm font-semibold text-emerald-700 mb-3">
          قائمة الحلقات
        </h3>

        <table className="min-w-full text-sm text-center">
          <thead>
            <tr className="bg-emerald-100 text-emerald-800">
              <th className="p-2">الاسم </th>
              <th className="p-2">الوقت</th>
              <th className="p-2">الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g._id ?? g.id} className="border-t">
                {/* Clickable title */}
                <td
                  className="underline font-medium text-emerald-900 cursor-pointer"
                  onClick={() => navigate(`/groups/${g._id ?? g.id}`)}
                >
                  {g.title ?? g.name}
                </td>

                {/* Day & Time */}
                <td className="text-emerald-700">
                  {g.day && g.time ? `${g.day} - ${g.time.split(" ")[0]}` : "-"}
                </td>

                {/* Number of students */}
                

                {/* Actions: Start & Delete */}
                <td className="p-2">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleStartLesson(g)}
                      className="bg-emerald-600 text-white px-3 py-1 rounded"
                      title="بدء"
                    >
                      بدء
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => setConfirmDelete(g._id ?? g.id)}
                      className="bg-red-600 text-white px-3 py-2 rounded"
                      title="حذف"
                    >
                      <FaTrash/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {groups.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="p-4 text-sm text-emerald-500 text-center"
                >
                  لا توجد حلقات حتى الآن.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {confirmDelete && (
  <div className="fixed inset-0 flex items-center justify-center bg-[#00000040] bg-opacity-50">
    <div className="bg-white rounded shadow p-6 w-80 text-center">
      <p className="text-gray-700 mb-4">
        هل أنت متأكد من حذف هذه الحلقة؟
      </p>
      <div className="flex justify-around">
        <button
          onClick={async () => {
            await handleDeleteGroup({ _id: confirmDelete });
            setConfirmDelete(null);
          }}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          نعم، احذف
        </button>
        <button
          onClick={() => setConfirmDelete(null)}
          className="bg-gray-300 px-4 py-2 rounded"
        >
          إلغاء
        </button>
      </div>
    </div>
  </div>
)}

      </section>
    </div>
  );
}
