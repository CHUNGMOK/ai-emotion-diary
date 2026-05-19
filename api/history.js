import Redis from "ioredis";

// Redis 클라이언트 초기화 (서버리스 커넥션 재사용)
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
    console.error('Failed to initialize Redis Client in history endpoint:', error);
  }
}

export default async function handler(req, res) {
  // GET 요청만 허용
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!redis) {
    return res.status(500).json({ error: 'Redis 클라이언트가 초기화되지 않았거나 REDIS_URL이 설정되지 않았습니다.' });
  }

  try {
    // 1. 'diary-*' 패턴에 매칭되는 모든 키 가져오기 (scanStream 사용)
    const stream = redis.scanStream({
      match: 'diary-*',
      count: 100
    });

    const allKeys = [];
    for await (const keys of stream) {
      if (keys.length > 0) {
        allKeys.push(...keys);
      }
    }

    if (allKeys.length === 0) {
      return res.status(200).json({ history: [] });
    }

    // 2. 키들을 최신순(내림차순)으로 정렬 (diary-YYYYMMDDHHmmssSSS 형식이라 단순 문자열 내림차순 정렬로 가능)
    allKeys.sort((a, b) => b.localeCompare(a));

    // 3. 정렬된 키들에 해당하는 모든 값(일기 데이터) 한 번에 가져오기 (mget 사용)
    const rawValues = await redis.mget(allKeys);

    // 4. 데이터 가공
    const history = rawValues.map((val, idx) => {
      try {
        const parsed = JSON.parse(val);
        return {
          id: allKeys[idx],
          content: parsed.content,
          aiResponse: parsed.aiResponse,
          createdAt: parsed.createdAt || new Date().toISOString()
        };
      } catch (e) {
        console.error(`Error parsing JSON for key ${allKeys[idx]}:`, e);
        return null;
      }
    }).filter(item => item !== null);

    return res.status(200).json({ history });
  } catch (error) {
    console.error('Redis History Fetch Error:', error);
    return res.status(500).json({ error: `히스토리를 가져오는 중 에러 발생: ${error.message}` });
  }
}
