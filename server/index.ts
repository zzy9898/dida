import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      console.warn("WARNING: GEMINI_API_KEY is not configured. AI features will use mock responses.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'dida-uniapp-server',
        }
      }
    });
  }
  return aiClient;
}

// AI Icebreaker Recommendation API
app.post("/api/gemini/icebreaker", async (req, res) => {
  const { userInterests, peerInterests, userNickname, peerNickname } = req.body;

  if (!userInterests || !peerInterests) {
    return res.status(400).json({ error: "Missing user interests or peer interests" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      const mockIcebreakers = [
        `嗨！我注意到你们都对 ${userInterests[0]} 和 ${peerInterests[0]} 感兴趣！不妨聊聊上次是什么时候参与的？`,
        `嘿！听说你们都喜欢探索新事物。要不问问 ${peerNickname} 是不是也打算参加这周的校园咖啡探店活动？`,
        `哈哈，看到你们的兴趣标签都写了社交和桌游！可以问问对方最喜欢玩哪种类型的，比如狼人杀还是大富翁？`
      ];
      return res.json({ icebreakers: mockIcebreakers, fallback: true });
    }

    const ai = getGeminiClient();
    const prompt = `你是一个高校社交平台"滴答"的AI破冰助手。
当前有两个在校大学生正在发起聊天：
我方的昵称是: "${userNickname || '我'}"，兴趣爱好是: ${JSON.stringify(userInterests)}。
对方的昵称是: "${peerNickname || 'TA'}"，兴趣爱好是: ${JSON.stringify(peerInterests)}。

请为他们定制生成 3 条非常自然、幽默、轻松、没有爹味或官话的高校生聊天破冰话术。
破冰话术应该能够巧妙地结合两人重叠的或有趣的兴趣标签，帮助他们缓解初次聊天的尴尬，一键发送即可开启话题。

请直接以 JSON 数组格式返回，不要包含 markdown 标记或任何其他多余文本。数组中包含 3 个字符串，例如：
["破冰建议1...", "破冰建议2...", "破冰建议3..."]`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "[]";
    try {
      const parsed = JSON.parse(text);
      return res.json({ icebreakers: parsed, fallback: false });
    } catch (parseErr) {
      console.error("Failed to parse Gemini response as JSON:", text);
      return res.json({
        icebreakers: [
          `哇，你们都对 ${userInterests[0]} 感兴趣！不如先问问对方："平时你会更喜欢在哪家店体验这个呢？"`,
          `发现你们居然有很多共同话题，比如都标记了 ${peerInterests[0]}！聊聊这个准没错！`,
          `嗨！感觉你们在标签和性格上非常合得来。要不今天一起向着共同的目标出发吧！`
        ],
        fallback: true
      });
    }
  } catch (error: any) {
    console.error("Gemini Icebreaker API error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// AI Meeting Venue Recommendation API
app.post("/api/gemini/venue", async (req, res) => {
  const { userInterests, peerInterests, locationHint } = req.body;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      const mockVenues = [
        { name: "校门口漫猫咖啡馆", desc: "安静有氛围，适合两人畅聊，提供桌游和高校折扣套餐。", type: "休闲交流" },
        { name: "创意园区复古影院 & 艺术长廊", desc: "文艺气息十足，看完复古电影周后最适合在这散步讨论剧情。", type: "文化体验" },
        { name: "高校体育中心羽毛球网球馆", desc: "运动搭子首选！硬件配置极好，运动完还可以去吃周边的砂锅粥。", type: "健康运动" }
      ];
      return res.json({ venues: mockVenues, fallback: true });
    }

    const ai = getGeminiClient();
    const prompt = `你是一个高校社交活动平台"滴答"的AI出行选址专家。
两个学生在寻找见面的合适去处。
已知信息：
- 我方兴趣：${JSON.stringify(userInterests || [])}
- 对方兴趣：${JSON.stringify(peerInterests || [])}
- 位置参考：${locationHint || '学校周边/市中心'}

请为他们推荐 3 个适合线下见面活动的绝佳场所。要求：选择要贴合他们的共同爱好、大学生消费水平和品味（比如有情调的咖啡、文艺的书店、活力运动场馆等）。
请直接以 JSON 结构格式返回：
一个包含 3 个对象的数组。每个对象具有以下属性：
- name: 场所名称（例如 "橙子故事私人影院"）
- desc: 推荐理由和特色介绍，一到两句话
- type: 场所分类（例如 "桌游休闲"、"运动健身"、"美食咖啡"）

直接输出 JSON 数组，无需包裹 markdown code block 标记或任何引导文本。`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "[]";
    try {
      const parsed = JSON.parse(text);
      return res.json({ venues: parsed, fallback: false });
    } catch (e) {
      console.error("Failed to parse venue response:", text);
      return res.json({
        venues: [
          { name: "「时间沙漏」高分主题密室逃脱", desc: "能迅速拉近距离的有趣体验，考验你们的默契配合！", type: "桌游休闲" },
          { name: "校区东侧「森呼吸」音乐咖啡餐吧", desc: "拥有舒适的沙发卡座，晚上有轻音乐驻唱，菜品性价比极高。", type: "美食咖啡" },
          { name: "城市奥林匹克攀岩竞技运动中心", desc: "适合富有挑战热情的活力搭子，在这里展现你的帅气运动风采！", type: "运动健康" }
        ],
        fallback: true
      });
    }
  } catch (error: any) {
    console.error("Gemini Venue API error:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Dida UniApp Server] Running on http://0.0.0.0:${PORT}`);
});
