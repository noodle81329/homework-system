import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, LogIn, AlertCircle, ArrowRight } from 'lucide-react';
import api from '../api';

const StudentLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const classSlug = searchParams.get('class');
  
  const [error, setError] = useState('');
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTeacherLogin, setShowTeacherLogin] = useState(false);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setError('請輸入姓名');
      return;
    }
    
    if (!classSlug && !showTeacherLogin) {
      setError('缺少班級參數，請確認連結是否正確（網址應包含 ?class=xxx）');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await api.post('/auth/login', {
        student_name: studentName.trim()
      });
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate(`/student?class=${classSlug}`);
    } catch (err) {
      setError('登入失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherSuccess = async (credentialResponse: any) => {
    try {
      const res = await api.post('/auth/login', {
        credential: credentialResponse.credential
      });
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      if (res.data.user.role === 'teacher') {
        navigate('/teacher');
      } else {
        navigate('/student');
      }
    } catch (err) {
      setError('Google 驗證失敗，或者您不是被授權的教師帳號。');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      {/* Top Navigation / Header */}
      <div className="w-full flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">作業繳交入口</h1>
            {classSlug && (
              <p className="text-sm text-indigo-500 font-medium">班級：{classSlug}</p>
            )}
          </div>
        </div>
        <button 
          onClick={() => setShowTeacherLogin(!showTeacherLogin)}
          className="px-5 py-2.5 bg-slate-200/50 hover:bg-slate-200 transition-colors rounded-2xl text-slate-500 flex items-center gap-2 font-medium"
        >
          <LogIn size={18} />
          {showTeacherLogin ? '返回學生登入' : '教師管理登入'}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="w-full bg-red-50 text-red-600 px-5 py-4 rounded-2xl flex items-center gap-3 mb-6 border border-red-100">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* 缺少 class 參數的警示（僅學生模式顯示） */}
      {!classSlug && !showTeacherLogin && (
        <div className="w-full bg-amber-50 text-amber-700 px-5 py-4 rounded-2xl flex items-center gap-3 mb-6 border border-amber-100">
          <AlertCircle size={20} />
          <span className="font-medium">此連結未包含班級資訊，請向教師索取正確的繳交連結。</span>
        </div>
      )}

      {/* Main Card */}
      <div className="w-full bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-16 flex flex-col items-center text-center mt-4">
        <div className="w-24 h-24 bg-indigo-50/80 rounded-[2rem] flex items-center justify-center text-indigo-600 mb-8 border border-indigo-100/50">
          <ShieldCheck size={48} strokeWidth={1.5} />
        </div>
        
        <h2 className="text-[2rem] leading-tight font-bold text-slate-800 mb-5 tracking-tight">
          {showTeacherLogin ? '教師專屬系統' : '隱私與安全上傳'}
        </h2>
        <p className="text-slate-500 text-lg max-w-md mx-auto mb-10 leading-relaxed">
          {showTeacherLogin 
            ? '請使用有權限存取作業系統的 Google 帳號與我們進行驗證以進入管理控制台。'
            : '請填寫您的真實姓名，系統將協助您上傳作業並確保存入課程專屬資料夾，其他同學無法看見您的檔案。'}
        </p>

        {showTeacherLogin ? (
          <div className="relative group">
            <div className="transform transition-transform group-hover:scale-[1.02] duration-300">
              <GoogleLogin
                onSuccess={handleTeacherSuccess}
                onError={() => setError('無法載入 Google 登入組件或登入失敗，請檢查網路連線。')}
                useOneTap
                shape="pill"
                size="large"
                text="continue_with"
              />
            </div>
          </div>
        ) : (
          <form className="w-full max-w-sm flex flex-col gap-4" onSubmit={handleStudentLogin}>
            <input 
              type="text" 
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="例如：王小明"
              className="w-full px-5 py-4 border border-slate-200 rounded-2xl text-lg text-center focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-700 placeholder:text-slate-400 placeholder:font-normal"
              autoFocus
              disabled={!classSlug}
            />
            <button 
              type="submit"
              disabled={loading || !studentName.trim() || !classSlug}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium text-lg py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200/50"
            >
              {loading ? '驗證中...' : <>進入繳交系統 <ArrowRight size={20} /></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default StudentLogin;
