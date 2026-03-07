import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, CheckCircle, FileText, Users, LogOut, Loader2 } from 'lucide-react';
import api from '../api';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  // Parse user info safely
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const studentName = user?.name || '未知學生';

  const fetchStatus = async () => {
    try {
      const res = await api.get('/student/status');
      setStatus(res.data);
    } catch (err) {
      if ((err as any).response?.status === 401) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/student/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFile(null);
      await fetchStatus();
    } catch (err) {
      alert('上傳失敗，請稍後再試。');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">學生作業系統</h1>
          <p className="text-slate-500 text-sm">Hi, {studentName} 同學</p>
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
        {/* Status Card */}
        <div className="col-span-1 md:col-span-2 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex items-center gap-6">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${status?.is_submitted ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
            {status?.is_submitted ? <CheckCircle size={32} /> : <FileText size={32} />}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-500 mb-1">您的繳交狀態</h3>
            {status?.is_submitted ? (
              <div>
                <p className="text-2xl font-bold text-slate-800 mb-1">已繳交</p>
                <p className="text-sm text-slate-400">當前檔案：{status.file_name}</p>
              </div>
            ) : (
              <p className="text-2xl font-bold text-slate-800">尚未繳交</p>
            )}
          </div>
        </div>

        {/* Stats Card */}
        <div className="col-span-1 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center mb-4">
            <Users size={24} />
          </div>
          <h3 className="text-sm font-semibold text-slate-500 mb-1">目前總繳交人數</h3>
          <p className="text-3xl font-bold text-slate-800">{status?.total_submissions || 0}</p>
        </div>
      </div>

      {/* Upload Interface */}
      <div className="w-full bg-white rounded-3xl p-10 border border-slate-100 shadow-sm flex flex-col items-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          {status?.is_submitted ? '重新上傳作業 (更新檔案)' : '上傳繳交作業'}
        </h2>
        <p className="text-slate-500 mb-8 text-center max-w-md">
          支援 PDF、Word、ZIP 等一般格式檔案，系統會安全加密並傳送至課程專屬雲端空間。 <br/>
          (檔名前方將自動附加您的姓名前綴)
        </p>

        <div className="w-full max-w-lg">
          <label className="w-full flex flex-col items-center px-4 py-8 bg-slate-50 text-slate-500 rounded-2xl border-2 border-dashed border-slate-200 cursor-pointer hover:bg-slate-100/50 hover:border-indigo-300 transition-colors">
            <UploadCloud size={48} className="text-indigo-400 mb-4" />
            <span className="text-lg font-medium mb-1">
              {file ? file.name : "點擊選擇檔案上傳"}
            </span>
            <span className="text-sm text-slate-400">
              {file ? "檔案已準備，請點擊下方按鈕上傳" : "或將檔案拖曳至此區域"}
            </span>
            <input type="file" className="hidden" onChange={handleFileChange} />
          </label>
        </div>

        <button 
          onClick={handleUpload}
          disabled={!file || uploading}
          className={`mt-8 px-8 py-3 rounded-xl font-medium flex items-center gap-2 transition-all ${
            (!file || uploading) 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
          }`}
        >
          {uploading ? (
            <><Loader2 className="animate-spin" size={20} /> 上傳中...</>
          ) : (
            <><UploadCloud size={20} /> 確認上傳該檔案</>
          )}
        </button>
      </div>
    </div>
  );
};

export default StudentDashboard;
