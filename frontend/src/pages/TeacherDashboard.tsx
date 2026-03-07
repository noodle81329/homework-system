import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Users, LogOut, CheckCircle, Save, Database, Loader2 } from 'lucide-react';
import api from '../api';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [folderId, setFolderId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [subsRes, settingsRes] = await Promise.all([
        api.get('/teacher/submissions'),
        api.get('/teacher/settings')
      ]);
      setSubmissions(subsRes.data);
      setFolderId(settingsRes.data.target_folder_id);
    } catch (err) {
      if ((err as any).response?.status === 401 || (err as any).response?.status === 403) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('folder_id', folderId);
      await api.post('/teacher/settings', formData);
      alert('設定已儲存！');
    } catch (err) {
      alert('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  const submittedCount = submissions.filter(s => s.is_submitted).length;

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
            <p className="text-sm text-slate-500">課程作業接收中心</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="px-4 py-2 bg-slate-200/50 hover:bg-slate-200 transition-colors rounded-xl text-slate-600 flex items-center gap-2 font-medium"
        >
          <LogOut size={18} />
          登出
        </button>
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Settings Card */}
        <div className="col-span-1 md:col-span-2 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Settings size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-800">儲存設定</h2>
            </div>
          </div>
          
          <div className="space-y-4 relative">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-2">
                目標 Google Drive 資料夾 ID
              </label>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  placeholder="請貼上資料夾網址中 id= 後面的字串"
                  className="flex-1 bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
                />
                <button 
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="px-6 py-3 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  儲存
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                提示：請確保該資料夾已對系統使用的 Google 驗證帳戶開啟共用編輯權限。
              </p>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="col-span-1 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl p-8 shadow-lg shadow-indigo-200 flex flex-col justify-center text-white">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
            <Users size={24} />
          </div>
          <h3 className="text-indigo-100 font-medium mb-1">全班繳交進度</h3>
          <p className="text-4xl font-bold mb-2">{submittedCount} <span className="text-lg font-normal text-indigo-200">人已繳交</span></p>
        </div>
      </div>

      {/* Submissions List */}
      <div className="w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <CheckCircle className="text-emerald-500" size={24} />
          學生繳交清單
        </h2>
        
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
      </div>
    </div>
  );
};

export default TeacherDashboard;
