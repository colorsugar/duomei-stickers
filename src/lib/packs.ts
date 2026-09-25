export type Sticker = {
  id: string;
  name: string;
  motion: string;
};

export type Pack = {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  outfit: string;
  tagline: string;
  accent: "melon" | "rind" | "blush";
  updatedAt: string;
  stickers: Sticker[];
};

export const PACKS: Pack[] = [
  {
    id: "set-01",
    slug: "watermelon-daily",
    name: "西瓜日常",
    nameEn: "Watermelon Daily",
    outfit: "watermelon",
    tagline: "开心吃瓜！",
    accent: "melon",
    updatedAt: "2026-09-01",
    stickers: [
      { id: "hi", name: "美滋滋", motion: "sip in watermelon sofa" },
      { id: "happy", name: "吃瓜", motion: "sit on melon watching" },
      { id: "laugh", name: "笑死", motion: "rolling on floor laughing" },
      { id: "love", name: "贴贴", motion: "tight hug" },
      { id: "cry", name: "逆天", motion: "wrecking ball shock fall" },
      { id: "angry", name: "裂开", motion: "cracking like melon" },
      { id: "shock", name: "救命", motion: "hanging from vine" },
      { id: "sleepy", name: "不想活", motion: "melting into juice" },
      { id: "fight", name: "冲", motion: "surf watermelon charge" },
      { id: "ok", name: "绝了", motion: "exploding sparkle closeup" },
      { id: "thanks", name: "收到", motion: "pop out of melon" },
      { id: "please", name: "破防", motion: "heart cracked" },
      { id: "think", name: "尊嘛假嘛", motion: "lean in huge eyes" },
      { id: "shy", name: "摆烂", motion: "lie as salted fish" },
      { id: "night", name: "晚安", motion: "sleep inside melon" },
      { id: "bye", name: "拜拜了您", motion: "wave disappearing" },
    ],
  },
  {
    id: "set-02",
    slug: "beach",
    name: "海边多美",
    nameEn: "Beach Duomei",
    outfit: "beach",
    tagline: "夏天到海边冲浪啦！",
    accent: "rind",
    updatedAt: "2026-09-03",
    stickers: [
      { id: "surf", name: "冲呀", motion: "surf no title" },
      { id: "cool", name: "装酷", motion: "sunglasses slip" },
      { id: "sip", name: "续命", motion: "sip icy juice in chair" },
      { id: "float", name: "困了", motion: "asleep in duck ring" },
      { id: "sand", name: "烫", motion: "hop on hot sand" },
      { id: "sun", name: "好热", motion: "fan from heat" },
      { id: "shell", name: "捡到宝", motion: "find glowing shell" },
      { id: "wind", name: "发型崩了", motion: "wind wrecks bun" },
      { id: "hot", name: "中暑了", motion: "heatstroke faint" },
      { id: "splash", name: "偷袭", motion: "splash viewer" },
      { id: "photo", name: "打卡", motion: "peace selfie" },
      { id: "sea", name: "看海", motion: "sit gazing sea" },
      { id: "dance", name: "沙雕舞", motion: "silly sand dance" },
      { id: "melon", name: "冰美滋滋", motion: "hug ice melon" },
      { id: "wave-sea", name: "等等", motion: "splash panic closeup" },
      { id: "sunset", name: "绝美", motion: "sunset sparkler" },
    ],
  },
  {
    id: "set-03",
    slug: "midautumn",
    name: "中秋月圆",
    nameEn: "Mid-Autumn",
    outfit: "midautumn",
    tagline: "想你了 一个人过 月饼刺客",
    accent: "melon",
    updatedAt: "2026-09-05",
    stickers: [
      { id: "fest", name: "中秋快乐", motion: "close grin with moon" },
      { id: "missyou", name: "想你了", motion: "moon in eyes" },
      { id: "alone", name: "一个人过", motion: "solo mooncake" },
      { id: "reunion", name: "团圆", motion: "table wave large" },
      { id: "full", name: "吃撑了", motion: "belly round" },
      { id: "yum", name: "好吃", motion: "cute bite" },
      { id: "moon", name: "赏月", motion: "roof character large" },
      { id: "share", name: "分你一块", motion: "cake at camera" },
      { id: "box", name: "拆盒", motion: "unbox surprise" },
      { id: "rabbit", name: "玉兔", motion: "squeeze plush" },
      { id: "wine", name: "桂花醉", motion: "osmanthus blush" },
      { id: "nosleep", name: "月亮不睡", motion: "point moon refuse sleep" },
      { id: "round", name: "圆了", motion: "puff like moon" },
      { id: "cheers", name: "干杯", motion: "cup at camera" },
      { id: "cantgo", name: "回不去", motion: "homesick window" },
      { id: "pricey", name: "月饼刺客", motion: "price shock" },
    ],
  },
  {
    id: "set-04",
    slug: "nationalday",
    name: "国庆出游",
    nameEn: "National Day Trip",
    outfit: "nationalday",
    tagline: "放假堵车调休特种兵",
    accent: "rind",
    updatedAt: "2026-09-06",
    stickers: [
      { id: "off", name: "放假啦", motion: "jump holiday joy" },
      { id: "lol", name: "笑死", motion: "messy train laugh" },
      { id: "checkin", name: "打卡", motion: "peace selfie" },
      { id: "soldout", name: "没票了", motion: "sold out cry" },
      { id: "jam", name: "堵死了", motion: "forehead on wheel" },
      { id: "crowd", name: "人从众", motion: "only head in crowd" },
      { id: "arrive", name: "到了", motion: "collapse arrived" },
      { id: "home", name: "不去了", motion: "lie flat skip trip" },
      { id: "give", name: "给你", motion: "hand souvenir" },
      { id: "late", name: "迟到", motion: "sprint suitcase" },
      { id: "drool", name: "车上睡", motion: "drool on train" },
      { id: "miss", name: "想家", motion: "homesick window" },
      { id: "flag", name: "国庆快乐", motion: "big 五星红旗" },
      { id: "slip", name: "溜了", motion: "vanish with bag" },
      { id: "tiaoxiu", name: "调休", motion: "calendar melt" },
      { id: "bing", name: "特种兵", motion: "three bags dying sprint" },
    ],
  },
  {
    id: "set-05",
    slug: "food",
    name: "美食篇",
    nameEn: "Food",
    outfit: "watermelon",
    tagline: "饿了 请你吃 外卖到了",
    accent: "blush",
    updatedAt: "2026-09-07",
    stickers: [
      { id: "hungry", name: "饿了", motion: "drool empty bowl" },
      { id: "yum", name: "好吃", motion: "sparkle bite" },
      { id: "treat", name: "请你吃", motion: "food at camera" },
      { id: "full", name: "吃撑了", motion: "belly stuffed" },
      { id: "want", name: "想吃", motion: "stare food" },
      { id: "eat", name: "来吃饭", motion: "wave meal" },
      { id: "host", name: "我请客", motion: "thumbs treat" },
      { id: "delivery", name: "外卖到了", motion: "delivery bags" },
      { id: "spicy", name: "好辣", motion: "spicy tears" },
      { id: "more", name: "再来一份", motion: "empty demand" },
      { id: "smell", name: "好香", motion: "sniff steam" },
      { id: "diet", name: "减肥失败", motion: "caught eating" },
      { id: "night", name: "宵夜", motion: "midnight snack" },
      { id: "pricey", name: "太贵了", motion: "price shock" },
      { id: "clean", name: "光盘了", motion: "empty plate proud" },
      { id: "wait", name: "等等我", motion: "still chewing" },
    ],
  },
  {
    id: "set-06",
    slug: "game",
    name: "上号",
    nameEn: "Queue Up",
    outfit: "watermelon",
    tagline: "来啊 不来王 出来面对我",
    accent: "melon",
    updatedAt: "2026-09-08",
    stickers: [
      { id: "login", name: "上号上号", motion: "hyped login text" },
      { id: "come", name: "来啊", motion: "beckon text" },
      { id: "coming", name: "来不来", motion: "impatient phone text" },
      { id: "hmph", name: "不来王", motion: "hmph text" },
      { id: "no", name: "不来不来", motion: "wave no text" },
      { id: "nohang", name: "不约不约", motion: "X refuse text" },
      { id: "envy", name: "羡慕啊", motion: "jealous text" },
      { id: "work", name: "上班上班", motion: "commute dead text" },
      { id: "glass", name: "真的好羡慕啊", motion: "glass ashen text" },
      { id: "face", name: "出来面对我", motion: "shout bush text" },
      { id: "ow", name: "来玩ow啊", motion: "ow invite text" },
      { id: "party", name: "开黑", motion: "party invite text" },
      { id: "rank", name: "掉分了", motion: "rank down text" },
      { id: "first", name: "我先上了", motion: "headset leave text" },
      { id: "feed", name: "别送", motion: "stop palms text" },
      { id: "bye", name: "下号了", motion: "log off wave text" },
    ],
  },
  {
    id: "set-07",
    slug: "daily",
    name: "日常",
    nameEn: "Daily",
    outfit: "watermelon",
    tagline: "笑死 哈哈哈哈 尊嘛假嘛",
    accent: "blush",
    updatedAt: "2026-09-14",
    stickers: [
      { id: "lol", name: "笑死", motion: "lie back kick laugh" },
      { id: "nanbeng", name: "难绷憋笑", motion: "cover mouth shake" },
      { id: "haha", name: "哈哈哈哈", motion: "bend over belly laugh" },
      { id: "meizi", name: "美滋滋", motion: "sit rub cheeks smug" },
      { id: "six", name: "666", motion: "finger guns bounce" },
      { id: "nitian", name: "逆天啊", motion: "look up clutch head" },
      { id: "zundu", name: "尊嘛假嘛", motion: "lean poke cute" },
      { id: "drama", name: "刷短剧去了", motion: "sneak phone" },
      { id: "bye", name: "拜拜", motion: "wave bye" },
      { id: "juice", name: "美汁汁", motion: "satisfied" },
      { id: "hehe", name: "嘿嘿", motion: "sly grin" },
      { id: "speechless", name: "无语", motion: "deadpan" },
      { id: "wild", name: "离谱", motion: "shock" },
      { id: "sleepy", name: "好困", motion: "droop" },
      { id: "here", name: "来了来了", motion: "rush in" },
      { id: "yes", name: "好耶", motion: "fists up" },
      { id: "fold", name: "服了", motion: "palm forehead" },
      { id: "insane", name: "绝了", motion: "mind blown" },
      { id: "real", name: "真的假的", motion: "suspicious" },
      { id: "love", name: "爱了", motion: "heart hands" },
    ],
  },
  {
    id: "set-08",
    slug: "rage",
    name: "暴躁日常",
    nameEn: "Rage Daily",
    outfit: "watermelon",
    tagline: "打你 啪 抽你 气死了",
    accent: "melon",
    updatedAt: "2026-09-12",
    stickers: [
      { id: "punch", name: "打你", motion: "fist slam" },
      { id: "slap", name: "笨笨", motion: "slap" },
      { id: "dummy", name: "抽你", motion: "slipper" },
      { id: "kick", name: "暴打", motion: "beat blob" },
      { id: "bite", name: "崩了你", motion: "cowboy dual guns" },
      { id: "flick", name: "无语", motion: "deadpan" },
      { id: "stomp", name: "踩你", motion: "stomp" },
      { id: "throw", name: "滚", motion: "point out" },
      { id: "hammer", name: "捶你", motion: "bat tap" },
      { id: "glare", name: "服了", motion: "facepalm" },
      { id: "hmph", name: "哼", motion: "hmph" },
      { id: "tantrum", name: "气死我了", motion: "lying tantrum" },
      { id: "angry", name: "生气", motion: "angry" },
      { id: "eyeroll", name: "翻白眼", motion: "eyeroll" },
      { id: "pout", name: "不想理你", motion: "turn away" },
      { id: "flykick", name: "飞踢", motion: "flying kick pig" },
      { id: "niu", name: "牛啊", motion: "thumbs up at you" },
      { id: "bukui", name: "不愧是你", motion: "clap praise" },
    ],
  },
  {
    id: "set-18",
    slug: "sports-meet",
    name: "运动会",
    nameEn: "Sports Meet",
    outfit: "watermelon",
    tagline: "冲啊 加油 第一名",
    accent: "rind",
    updatedAt: "2026-09-26",
    stickers: [
      { id: "dash", name: "冲啊", motion: "sprint track" },
      { id: "cheer", name: "加油", motion: "cheer" },
      { id: "first", name: "第一名", motion: "long finish tape" },
      { id: "relay", name: "接力", motion: "relay baton" },
      { id: "tired", name: "累瘸了", motion: "collapse" },
      { id: "champ", name: "冠军", motion: "trophy" },
      { id: "tug", name: "拔河", motion: "tug of war" },
      { id: "rope", name: "跳绳", motion: "jump rope" },
    ],
  },
  {
    id: "set-19",
    slug: "asian-games",
    name: "亚运会",
    nameEn: "Asian Games",
    outfit: "watermelon",
    tagline: "乒乓 跳水 瞄准",
    accent: "melon",
    updatedAt: "2026-09-26",
    stickers: [
      { id: "pingpong", name: "乒乓", motion: "table tennis smash" },
      { id: "badminton", name: "杀", motion: "badminton smash" },
      { id: "dive", name: "跳水", motion: "dive takeoff" },
      { id: "swim", name: "游", motion: "swim lane" },
      { id: "gym", name: "稳", motion: "gym landing" },
      { id: "lift", name: "起", motion: "clean and jerk" },
      { id: "archery", name: "瞄准", motion: "draw bow" },
      { id: "wushu", name: "嘿", motion: "side kick" },
    ],
  },
];

export function stickerGif(packId: string, stickerId: string) {
  return `/stickers/${packId}/${stickerId}.gif?v=92`;
}

export function stickerPng(packId: string, stickerId: string) {
  return `/stickers/${packId}/${stickerId}.png?v=92`;
}

export function getPack(id: string) {
  return PACKS.find((p) => p.id === id);
}

export const READY_PACK_IDS = ["set-01", "set-02", "set-03", "set-04", "set-05", "set-06", "set-07", "set-08", "set-18", "set-19"];

export function readyPacks() {
  return PACKS.filter((p) => READY_PACK_IDS.includes(p.id));
}

export type PackSort = "updated" | "name" | "default";

export function sortPacks(packs: Pack[], sort: PackSort): Pack[] {
  const list = [...packs];
  if (sort === "updated") {
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  if (sort === "name") {
    return list.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans"));
  }
  return list;
}

export type StickerSort = "default" | "name";

export function sortStickers(stickers: Sticker[], sort: StickerSort): Sticker[] {
  if (sort === "name") {
    return [...stickers].sort((a, b) => a.name.localeCompare(b.name, "zh-Hans"));
  }
  return stickers;
}

export const STORE_SPEC = {
  size: "240×240",
  format: "GIF 循环",
  fps: "30 fps",
  duration: "约 3 秒",
  maxBytes: "400–500 KB",
  loops: "无限循环",
};
