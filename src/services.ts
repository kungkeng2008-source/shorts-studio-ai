export type Scene = {
  title: string;
  narration: string;
  visual: string;
  overlayText: string;
  duration: number;
  imageUrl?: string;
  videoUrl?: string;
  imageCredit?: string;
  imageSourceUrl?: string;
};

export type VideoProject = {
  title: string;
  hook: string;
  description: string;
  hashtags: string[];
  pinnedComment: string;
  scenes: Scene[];
};

export type MediaAsset = {
  id: string;
  source: "Built-in";
  kind: "audio";
  title: string;
  thumbnail?: string;
  url: string;
  credit?: string;
  license?: string;
  presetId?: string;
};

const EARTH_SPIN_SCENES: Omit<Scene, "duration">[] = [
  {
    title: "The Five-Second Pause",
    narration: "Imagine Earth’s rotation stopping instantly for just five seconds. Would everything around you stop too? No. The ground might stop in this thought experiment, but motion would not simply disappear.",
    visual: "A detailed blue Earth floating in deep space, rotating slowly. A bright five-second countdown appears, then the rotation freezes while small motion lines continue around the planet.",
    overlayText: "WHAT IF EARTH STOPPED?"
  },
  {
    title: "The Speed We Never Feel",
    narration: "At the equator, Earth’s surface moves eastward at about one thousand six hundred seventy kilometres per hour. We do not notice because the atmosphere, oceans and everything around us move with the planet.",
    visual: "Isometric Earth with glowing equator, latitude lines and a clear eastward rotation arrow. Show a clean 1,670 kilometres per hour data callout.",
    overlayText: "1,670 KM/H AT THE EQUATOR"
  },
  {
    title: "Inertia Takes Over",
    narration: "If the solid Earth stopped suddenly, the air, oceans and loose objects would tend to keep moving eastward because of inertia. The difference in motion would be devastating.",
    visual: "Cutaway illustration of Earth’s surface, ocean and atmosphere. Layered arrows show the atmosphere and water continuing east while the surface is marked as paused.",
    overlayText: "INERTIA DOESN’T STOP"
  },
  {
    title: "The Atmosphere Keeps Moving",
    narration: "The atmosphere would not instantly stop with the ground. Powerful relative winds and huge ocean movement would develop. Their exact effects would depend on how such an impossible stop happened.",
    visual: "Scientific cutaway of the planet with moving air streams and ocean currents. Use directional arrows and labels; avoid inventing exact wind-speed numbers.",
    overlayText: "AIR AND OCEANS KEEP MOVING"
  },
  {
    title: "When the Spin Returns",
    narration: "After five seconds, restarting Earth’s rotation would not neatly reset everything. Moving air, water and the surface would interact in a complex chain of effects.",
    visual: "Earth’s rotation arrow lights up again. Atmospheric and ocean motion vectors overlap, followed by a restrained dramatic global view.",
    overlayText: "FIVE SECONDS LATER…"
  },
  {
    title: "The Real Takeaway",
    narration: "This is an impossible thought experiment, not a precise forecast. It reveals one simple truth: we are already moving with Earth, and inertia is why we do not feel that motion.",
    visual: "Return to a calm, beautifully lit Earth in space. Rotation lines become visible, then fade into a final question card inviting viewers to think.",
    overlayText: "WE’RE MOVING RIGHT NOW"
  }
];

const EARTH_SPIN_SCENES_VI: Omit<Scene, "duration">[] = [
  {
    title: "Khoảnh khắc Trái Đất dừng lại",
    narration: "Hãy tưởng tượng Trái Đất đột ngột ngừng quay trong đúng năm giây. Mọi thứ xung quanh có dừng lại theo không? Không. Chuyển động sẽ không tự biến mất chỉ vì mặt đất dừng lại trong giả thuyết này.",
    visual: "Trái Đất xanh chi tiết giữa không gian, quay chậm. Đồng hồ đếm ngược năm giây xuất hiện; hành tinh dừng lại nhưng các vệt chuyển động xung quanh vẫn tiếp tục.",
    overlayText: "NẾU TRÁI ĐẤT NGỪNG QUAY?"
  },
  {
    title: "Tốc độ ta không cảm nhận",
    narration: "Ở đường xích đạo, bề mặt Trái Đất di chuyển về phía đông với tốc độ khoảng một nghìn sáu trăm bảy mươi ki-lô-mét mỗi giờ. Ta không nhận ra vì khí quyển, đại dương và mọi thứ xung quanh cùng chuyển động với hành tinh.",
    visual: "Minh họa Trái Đất kiểu isometric với đường xích đạo phát sáng, các vĩ tuyến và mũi tên quay về phía đông. Hiển thị số liệu 1.670 km/h.",
    overlayText: "1.670 KM/H Ở XÍCH ĐẠO"
  },
  {
    title: "Quán tính tiếp tục tác động",
    narration: "Nếu phần rắn của Trái Đất đột ngột dừng lại, không khí, đại dương và các vật thể tự do vẫn có xu hướng tiếp tục chuyển động về phía đông do quán tính. Sự chênh lệch chuyển động này sẽ gây hậu quả khủng khiếp.",
    visual: "Minh họa cắt lớp bề mặt, đại dương và khí quyển. Các mũi tên thể hiện không khí và nước tiếp tục chuyển động về phía đông.",
    overlayText: "QUÁN TÍNH KHÔNG DỪNG LẠI"
  },
  {
    title: "Khí quyển vẫn chuyển động",
    narration: "Khí quyển sẽ không lập tức dừng lại cùng mặt đất. Gió tương đối cực mạnh và chuyển động đại dương khổng lồ có thể xuất hiện. Tác động chính xác còn phụ thuộc vào cách tình huống bất khả thi này xảy ra.",
    visual: "Minh họa khoa học cắt lớp hành tinh với luồng khí và dòng hải lưu. Không tự tạo số liệu tốc độ gió.",
    overlayText: "KHÔNG KHÍ VÀ ĐẠI DƯƠNG VẪN CHẠY"
  },
  {
    title: "Khi Trái Đất quay trở lại",
    narration: "Sau năm giây, việc khởi động lại vòng quay không thể đưa mọi thứ trở về trạng thái ban đầu một cách đơn giản. Không khí, nước và bề mặt sẽ tương tác theo một chuỗi tác động phức tạp.",
    visual: "Mũi tên quay của Trái Đất sáng trở lại. Các vector chuyển động của khí quyển và đại dương giao nhau.",
    overlayText: "SAU NĂM GIÂY…"
  },
  {
    title: "Điều thực sự đáng suy nghĩ",
    narration: "Đây là một giả thuyết bất khả thi, không phải dự báo chính xác. Nó cho thấy một điều đơn giản: chúng ta đang chuyển động cùng Trái Đất, và quán tính khiến ta không cảm nhận được điều đó.",
    visual: "Trở lại hình ảnh Trái Đất bình yên giữa không gian. Các đường chuyển động hiện lên rồi mờ dần ở khung kết.",
    overlayText: "CHÚNG TA ĐANG CHUYỂN ĐỘNG"
  }
];

function distributeDuration(totalSeconds: number, count: number): number[] {
  const total = Math.max(count * 2, totalSeconds);
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

function titleFromTopic(topic: string): string {
  const clean = topic.trim().replace(/[?!.\s]+$/, "");
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "What If Earth Stopped Spinning?";
}

function makeGenericScenes(topic: string, language: string): Omit<Scene, "duration">[] {
  const subject = titleFromTopic(topic);
  if (language === "Vietnamese") {
    return [
      { title: "Câu hỏi khiến bạn tò mò", narration: "Điều gì thực sự xảy ra khi " + subject.toLowerCase() + "? Câu trả lời có thể khác xa điều bạn đang tưởng tượng.", visual: "Mở đầu bằng hình minh họa nổi bật về chủ đề: " + subject + ". Tạo chuyển động camera tiến gần và một điểm nhấn bất ngờ.", overlayText: "ĐIỀU GÌ SẼ XẢY RA?" },
      { title: "Bắt đầu từ điều cơ bản", narration: "Trước tiên, hãy hiểu nguyên lý hoặc sự thật nền tảng đứng sau câu hỏi này.", visual: "Minh họa trực quan khái niệm chính liên quan đến " + subject + "; dùng các lớp, nhãn và mũi tên dễ hiểu.", overlayText: "ĐIỀU CƠ BẢN" },
      { title: "Chi tiết ít người để ý", narration: "Điểm đáng chú ý nằm ở chi tiết mà nhiều người thường bỏ qua. Hãy nhìn kỹ điều đang diễn ra.", visual: "Phóng to một chi tiết quan trọng của " + subject + "; làm nổi bật sự thay đổi bằng đường viền phát sáng.", overlayText: "CHI TIẾT BẤT NGỜ" },
      { title: "Điều gì xảy ra tiếp theo?", narration: "Khi các yếu tố này kết hợp với nhau, kết quả sẽ phụ thuộc vào điều kiện cụ thể.", visual: "Dùng sơ đồ từng bước để cho thấy mối liên hệ giữa các yếu tố, tránh đưa số liệu chưa được kiểm chứng.", overlayText: "KẾT QUẢ LÀ GÌ?" },
      { title: "Kiểm tra giả định", narration: "Một hình dung hấp dẫn chưa chắc đã là sự thật. Cần phân biệt điều đã được xác nhận với giả thuyết.", visual: "Hiển thị hai thẻ: sự thật đã kiểm chứng và giả thuyết cần kiểm tra.", overlayText: "SỰ THẬT HAY GIẢ THUYẾT?" },
      { title: "Kết luận", narration: "Điều quan trọng nhất cần nhớ về " + subject.toLowerCase() + " là hãy hiểu nguyên lý trước khi tin vào một kết luận gây sốc.", visual: "Kết thúc bằng một hình ảnh cô đọng về chủ đề và một câu hỏi ngắn dành cho người xem.", overlayText: "BẠN NGHĨ SAO?" }
    ];
  }
  return [
    { title: "The curiosity hook", narration: "What really happens when it comes to " + subject + "? The answer may be very different from what you imagine.", visual: "Open with a striking locally illustrated visual for: " + subject + ". Use a quick camera push-in and one surprising visual cue.", overlayText: "WHAT REALLY HAPPENS?" },
    { title: "The basic principle", narration: "First, understand the basic principle behind the question. It gives us the foundation for everything that follows.", visual: "Show a clear, labelled visual explaining the core idea behind " + subject + ".", overlayText: "START WITH THE BASICS" },
    { title: "The overlooked detail", narration: "Now look closer. One small detail changes how we understand the whole situation.", visual: "Zoom into one important detail connected to " + subject + "; highlight it with a bright outline and callout.", overlayText: "THE DETAIL YOU MISSED" },
    { title: "What happens next?", narration: "When these factors interact, the result depends on the exact conditions. Let’s separate what we know from what we are assuming.", visual: "Use a step-by-step diagram with arrows connecting the factors. Do not invent numbers or unsupported claims.", overlayText: "FOLLOW THE CONSEQUENCES" },
    { title: "Fact or assumption?", narration: "A dramatic idea is not automatically a fact. The important question is which parts are supported by evidence and which remain hypothetical.", visual: "Show two clean cards: VERIFIED FACT and HYPOTHESIS TO CHECK.", overlayText: "FACT OR HYPOTHESIS?" },
    { title: "The takeaway", narration: "That is the key idea to remember about " + subject + ". Understanding the principle matters more than believing the most dramatic version.", visual: "End on a clear hero illustration about " + subject + ", followed by a concise viewer question.", overlayText: "WHAT DO YOU THINK?" }
  ];
}

export function generateLocalProject(topic: string, style: string, language: string, duration: number): VideoProject {
  const cleanTopic = topic.trim() || "What if Earth suddenly stopped spinning for five seconds?";
  const isEarthSpin = /earth|trái đất/i.test(cleanTopic) && /(spin|rotat|quay|ngừng)/i.test(cleanTopic);
  const template = isEarthSpin
    ? (language === "Vietnamese" ? EARTH_SPIN_SCENES_VI : EARTH_SPIN_SCENES)
    : makeGenericScenes(cleanTopic, language);
  const durations = distributeDuration(duration, template.length);
  const scenes: Scene[] = template.map((scene, index) => ({ ...scene, duration: durations[index] }));
  const title = isEarthSpin
    ? (language === "Vietnamese" ? "Nếu Trái Đất ngừng quay trong 5 giây?" : "What If Earth Stopped Spinning for 5 Seconds?")
    : titleFromTopic(cleanTopic);
  const hook = scenes[0]?.narration || cleanTopic;
  const slugWords = cleanTopic.toLowerCase().match(/[a-z0-9]+/g) || ["whatif", "science"];
  const hashtags = Array.from(new Set(["#WhatIf", "#Science", ...slugWords.slice(0, 3).map(word => "#" + word)]));
  return {
    title,
    hook,
    description: "A short, locally generated explainer about " + cleanTopic + ". This is a starter script template. Check every factual claim and add reliable sources before publishing.",
    hashtags,
    pinnedComment: "What should we explore next? Leave your question below.",
    scenes
  };
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
