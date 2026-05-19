import { supabase } from './lib/supabaseClient.js';

// 프론트엔드에서는 더 이상 GoogleGenerativeAI를 직접 호출하지 않습니다.

document.addEventListener('DOMContentLoaded', () => {
    const diaryInput = document.getElementById('diary-input');
    const voiceBtn = document.getElementById('voice-btn');
    const analyzeBtn = document.getElementById('analyze-btn');
    const aiResponseText = document.getElementById('ai-response-text');
    const aiResponseBox = document.getElementById('ai-response-box');
    const historyList = document.getElementById('history-list');

    // Auth UI Elements
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // Check auth state
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            loginContainer.style.display = 'none';
            appContainer.style.display = 'block';
            loadHistory(); // Load history when logged in
        } else {
            loginContainer.style.display = 'block';
            appContainer.style.display = 'none';
        }
    });

    // Auth Event Listeners
    loginBtn.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        if (!email || !password) return alert('이메일과 비밀번호를 입력해주세요.');

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) alert('로그인 실패: ' + error.message);
    });

    signupBtn.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        if (!email || !password) return alert('이메일과 비밀번호를 입력해주세요.');

        const { error } = await supabase.auth.signUp({ email, password });
        if (error) alert('회원가입 실패: ' + error.message);
        else alert('회원가입 성공! 이메일을 확인하거나 로그인해주세요.');
    });

    googleLoginBtn.addEventListener('click', async () => {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
        if (error) alert('Google 로그인 실패: ' + error.message);
    });

    logoutBtn.addEventListener('click', async () => {
        const { error } = await supabase.auth.signOut();
        if (error) alert('로그아웃 실패: ' + error.message);
    });

    // 백엔드 API를 사용하므로 더 이상 프론트엔드에 API 키를 노출하지 않습니다.

    // Analyze button click event
    analyzeBtn.addEventListener('click', async () => {
        const content = diaryInput.value.trim();
        
        if (!content) {
            alert('일기 내용을 입력해주세요!');
            return;
        }

        // Show "analyzing" state
        aiResponseText.textContent = "AI가 당신의 감정을 분석 중입니다...";
        aiResponseBox.style.opacity = '0.7';
        analyzeBtn.disabled = true;

        try {
            // 2. 백엔드 서버리스 함수 호출
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '분석 중 오류가 발생했습니다.');
            }

            // 3. 결과 표시
            aiResponseBox.style.opacity = '1';
            aiResponseText.textContent = data.text;
            
            // 일기 내용 초기화 및 히스토리 최신화
            diaryInput.value = '';
            loadHistory();
        } catch (error) {
            console.error("API Error:", error);
            aiResponseText.textContent = error.message || "죄송합니다. 분석 중 오류가 발생했습니다. 다시 시도해주세요.";
            aiResponseBox.style.opacity = '1';
        } finally {
            analyzeBtn.disabled = false;
        }
    });

    // Voice recognition setup (기존 코드 유지)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let isRecognizing = false;

    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR';
        recognition.interimResults = true;
        recognition.continuous = false;

        recognition.onstart = () => {
            isRecognizing = true;
            voiceBtn.innerHTML = '<span class="icon">🎙️</span> 음성인식 중....';
            voiceBtn.classList.add('recording');
        };

        recognition.onend = () => {
            isRecognizing = false;
            voiceBtn.innerHTML = '<span class="icon">🎙️</span> 음성으로 입력하기';
            voiceBtn.classList.remove('recording');
        };

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');

            diaryInput.value = transcript;
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            alert('음성 인식 중 오류가 발생했습니다: ' + event.error);
            isRecognizing = false;
            voiceBtn.innerHTML = '<span class="icon">🎙️</span> 음성으로 입력하기';
            voiceBtn.classList.remove('recording');
        };

        voiceBtn.addEventListener('click', () => {
            if (isRecognizing) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });
    } else {
        voiceBtn.addEventListener('click', () => {
            alert('죄송합니다. 현재 브라우저에서는 음성 인식 기능을 지원하지 않습니다. 크롬 브라우저를 권장합니다.');
        });
    }

    // 히스토리 가져오기 및 렌더링
    async function loadHistory() {
        try {
            const response = await fetch('/api/history');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '히스토리를 불러오는 중 오류가 발생했습니다.');
            }

            renderHistory(data.history);
        } catch (error) {
            console.error("History Fetch Error:", error);
            historyList.innerHTML = `<p class="error-history">❌ 히스토리를 불러오지 못했습니다: ${error.message}</p>`;
        }
    }

    // 히스토리 카드 렌더링 함수
    function renderHistory(history) {
        if (!history || history.length === 0) {
            historyList.innerHTML = `
                <div class="no-history">
                    <span class="icon">✍️</span>
                    <p>아직 저장된 일기가 없습니다.<br>오늘의 하루를 첫 번째로 기록해 보세요!</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = history.map(item => {
            let dateStr = "";
            try {
                if (item.id && item.id.startsWith("diary-")) {
                    const rawDate = item.id.substring(6); // YYYYMMDDHHmmssSSS
                    const year = rawDate.substring(0, 4);
                    const month = rawDate.substring(4, 6);
                    const day = rawDate.substring(6, 8);
                    const hour = rawDate.substring(8, 10);
                    const minute = rawDate.substring(10, 12);
                    dateStr = `${year}년 ${month}월 ${day}일 ${hour}:${minute}`;
                } else {
                    const date = new Date(item.createdAt);
                    dateStr = date.toLocaleString('ko-KR');
                }
            } catch (e) {
                dateStr = "알 수 없는 날짜";
            }

            return `
                <div class="history-card">
                    <div class="history-card-header">
                        <span class="history-date">📅 ${dateStr}</span>
                    </div>
                    <div class="history-card-body">
                        <div class="history-diary">
                            <span class="badge badge-diary">내 일기</span>
                            <p>${escapeHtml(item.content)}</p>
                        </div>
                        <div class="history-ai">
                            <span class="badge badge-ai">AI 상담사</span>
                            <p>${escapeHtml(item.aiResponse).replace(/\n/g, '<br>')}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // HTML 이스케이프 함수 (XSS 방지)
    function escapeHtml(string) {
        return String(string).replace(/[&<>"']/g, function (s) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[s];
        });
    }

    // 초기 상태 체크를 위해 세션을 가져옵니다. (onAuthStateChange가 처리하므로 필수는 아님)
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
            loginContainer.style.display = 'block';
            appContainer.style.display = 'none';
        }
    });
});

