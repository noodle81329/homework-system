import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Users, LogOut, CheckCircle, Save, Database, Loader2, Plus, Trash2, Copy, ArrowLeft, Link } from 'lucide-react';
import api from '../api';

interface ClassItem {
  slug: string;
  folder_id: string;
}

interface Submission {
  student_name: string;
  is_submitted: boolean;
  file_name: string;
  submitted_at: string | null;
}

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 新增班級表單
  const [newSlug, setNewSlug] = useState('');
  const [newFolderId, setNewFolderId] = useState('');

  // 查看班級繳交紀錄
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  // 複製成功提示
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/teacher/classes');
      setClasses(res.data);
    } catch (err) {
      if ((err as any).response?.status === 401 || (err as any).response?.status === 403) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (classSlug: string) => {
    setLoadingSubs(true);
    try {
      const res = await api.get('/teacher/submissions', { params: { class_slug: classSlug } });
      setSubmissions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSubs(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleAddClass = async () => {
    if (!newSlug.trim() || !newFolderId.trim()) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('class_slug', newSlug.trim());
      formData.append('folder_id', newFolderId.trim());
      await api.post('/teacher/classes', formData);
      setNewSlug('');
      setNewFolderId('');
      await fetchClasses();
    } catch (err) {
      alert('新增班級失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = async (slug: string) => {
    if (!confirm(`確定要刪除「${slug}」嗎？`)) return;
    try {
      await api.delete(`/teacher/classes/${slug}`);
      if (selectedClass === slug) {
        setSelectedClass(null);
        setSubmissions([]);
      }
      await fetchClasses();
    } catch (err) {
      alert('刪除失敗');
    }
  };

  const handleViewSubmissions = (slug: string) => {
    setSelectedClass(slug);
    fetchSubmissions(slug);
  };

  const getStudentLink = (slug: string) => {
    const origin = window.location.origin;
    return `${origin}/?class=${encodeURIComponent(slug)}`;
  };

  const handleCopyLink = (slug: string) => {
    navigator.clipboard.writeText(getStudentLink(slug));
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  // 查看某班級的繳交詳情
  if (selectedClass) {
    const submittedCount = submissions.filter(s => s.is_submitted).length;
    return (
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center py-8">
        {/* Header */}
        <div className="w-full flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSelectedClass(null); setSubmissions([]); }}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ArrowLeft size={24} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">班級：{selectedClass}</h1>
              <p className="text-sm text-slate-500">繳交紀錄詳情</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleCopyLink(selectedClass)}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 transition-colors rounded-xl text-indigo-600 flex items-center gap-2 font-medium"
            >
              <Copy size={16} />
              {copiedSlug === selectedClass ? '已複製！' : '複製學生連結'}
            </button>
            <button onClick={handleLogout} className="px-4 py-2 bg-slate-200/50 hover:bg-slate-200 transition-colors rounded-xl text-slate-600 flex items-center gap-2 font-medium">
              <LogOut size={18} /> 登出
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="w-full bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl p-8 shadow-lg shadow-indigo-200 text-white mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-indigo-100 font-medium mb-1">全班繳交進度</h3>
              <p className="text-4xl font-bold">{submittedCount} <span className="text-lg font-normal text-indigo-200">人已繳交</span></p>
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <CheckCircle className="text-emerald-500" size={24} />
            學生繳交清單
          </h2>

          {loadingSubs ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 text-sm">
                    <th className="pb-4 font-medium pl-4">學生姓名</th>
                    <th className="pb-4 font-medium">繳交狀態</th>
                    <th className="pb-4 font-medium">作業檔案名稱</th>
                    <th className="pb-4 font-medium">繳交時間</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {submissions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">目前尚無任何繳交紀錄</td>
                    </tr>
                  ) : (
                    submissions.map((sub, idx) => (
                      <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 pl-4 font-medium text-slate-700">{sub.student_name}</td>
                        <td className="py-4">
                          {sub.is_submitted ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600">
                              <CheckCircle size={14} /> 已繳交
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                              未繳交
                            </span>
                          )}
                        </td>
                        <td className="py-4 text-slate-600">{sub.file_name || '-'}</td>
                        <td className="py-4 text-slate-500">{sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 主頁面：班級列表
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center py-8">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Database size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">教師管理系統</h1>
            <p className="text-sm text-slate-500">多班級作業管理中心</p>
          </div>
        </div>
        <button onClick={handleLogout} className="px-4 py-2 bg-slate-200/50 hover:bg-slate-200 transition-colors rounded-xl text-slate-600 flex items-center gap-2 font-medium">
          <LogOut size={18} /> 登出
        </button>
      </div>

      {/* Add Class Card */}
      <div className="w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-sm mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Plus size={20} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">新增班級</h2>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            placeholder="班級代碼（如：classA、期中報告）"
            className="flex-1 bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
          />
          <input
            type="text"
            value={newFolderId}
            onChange={(e) => setNewFolderId(e.target.value)}
            placeholder="對應的 Google Drive 資料夾 ID"
            className="flex-1 bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
          />
          <button
            onClick={handleAddClass}
            disabled={saving || !newSlug.trim() || !newFolderId.trim()}
            className="px-6 py-3 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 disabled:bg-slate-300 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            新增
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          提示：每個班級對應一個 Google Drive 資料夾，學生透過不同連結進入對應班級。建的新資料夾需共用編輯權限給 Service Account。
        </p>
      </div>

      {/* Classes List */}
      <div className="w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Settings size={20} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">班級列表</h2>
          <span className="ml-auto text-sm text-slate-400">{classes.length} 個班級</span>
        </div>

        {classes.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Database size={48} className="mx-auto mb-4 opacity-30" />
            <p>尚未新增任何班級，請先在上方新增。</p>
          </div>
        ) : (
          <div className="space-y-4">
            {classes.map((cls) => (
              <div
                key={cls.slug}
                className="bg-slate-50 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 hover:bg-slate-100/80 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-800 mb-1">{cls.slug}</h3>
                  <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                    <Link size={12} />
                    {getStudentLink(cls.slug)}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleCopyLink(cls.slug)}
                    className="px-3 py-2 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl text-sm font-medium text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
                  >
                    <Copy size={14} />
                    {copiedSlug === cls.slug ? '已複製！' : '複製連結'}
                  </button>
                  <button
                    onClick={() => handleViewSubmissions(cls.slug)}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium text-white flex items-center gap-1.5 transition-colors"
                  >
                    <Users size={14} />
                    查看繳交
                  </button>
                  <button
                    onClick={() => handleDeleteClass(cls.slug)}
                    className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
