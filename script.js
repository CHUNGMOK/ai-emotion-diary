// 프론트엔드에서는 더 이상 GoogleGenerativeAI를 직접 호출하지 않습니다.

document.addEventListener('DOMContentLoaded', () => {
    const diaryInput = document.getElementById('diary-input');
    const voiceBtn = document.getElementById('voice-btn');
    const analyzeBtn = document.getElementById('analyze-btn');
    const aiResponseText = document.getElementById('ai-response-text');
    const aiResponseBox = document.getElementById('ai-response-box');

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
});

