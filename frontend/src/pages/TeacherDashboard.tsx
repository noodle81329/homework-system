import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Users, LogOut, CheckCircle, Save, Database, Loader2, Plus, Trash2, Copy, ArrowLeft, Link, Edit3, BookOpen } from 'lucide-react';
import api from '../api';

interface ClassItem {
  slug: string;
  folder_id: string;
  assignment_name: string;
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

  // 新增/編輯班級表單
  const formRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newSlug, setNewSlug] = useState('');
  const [newFolderId, setNewFolderId] = useState('');
  const [newAssignmentName, setNewAssignmentName] = useState('');

  // 查看班級繳交紀錄
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
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

  const handleAddOrEditClass = async () => {
    if (!newSlug.trim() || !newFolderId.trim()) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('class_slug', newSlug.trim());
      formData.append('folder_id', newFolderId.trim());
      formData.append('assignment_name', newAssignmentName.trim());
      
      await api.post('/teacher/classes', formData);
      
      setNewSlug('');
      setNewFolderId('');
      setNewAssignmentName('');
      setIsEditing(false);
      await fetchClasses();
    } catch (err) {
      alert('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (cls: ClassItem) => {
    setNewSlug(cls.slug);
    setNewFolderId(cls.folder_id);
    setNewAssignmentName(cls.assignment_name || '');
    setIsEditing(true);
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNewSlug('');
    setNewFolderId('');
    setNewAssignmentName('');
  };

  const handleDeleteClass = async (slug: string) => {
    if (!confirm(`確定要刪除「${slug}」嗎？`)) return;
    try {
      await api.delete(`/teacher/classes/${slug}`);
      if (selectedClass?.slug === slug) {
        setSelectedClass(null);
        setSubmissions([]);
      }
      await fetchClasses();
    } catch (err) {
      alert('刪除失敗');
    }
  };

  const handleViewSubmissions = (cls: ClassItem) => {
    setSelectedClass(cls);
    fetchSubmissions(cls.slug);
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
              <h1 className="text-2xl font-bold text-slate-800">班級：{selectedClass.slug}</h1>
              {selectedClass.assignment_name ? (
                <p className="text-sm font-medium text-emerald-600 flex items-center gap-1 mt-0.5">
                  <BookOpen size={14} /> 作業：{selectedClass.assignment_name}
                </p>
              ) : (
                <p className="text-sm text-slate-500 mt-0.5">繳交紀錄詳情 (所有檔案)</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleCopyLink(selectedClass.slug)}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 transition-colors rounded-xl text-indigo-600 flex items-center gap-2 font-medium"
            >
              <Copy size={16} />
              {copiedSlug === selectedClass.slug ? '已複製！' : '複製學生連結'}
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
              <h3 className="text-indigo-100 font-medium mb-1">本作業已繳交人數</h3>
              <p className="text-4xl font-bold">{submittedCount} <span className="text-lg font-normal text-indigo-200">人</span></p>
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
            <p className="text-sm text-slate-500">多班級與作業管理中心</p>
          </div>
        </div>
        <button onClick={handleLogout} className="px-4 py-2 bg-slate-200/50 hover:bg-slate-200 transition-colors rounded-xl text-slate-600 flex items-center gap-2 font-medium">
          <LogOut size={18} /> 登出
        </button>
      </div>

      {/* Add/Edit Class Card */}
      <div ref={formRef} className={`w-full bg-white rounded-3xl p-8 shadow-sm mb-8 border-2 transition-colors duration-300 ${isEditing ? 'border-indigo-400' : 'border-slate-100'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isEditing ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-50 text-indigo-600'}`}>
              {isEditing ? <Edit3 size={20} /> : <Plus size={20} />}
            </div>
            <h2 className="text-xl font-bold text-slate-800">{isEditing ? '編輯班級設定' : '新增班級'}</h2>
          </div>
          {isEditing && (
            <button onClick={handleCancelEdit} className="text-sm font-medium text-slate-500 hover:text-slate-700 px-3 py-1 bg-slate-100 rounded-lg">
              取消編輯
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1">班級代碼 (Slug) *</label>
            <input
              type="text"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              disabled={isEditing}
              placeholder="如：classA"
              className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1">Drive 資料夾 ID *</label>
            <input
              type="text"
              value={newFolderId}
              onChange={(e) => setNewFolderId(e.target.value)}
              placeholder="Google Drive 資料夾 ID"
              className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1">當前作業名稱 (選填)</label>
            <input
              type="text"
              value={newAssignmentName}
              onChange={(e) => setNewAssignmentName(e.target.value)}
              placeholder="如：期中報告 (留空則不分子作業)"
              className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
            />
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-6">
          <p className="text-xs text-slate-500 max-w-2xl">
            <span className="font-semibold text-slate-600">作業名稱重置機制：</span>設定作業名稱後，學生上傳的檔案前綴會加上此名稱（如 `[期中報告][王小明]...`）。當您修改此名稱為「期末報告」時，系統只會統計帶有「期末報告」前綴的檔案，<span className="text-indigo-600 font-medium">從而達到切換作業且自動重置繳交紀錄的效果</span>，而舊檔案仍會保留在同一個資料夾不會刪除。
          </p>
          <button
            onClick={handleAddOrEditClass}
            disabled={saving || !newSlug.trim() || !newFolderId.trim()}
            className={`px-8 py-3 text-white rounded-xl font-medium transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm ${
              isEditing 
                ? 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300' 
                : 'bg-slate-800 hover:bg-slate-700 disabled:bg-slate-300'
            }`}
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isEditing ? '儲存變更' : '新增班級'}
          </button>
        </div>
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
                className={`rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 transition-colors border ${
                  isEditing && newSlug === cls.slug ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-transparent hover:bg-slate-100/80 hover:border-slate-200'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h3 className="text-lg font-bold text-slate-800">{cls.slug}</h3>
                    {cls.assignment_name && (
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1">
                        <BookOpen size={12} /> {cls.assignment_name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate mb-1">
                    <span className="font-medium mr-1">Folder ID:</span> {cls.folder_id}
                  </p>
                  <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                    <Link size={12} />
                    {getStudentLink(cls.slug)}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleCopyLink(cls.slug)}
                    className="px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
                    title="複製學生上傳連結"
                  >
                    <Copy size={14} />
                    {copiedSlug === cls.slug ? '已複製！' : '複製連結'}
                  </button>
                  <button
                    onClick={() => handleViewSubmissions(cls)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-900 rounded-xl text-sm font-medium text-white flex items-center gap-1.5 transition-colors"
                  >
                    <Users size={14} />
                    查看繳交
                  </button>
                  <div className="w-px h-6 bg-slate-200 mx-1"></div>
                  <button
                    onClick={() => handleEditClick(cls)}
                    className="p-2 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl text-slate-500 hover:text-indigo-600 transition-colors"
                    title="編輯此班級"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteClass(cls.slug)}
                    className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-500 transition-colors"
                    title="刪除此班級"
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
