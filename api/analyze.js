import { GoogleGenerativeAI } from "@google/generative-ai";
import Redis from "ioredis";

// KST(한국 표준시) 기준으로 diary-YYYYMMDDHHmmssSSS 키를 생성하는 함수
function getKSTKey() {
  const now = new Date();
  // UTC 시간에 9시간(한국 표준시)을 더해 KST 날짜 객체 생성
  const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kst.getUTCDate()).padStart(2, '0');
  const hours = String(kst.getUTCHours()).padStart(2, '0');
  const minutes = String(kst.getUTCMinutes()).padStart(2, '0');
  const seconds = String(kst.getUTCSeconds()).padStart(2, '0');
  const ms = String(kst.getUTCMilliseconds()).padStart(3, '0');
  
  return `diary-${year}${month}${day}${hours}${minutes}${seconds}${ms}`;
}

// Redis 클라이언트 초기화 (서버리스 인스턴스 웜업 시 재사용을 위해 전역 변수로 관리)
let redis = null;
if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
    });
    
    redis.on('error', (err) => {
      console.error('Redis Connection Error:', err);
    });
  } catch (error) {
    console.error('Failed to initialize Redis Client:', error);
  }
}

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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `너는 심리 상담사야. 사용자가 작성한 일기 내용을 읽고 사용자의 감정을 한 단어(예: 기쁨, 슬픔, 분노, 불안, 평온)로 요약해줘. 그리고 그 감정에 공감해주고 따뜻한 응원의 메시지를 2~3문장으로 작성해 줘. 답변 형식은 반드시 '감정: [요약된 감정]\n[응원 메시지]'와 같이 줄 바꿈을 포함해서 보내줘.\n\n사용자의 일기 내용: ${content}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Redis에 원본 일기와 AI 답변 저장
    if (redis) {
      try {
        const key = getKSTKey();
        const data = {
          content: content,
          aiResponse: text,
          createdAt: new Date().toISOString()
        };
        await redis.set(key, JSON.stringify(data));
        console.log(`[Redis 저장 완료] Key: ${key}`);
      } catch (redisError) {
        console.error('Redis 저장 중 오류 발생:', redisError);
        // Redis 저장 실패가 전체 분석 응답 실패로 이어지지 않도록 예외 처리
      }
    } else {
      console.warn('REDIS_URL 환경변수가 없거나 Redis 클라이언트가 초기화되지 않았습니다.');
    }

    return res.status(200).json({ text });
  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: `최종 디버깅 에러: ${error.message}` });
  }
}
