import React, { useEffect, useRef, useState } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";

import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function StudentsPanel() {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ name: "", notes: "" });
  const containerRef = useRef(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  let BACKAPI;
  if (import.meta.env.MODE === "development") {
    BACKAPI = import.meta.env.VITE_DEVELOPMENT_API;
  } else {
    BACKAPI = import.meta.env.VITE_PRODUCTION_API;
  }
  const token = localStorage.getItem("token");
  useEffect(() => {
    fetchUsers();
    if (!token) {
      navigate("/login");
    }
  }, []);

  async function fetchUsers() {
    try {
      const res = await axios.get(`${BACKAPI}/api/students`);
      setUsers(res.data.students);
    } catch (err) {
      console.warn("Using mock data instead of API");
    }
  }
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  function startCreate() {
    setEditUser(null);
    setForm({ name: "", notes: "" });
    setExpanded(true);
    setTimeout(
      () =>
        containerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      100
    );
  }

  function handleEdit(user) {
    setEditUser(user);
    setForm({
      name: user.name || "",
      notes: user.notes || "",
    });
    setExpanded(true);
    setTimeout(
      () =>
        containerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      100
    );
  }

  function resetForm() {
    setEditUser(null);
    setForm({ name: "", notes: "" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError("فشل حفظ الطالب، حاول مرة أخرى");

    setLoading(true);
    try {
      let saved;

      if (editUser) {
        const res = await axios.put(
          `${BACKAPI}/api/students/${editUser._id}`,
          form,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        saved = res.data.student;
        setUsers((u) => u.map((x) => (x._id === saved._id ? saved : x)));
      } else {
        const res = await axios.post(`${BACKAPI}/api/students`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log(res);
        saved = res.data.student;
        setUsers((u) => [saved, ...u]);
      }

      resetForm();
      setExpanded(false);
    } catch (err) {
      console.error(err);
      setError("فشل حفظ الطالب، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id) => {
    setConfirmDelete(id);
  };

  return (
    <div dir="rtl" className="space-y-4">
      <section
        ref={containerRef}
        className="bg-white p-4 md:p-6 rounded-md shadow border border-emerald-200"
      >
        <button
          type="button"
          onClick={() => setExpanded((s) => !s)}
          className="w-full text-right flex items-center justify-between"
          aria-expanded={expanded}
        >
          <h2 className="text-base md:text-lg font-semibold text-emerald-800">
            اضافة طالب
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

        <div
          className={`overflow-hidden transition-all duration-300 ${
            expanded ? "max-h-[900px] mt-4" : "max-h-0"
          }`}
        >
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs cursor-pointer">
                <img
                  src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${form.name}`}
                  alt="avatar"
                  className="w-16 h-16 rounded-full"
                />
              </div>
              <span className="text-sm text-emerald-600">
                يتم توليد الصورة تلقائياً
              </span>
            </div>

            <div>
              <label className="block text-sm mb-1">الاسم</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                type="text"
                className="w-full border px-3 py-2 rounded"
                placeholder="مثال: عمر"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">ملاحظات </label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
                rows={3}
                placeholder="ملاحظات عن الطالب / تذكير بالآيات القادمة"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-700 text-white px-4 py-2 rounded-full disabled:opacity-60"
              >
                {loading
                  ? "جارٍ الحفظ..."
                  : editUser
                  ? "تحديث الطالب"
                  : "إنشاء الطالب"}
              </button>

              {editUser && (
                <button
                  type="button"
                  onClick={() => resetForm()}
                  className="text-emerald-700 px-3 py-2 rounded-full border border-emerald-200"
                >
                  إلغاء
                </button>
              )}

              {!expanded && (
                <button
                  type="button"
                  onClick={startCreate}
                  className="text-sm text-emerald-600 underline"
                >
                  اضافة جديد
                </button>
              )}
            </div>
          </form>
        </div>
      </section>

      <section className="bg-white p-4 rounded-md shadow border border-emerald-200">
        <h3 className="text-sm font-semibold text-emerald-700 mb-3">
          قائمة الطلاب
        </h3>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <table className="min-w-full text-sm text-center">
          <thead>
            <tr className="bg-emerald-100 text-emerald-800">
              <th className="p-1">الصورة</th>
              <th className="p-1">الاسم</th>
              <th className="p-1">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} className="border-t ">
                <td className="p-1 ">
                  <img
                    src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(
                      user.name
                    )}`}
                    className="w-8 h-8 rounded-full mx-auto"
                  />
                </td>
                <td
                  onClick={() => navigate(`/students/${user._id}`)}
                  className="p-1 font-medium text-emerald-900 underline cursor-pointer"
                >
                  {user.name}
                </td>
                <td className="p-2 text-center">
                  <div className="flex gap-2 justify-center">
                    {/* Edit Button */}
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-blue-500 hover:text-blue-700"
                      title="تعديل"
                    >
                      <FaEdit size={18} />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(user._id)}
                      className="text-red-500 hover:text-red-700"
                      title="حذف"
                    >
                      <FaTrash size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {confirmDelete && (
          <div className="fixed inset-0 flex items-center justify-center bg-[#00000040] bg-opacity-50">
            <div className="bg-white rounded shadow p-6 w-80 text-center">
              <p className="text-gray-700 mb-4">
                هل أنت متأكد من حذف هذا الطالب؟
              </p>
              <div className="flex justify-around">
                <button
                  onClick={async () => {
                    try {
                      await axios.delete(
                        `${BACKAPI}/api/students/${confirmDelete}`,
                        {
                          headers: { Authorization: `Bearer ${token}` },
                        }
                      );
                      setUsers((u) => u.filter((x) => x._id !== confirmDelete));
                      setConfirmDelete(null);
                    } catch (err) {
                      console.error(err);
                      setError("حدث خطأ أثناء الحذف");
                    }
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded"
                >
                  نعم، احذف
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="bg-gray-300 px-4 py-2 rounded"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {users.length === 0 && (
          <p className="text-sm text-emerald-600 mt-3">
            لحظات... لو مفيش حاجة ظاهرة ضيف طالب
          </p>
        )}
      </section>
    </div>
  );
}
