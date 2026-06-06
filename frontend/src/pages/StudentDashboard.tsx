import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UploadCloud, CheckCircle, FileText, Users, LogOut, Loader2, BookOpen } from 'lucide-react';
import api from '../api';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const classSlug = searchParams.get('class');

  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // 解析使用者資訊
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const studentName = user?.name || '未知學生';

  const fetchStatus = async () => {
    try {
      const params: Record<string, string> = classSlug ? { class_slug: classSlug } : {};
      const res = await api.get('/student/status', { params });
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

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const params = classSlug ? `?class_slug=${classSlug}` : '';
      await api.post(`/student/upload${params}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFile(null);
      await fetchStatus();
    } catch (err: any) {
      const errorDetail = err.response?.data?.detail;
      if (errorDetail) {
        alert(`上傳失敗：\n${errorDetail}`);
      } else {
        alert('上傳失敗，請稍後再試。');
      }
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
          <p className="text-slate-500 text-sm">
            Hi, {studentName} 同學
            {classSlug && <span className="ml-2 text-indigo-500">｜班級：{classSlug}</span>}
          </p>
        </div>
        <button 
          onClick={handleLogout}
          className="px-4 py-2 bg-slate-200/50 hover:bg-slate-200 transition-colors rounded-xl text-slate-600 flex items-center gap-2 font-medium"
        >
          <LogOut size={18} />
          登出
        </button>
      </div>
      
      {/* Current Assignment Notice (If Any) */}
      {status?.assignment_name && (
        <div className="w-full bg-indigo-50 text-indigo-700 px-6 py-4 rounded-3xl flex items-center gap-4 mb-6 border border-indigo-100 shadow-sm">
          <BookOpen size={24} className="text-indigo-500" />
          <div>
            <p className="text-sm font-medium text-indigo-500/80 mb-0.5">目前指定作業</p>
            <p className="text-lg font-bold">{status.assignment_name}</p>
          </div>
        </div>
      )}

      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Status Card */}
        <div className="col-span-1 md:col-span-2 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex items-center gap-6">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${status?.is_submitted ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
            {status?.is_submitted ? <CheckCircle size={32} /> : <FileText size={32} />}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-500 mb-1">您的繳交狀態</h3>
            {status?.is_submitted ? (
              <div>
                <p className="text-2xl font-bold text-slate-800 mb-1">已繳交</p>
                <p className="text-sm text-slate-400 truncate" title={status.file_name}>
                  檔案：{status.file_name}
                </p>
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
          <h3 className="text-sm font-semibold text-slate-500 mb-1">本作業總繳交人數</h3>
          <p className="text-3xl font-bold text-slate-800">{status?.total_submissions || 0}</p>
        </div>
      </div>

      {/* Upload Interface */}
      <div className="w-full bg-white rounded-3xl p-10 border border-slate-100 shadow-sm flex flex-col items-center flex-1 lg:flex-none">
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          {status?.is_submitted ? '重新上傳作業 (更新檔案)' : '上傳繳交作業'}
        </h2>
        <p className="text-slate-500 mb-8 text-center max-w-md">
          支援 PDF、Word、ZIP 等一般格式檔案，系統會安全加密並傳送至課程專屬雲端空間。 <br/>
          (檔名前方將自動附加您的作業名稱與姓名)
        </p>

        <div className="w-full max-w-lg">
          <label 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full flex flex-col items-center px-4 py-8 rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${
              isDragging 
                ? 'bg-indigo-50 border-indigo-500 text-indigo-500' 
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100/50 hover:border-indigo-300'
            }`}
          >
            <UploadCloud size={48} className={isDragging ? "text-indigo-500 mb-4" : "text-indigo-400 mb-4"} />
            <span className="text-lg font-medium mb-1 truncate max-w-full px-4 text-center">
              {file ? file.name : "點擊選擇檔案上傳"}
            </span>
            <span className={`text-sm ${isDragging ? "text-indigo-400" : "text-slate-400"}`}>
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
