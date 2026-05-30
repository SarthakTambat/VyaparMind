import React, { useState, useEffect, useCallback } from "react";
import { api } from "lib/api";
import {
  UsersThree, Plus, X, Trash, User, Phone, Money, CalendarCheck,
  Check, XCircle, Clock, UserMinus,
} from "@phosphor-icons/react";

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showAttendance, setShowAttendance] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [form, setForm] = useState({ name: "", phone: "", role: "", salary: "", salary_type: "monthly" });
  const [payForm, setPayForm] = useState({ amount: "", note: "", month: "" });

  const fetchStaff = useCallback(async () => {
    try {
      const { data } = await api.get("/api/staff");
      setStaff(data.staff || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    try {
      await api.post("/api/staff", { ...form, salary: parseFloat(form.salary || 0) });
      setForm({ name: "", phone: "", role: "", salary: "", salary_type: "monthly" });
      setShowForm(false);
      fetchStaff();
    } catch (err) { alert(err?.response?.data?.detail || "Failed"); }
  };

  const markAttendance = async (staffId, status) => {
    const today = new Date().toISOString().slice(0, 10);
    await api.post(`/api/staff/${staffId}/attendance`, { date: today, status });
    if (selectedStaff?.id === staffId) fetchAttendance(staffId);
  };

  const fetchAttendance = async (staffId) => {
    const { data } = await api.get(`/api/staff/${staffId}/attendance`);
    setAttendance(data.attendance || []);
  };

  const openAttendance = (member) => {
    setSelectedStaff(member);
    setShowAttendance(true);
    fetchAttendance(member.id);
  };

  const recordPayment = async (e) => {
    e.preventDefault();
    if (!payForm.amount || !selectedStaff) return;
    await api.post(`/api/staff/${selectedStaff.id}/payment`, {
      amount: parseFloat(payForm.amount),
      note: payForm.note,
      month: payForm.month || new Date().toISOString().slice(0, 7),
    });
    setPayForm({ amount: "", note: "", month: "" });
    setShowPayment(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await api.delete(`/api/staff/${deleteTarget.id}`);
    setDeleteTarget(null);
    fetchStaff();
  };

  const formatDate = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const today = new Date().toISOString().slice(0, 10);
  const totalSalary = staff.filter(s => s.status === "active").reduce((s, m) => s + (m.salary || 0), 0);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
            <UsersThree weight="duotone" size={28} className="text-[#00A884]" />
            Staff Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage employees, attendance & salary</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[#00A884] text-white text-sm font-medium rounded-lg hover:bg-[#009974]">
          <Plus weight="bold" size={16} /> Add Staff
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <p className="text-xs text-indigo-600 font-medium mb-1">Total Staff</p>
          <p className="text-2xl font-bold text-indigo-700">{staff.filter(s => s.status === "active").length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-600 font-medium mb-1">Monthly Salary Bill</p>
          <p className="text-2xl font-bold text-green-700">₹{totalSalary.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-amber-600 font-medium mb-1">Today</p>
          <p className="text-lg font-bold text-amber-700">{today}</p>
        </div>
      </div>

      {/* Staff List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-[#00A884] border-t-transparent rounded-full"></div>
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <UsersThree size={48} className="mx-auto mb-3 opacity-50" />
          <p className="font-medium text-slate-500">No staff added yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map((member) => (
            <div key={member.id} className={`bg-white border border-slate-200 rounded-xl p-4 ${member.status !== "active" ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                  <User weight="bold" size={20} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{member.name}</p>
                  <p className="text-xs text-slate-500">
                    {member.role || "Staff"} • ₹{(member.salary || 0).toLocaleString("en-IN")}/{member.salary_type}
                    {member.phone && ` • ${member.phone}`}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                  {/* Quick attendance buttons */}
                  <button onClick={() => markAttendance(member.id, "present")} className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center hover:bg-green-200" title="Present">
                    <Check weight="bold" size={14} />
                  </button>
                  <button onClick={() => markAttendance(member.id, "absent")} className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200" title="Absent">
                    <XCircle weight="bold" size={14} />
                  </button>
                  <button onClick={() => markAttendance(member.id, "half_day")} className="w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center hover:bg-amber-200" title="Half Day">
                    <Clock weight="bold" size={14} />
                  </button>
                  <button onClick={() => openAttendance(member)} className="w-8 h-8 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center hover:bg-slate-200" title="View Attendance">
                    <CalendarCheck size={14} />
                  </button>
                  <button onClick={() => { setSelectedStaff(member); setShowPayment(true); }} className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-200" title="Pay Salary">
                    <Money size={14} />
                  </button>
                  <button onClick={() => setDeleteTarget(member)} className="w-8 h-8 bg-red-100 text-red-500 rounded-full flex items-center justify-center hover:bg-red-200" title="Remove">
                    <Trash size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Staff Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">Add Staff Member</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <input type="text" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A884]/30" required />
              <input type="tel" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A884]/30" />
              <input type="text" placeholder="Role (e.g. Helper, Delivery)" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A884]/30" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Salary (₹)" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A884]/30" />
                <select value={form.salary_type} onChange={(e) => setForm({ ...form, salary_type: e.target.value })} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A884]/30">
                  <option value="monthly">Monthly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <button type="submit" className="w-full py-2.5 bg-[#00A884] text-white text-sm font-medium rounded-lg hover:bg-[#009974]">Add Staff</button>
            </form>
          </div>
        </div>
      )}

      {/* Attendance History Modal */}
      {showAttendance && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">{selectedStaff.name} — Attendance</h3>
              <button onClick={() => setShowAttendance(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            {attendance.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No attendance records yet</p>
            ) : (
              <div className="space-y-2">
                {attendance.slice(0, 30).map((rec) => (
                  <div key={rec.id} className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-700">{rec.date}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      rec.status === "present" ? "bg-green-100 text-green-700" :
                      rec.status === "absent" ? "bg-red-100 text-red-700" :
                      rec.status === "half_day" ? "bg-amber-100 text-amber-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {rec.status === "half_day" ? "Half Day" : rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 bg-slate-50 rounded-lg p-3 text-sm">
              <p>Present: <strong className="text-green-700">{attendance.filter(a => a.status === "present").length}</strong></p>
              <p>Absent: <strong className="text-red-700">{attendance.filter(a => a.status === "absent").length}</strong></p>
              <p>Half Day: <strong className="text-amber-700">{attendance.filter(a => a.status === "half_day").length}</strong></p>
            </div>
          </div>
        </div>
      )}

      {/* Pay Salary Modal */}
      {showPayment && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Pay Salary — {selectedStaff.name}</h3>
              <button onClick={() => setShowPayment(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={recordPayment} className="space-y-4">
              <input type="number" placeholder="Amount (₹)" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" required min="1" />
              <input type="month" value={payForm.month} onChange={(e) => setPayForm({ ...payForm, month: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" />
              <input type="text" placeholder="Note (optional)" value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" />
              <button type="submit" className="w-full py-2.5 bg-[#00A884] text-white text-sm font-medium rounded-lg hover:bg-[#009974]">Record Payment</button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl text-center">
            <UserMinus weight="fill" size={32} className="text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">Remove Staff?</h3>
            <p className="text-sm text-slate-500 mb-5">Remove <strong>{deleteTarget.name}</strong> from staff list?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
