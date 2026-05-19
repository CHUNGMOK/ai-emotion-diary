import { GoogleGenerativeAI } from "@google/generative-ai";
// 재배포 강제 실행 (Update: 2026-05-14 16:50)

export default async function handler(req, res) {
  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: '일기 내용을 입력해주세요.' });
  }

  // 환경 변수에서 API 키 가져오기
  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: '서버에 API 키가 설정되지 않았습니다.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    // 가장 널리 지원되는 gemini-pro 모델로 변경하여 호환성 문제를 원천 차단합니다.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `너는 심리 상담사야. 사용자가 작성한 일기 내용을 읽고 사용자의 감정을 한 단어(예: 기쁨, 슬픔, 분노, 불안, 평온)로 요약해줘. 그리고 그 감정에 공감해주고 따뜻한 응원의 메시지를 2~3문장으로 작성해 줘. 답변 형식은 반드시 '감정: [요약된 감정]\n[응원 메시지]'와 같이 줄 바꿈을 포함해서 보내줘.\n\n사용자의 일기 내용: ${content}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ text });
  } catch (error) {
    console.error('Gemini API Error:', error);
    // 에러 원인을 파악하기 위해 상세 메시지를 반환합니다.
    return res.status(500).json({ error: `최종 디버깅 에러: ${error.message}` });
  }
}
